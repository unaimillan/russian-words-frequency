import { useState, useMemo, useRef, useCallback, useEffect, memo } from 'react';
import * as pako from 'pako';
import { Search, X, Regex } from 'lucide-react';
import wordDataUrl from './assets/wikipedia_russian_word_frequencies.txt.gz?url'; // returns a string URL

// Constants for virtualization
const ITEM_HEIGHT = 40;
const BUFFER_SIZE = 5;


let wordDataCache: WordEntry[] = [ { word: 'Загрузка страницы, пожалуйста подождите!', count: 1 } ];


export async function loadData() {
  if ( wordDataCache.length > 1 ) { return wordDataCache; }
  // Dynamically import the compressed asset
  // const module = await import('./assets/wikipedia_russian_word_frequencies.txt.gz?arraybuffer');
  // const compressed = module.default; // ArrayBuffer
  // const uint8Array = new Uint8Array(compressed);
  // const decompressed = pako.inflate(uint8Array, { toText: true });

  const response = await fetch(wordDataUrl);
  const buffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const decompressed = pako.inflate(uint8Array, { toText: true });

  // console.log('Decompressed data length:', decompressed.length, decompressed.slice(0, 2000));
  // return [{ word: 'example', count: 1234 }]; // Placeholder for testing

  const lines = decompressed.split('\n').filter(line => line.trim() !== '');
  const result = lines.map(line => {
    // Adjust parsing to your format – here we assume "string,number"
    const [str, num] = line.split(',');
    return { word: str, count: parseFloat(num) };
  });

  wordDataCache = result;
  return result;
}


export interface WordEntry {
  word: string;
  count: number;
}


