# MindMatch4

## Project Overview
MindMatch4 is a React + Vite remake of the classic Connect Four. Drop your discs into a 7×6 grid and be the first to link four in a row. The game ships with an adaptive AI engine and multiple ways to play.

### AI Engine
A time‑boxed negamax search with heuristic evaluation and Monte‑Carlo rollouts powers the computer opponent, balancing speed with tactical strength.

### Game Modes
- **Play vs AI** – challenge the built‑in AI at varying difficulty levels.
- **Local Multiplayer** – two players share the same device.
- **Daily Puzzle** – a curated mid‑game challenge that refreshes every day.

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
