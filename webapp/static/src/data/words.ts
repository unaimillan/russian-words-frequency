// constants/dataConstants.js
import compressedData from '../assets/wikipedia_russian_word_frequencies.txt.gz?arraybuffer';
import pako from 'pako';

const uint8Array = new Uint8Array(compressedData);
const decompressed = pako.inflate(uint8Array, { to: 'string' });

const lines = decompressed.split('\n').filter(line => line.trim() !== '');
const result = lines.map(line => {
  // Adjust parsing to your format – here we assume "string,number"
  const [str, num] = line.split(',');
  return { word: str, count: parseFloat(num) };
});

export interface WordEntry {
  word: string;
  count: number;
}

export const wordData: WordEntry[] = [{word: 'a', count: 100}, {word: 'b', count: 50}, {word: 'c', count: 75}].sort((a, b) => b.count - a.count);
// export const wordData: WordEntry[] = result.sort((a, b) => b.count - a.count);

export const minCount = Math.min(...wordData.map(w => w.count));
export const maxCount = Math.max(...wordData.map(w => w.count));
export const totalWords = wordData.length;
