# russian-word-frequency

Simple webapp to display the mention frequency of the russian words

## Installation

### Dataset generation

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
cd research && uv sync
```

### Static frontend generation

```bash
npm install
npm run build
```

### Registering uv's jupyter kernel in system jupyter

```bash
uv add --dev ipykernel
uv run ipython kernel install --user --env VIRTUAL_ENV $(pwd)/.venv --name=uv-kernel
```

Verify that the kernel was successfully registered:
```bash
jupyter kernelspec list
```

## Quality of life features

### Installation of git pre-commit hooks to clean out the Jupyter notebook outputs

Install dependencies with
```bash
uv tool install pre-commit
uv tool installnbstripout
```

and run the `pre-commit install` after cloning the repository to install the hook
