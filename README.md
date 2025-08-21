# MindMatch4

## Project Overview
MindMatch4 is a React + Vite remake of the classic Connect Four. Drop your discs into a 7×6 grid and be the first to link four in a row. The game ships with an adaptive AI engine and multiple ways to play.

### AI Engine
A time‑boxed negamax search with heuristic evaluation and Monte‑Carlo rollouts powers the computer opponent, balancing speed with tactical strength.

### Game Modes
- **Play vs AI** – challenge the built‑in AI at varying difficulty levels.
- **Local Multiplayer** – two players share the same device.
- **Daily Puzzle** – a curated mid‑game challenge that refreshes every day.

## Project Structure

The repository is organized into a few key directories:

- `ai/` – negamax search engine and supporting utilities.
- `src/` – React components, hooks, and styles for the UI.
- `tests/` – unit tests for the AI and supporting logic.

## Local Development
Install dependencies and launch the dev server:

```bash
npm install
npm run dev
```

## Build & Deploy
Create an optimized production build:

```bash
npm run build
```

The generated `dist/` folder can be hosted on any static service such as GitHub Pages or Netlify.

## Contributing

1. Fork and clone the repository.
2. Create a branch for your feature or fix.
3. Run `npm test` to ensure all tests pass.
4. Submit a pull request for review.

We welcome bug reports and feature ideas via GitHub issues.
