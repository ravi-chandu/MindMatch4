# MindMatch4

MindMatch is a browser-based strategy game hub built with React and Vite. The app currently includes:

- Connect Four
- Reversi
- Battleship

The experience is optimized for quick sessions, polished visuals, and adaptive AI gameplay.

## Live Site

- Production URL: https://ravi-chandu.github.io/MindMatch4/

## Features

- Multiple game modes across titles: AI, local multiplayer, and challenge-style play.
- Difficulty controls with persistent preferences via local storage.
- Reusable game engine utilities and helpers under `ai/` and `src/utils/`.
- Progressive Web App metadata for installable, app-like behavior.
- Unit tests for core logic and AI behavior.

## Tech Stack

- React 18
- Vite 5
- Jest 29
- ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open the local URL reported by Vite (typically `http://localhost:5173`).

## Scripts

- `npm run dev` - start the local development server.
- `npm run build` - create a production build in `dist/`.
- `npm run preview` - preview the production build locally.
- `npm run test` - run Jest tests.
- `npm run test:ci` - run Jest in CI-friendly serial mode.
- `npm run lint` - run ESLint.
- `npm run lint:fix` - run ESLint and apply auto-fixes.
- `npm run format` - format the codebase with Prettier.

## Project Structure

```text
ai/            AI search, evaluation, and gameplay plugins
src/           React app code, components, and styles
src/utils/     Game-specific helper logic
tests/         Unit tests for game logic and AI behavior
public/        Static assets and PWA metadata
```

## Deployment

The repository is configured for GitHub Pages-style hosting under `/MindMatch4/`.

```bash
npm run build
```

Deploy the generated `dist/` folder to your static host.

## Quality Expectations

- Keep gameplay logic deterministic and testable.
- Prefer small, focused components and utilities.
- Run linting and tests before opening pull requests.

## Contributing

1. Create a feature branch.
2. Implement your change with tests where applicable.
3. Run `npm run lint` and `npm run test`.
4. Open a pull request with a clear summary.