// Memoized list item for performance
const WordListItem = memo(({ word, count }: { word: string; count: number }) => (
  <div
    className="flex justify-between items-center px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
    style={{ height: ITEM_HEIGHT }}
  >
    <span className="text-gray-700 font-medium truncate">{word}</span>
    <span className="text-gray-500 tabular-nums text-sm">{count.toLocaleString()}</span>
  </div>
));

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function App() {
  // Search state
  const [searchText, setSearchText] = useState('');
  const [isRegexMode, setIsRegexMode] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  // const [wordData, setWordData] = useState<WordEntry[]>([]);

  // const minCount = Math.min(...wordData.map(w => w.count), 0);
  // const maxCount = Math.max(...wordData.map(w => w.count), 1000);
  // const totalWords = wordData.length;
  
  const [isWordDataLoading, setIsWordDataLoading] = useState(true);
  const minCount = wordDataCache?.reduce((min, w) => Math.min(min, w.count), 0) || 0;
  const maxCount = wordDataCache?.reduce((max, w) => Math.max(max, w.count), 1000) || 1000;
  const totalWords = wordDataCache?.length || 0;

  // Range filter state
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(1000);

  // Limit state
  const [limit, setLimit] = useState<number | 'all'>(100);
  const limitOptions: (number | 'all')[] = [10, 20, 50, 100, 1000, 'all'];

  // Virtual scroll state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search for performance
  const debouncedSearch = useDebounce(searchText, 300);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (scrollContainerRef.current) {
        setContainerHeight(scrollContainerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    loadData()
      .then(result => {
        setRangeMin(result.reduce((min, w) => Math.min(min, w.count), 0));
        setRangeMax(result.reduce((max, w) => Math.max(max, w.count), 1000));
        setIsWordDataLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  // Filter the word data
  const filteredWords = useMemo(() => {
    let result = wordDataCache || [];

    // Filter by count range
    result = result.filter(w => w.count >= rangeMin && w.count <= rangeMax);

    // Filter by search text
    if (debouncedSearch) {
      if (isRegexMode) {
        try {
          const regex = new RegExp(debouncedSearch, 'i');
          result = result.filter(w => regex.test(w.word));
          setRegexError(null);
        } catch {
          setRegexError('Invalid regex pattern');
        }
      } else {
        const search = debouncedSearch.toLowerCase();
        result = result.filter(w => w.word.toLowerCase().includes(search));
        setRegexError(null);
      }
    } else {
      setRegexError(null);
    }

    return result;
  }, [debouncedSearch, isRegexMode, rangeMin, rangeMax, isWordDataLoading]);

  // Apply limit to filtered results
  const limitedWords = useMemo(() => {
    if (limit === 'all') return filteredWords;
    return filteredWords.slice(0, limit);
  }, [filteredWords, limit]);

  // Virtual scroll calculations
  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + BUFFER_SIZE * 2;

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);

  const endIndex = Math.min(limitedWords.length, startIndex + visibleCount);

  const visibleItems = limitedWords.slice(startIndex, endIndex);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Handle range input changes with validation
  const handleMinChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setRangeMin(Math.max(minCount, Math.min(num, rangeMax)));
    }
  }, [rangeMax]);

  const handleMaxChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setRangeMax(Math.min(maxCount, Math.max(num, rangeMin)));
    }
  }, [rangeMin]);

  const handleMinSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num <= rangeMax) {
      setRangeMin(num);
    }
  }, [rangeMax]);

  const handleMaxSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= rangeMin) {
      setRangeMax(num);
    }
  }, [rangeMin]);

  const clearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto my-4 bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Word List - Main area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Stats bar */}
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
            <span>
              Showing {limitedWords.length.toLocaleString()} of {filteredWords.length.toLocaleString()} filtered ({totalWords.toLocaleString()} total)
            </span>
            <span className="text-gray-400">Sorted by count</span>
          </div>

          {/* Virtualized list container */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto"
            onScroll={handleScroll}
          >
            <div
              style={{
                height: limitedWords.length * ITEM_HEIGHT,
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: startIndex * ITEM_HEIGHT,
                  left: 0,
                  right: 0
                }}
              >
                {visibleItems.map((item, idx) => (
                  <WordListItem
                    key={startIndex + idx}
                    word={item.word}
                    count={item.count}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Bottom Controls - Search and Range Slider */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
        {/* Limit selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Show</label>
          <div className="flex gap-1">
            {limitOptions.map((opt) => (
              <button
                key={opt.toString()}
                onClick={() => setLimit(opt)}
                className={`px-3 py-1 text-sm rounded border transition-all ${
                  limit === opt
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {opt === 'all' ? 'All' : opt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Count Range</label>
          <div className="flex items-center gap-4">
            {/* Min input and slider */}
            <div className="flex-1 flex items-center gap-2">
              <input
                type="number"
                value={rangeMin}
                onChange={(e) => handleMinChange(e.target.value)}
                className="w-24 px-2 py-1 text-sm border border-gray-200 rounded bg-white tabular-nums"
              />
              <input
                type="range"
                min={minCount}
                max={maxCount}
                value={rangeMin}
                onChange={handleMinSlider}
                className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600"
              />
            </div>

            {/* Max slider and input */}
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={minCount}
                max={maxCount}
                value={rangeMax}
                onChange={handleMaxSlider}
                className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600"
              />
              <input
                type="number"
                value={rangeMax}
                onChange={(e) => handleMaxChange(e.target.value)}
                className="w-24 px-2 py-1 text-sm border border-gray-200 rounded bg-white tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={isRegexMode ? "Search with regex pattern..." : "Search words..."}
              className={`w-full pl-10 pr-10 py-3 border rounded-lg bg-white ${
                regexError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-gray-200'
              } focus:outline-none focus:ring-2 transition-all`}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            {searchText && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Regex Mode Toggle */}
          <button
            onClick={() => setIsRegexMode(!isRegexMode)}
            className={`px-3 py-3 rounded-lg border flex items-center gap-2 transition-all ${
              isRegexMode
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            title="Toggle regex search mode"
          >
            <Regex className="w-4 h-4" />
            <span className="text-sm font-medium">{isRegexMode ? 'Regex' : 'Text'}</span>
          </button>
        </div>

        {/* Regex Error */}
        {regexError && (
          <p className="text-red-500 text-sm">{regexError}</p>
        )}
      </div>
      </div>
    </div>
  );
}
