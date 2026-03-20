/* ── Battleship game logic ── */

export const BS_SIZE = 10;
export const WATER = 0;
export const SHIP = 1;
export const HIT = 2;
export const MISS = 3;
export const SUNK = 4;

export const SHIPS = [
  { id: "carrier", name: "Carrier", size: 5, emoji: "🚢" },
  { id: "battleship", name: "Battleship", size: 4, emoji: "⛴️" },
  { id: "cruiser", name: "Cruiser", size: 3, emoji: "🛳️" },
  { id: "submarine", name: "Submarine", size: 3, emoji: "🤿" },
  { id: "destroyer", name: "Destroyer", size: 2, emoji: "🚤" },
];

/* ── Grid helpers ── */

export function createEmptyGrid() {
  return Array.from({ length: BS_SIZE }, () => Array(BS_SIZE).fill(WATER));
}

export function createShipRegistry() {
  return SHIPS.map((s) => ({ ...s, cells: [], hits: 0, sunk: false }));
}

export function cloneGrid(g) {
  return g.map((r) => r.slice());
}

export function cellLabel(row, col) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

/* ── Ship placement ── */

export function canPlaceShip(grid, size, row, col, horizontal) {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r < 0 || r >= BS_SIZE || c < 0 || c >= BS_SIZE) return false;
    if (grid[r][c] !== WATER) return false;
  }
  return true;
}

export function placeShip(grid, registry, shipIndex, row, col, horizontal) {
  const ship = registry[shipIndex];
  if (!canPlaceShip(grid, ship.size, row, col, horizontal)) return null;

  const newGrid = cloneGrid(grid);
  const cells = [];
  for (let i = 0; i < ship.size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    newGrid[r][c] = SHIP;
    cells.push({ row: r, col: c });
  }

  const newRegistry = registry.map((s, i) =>
    i === shipIndex ? { ...s, cells: [...cells] } : { ...s, cells: [...s.cells] }
  );
  return { grid: newGrid, registry: newRegistry };
}

export function randomPlacement() {
  let grid = createEmptyGrid();
  let registry = createShipRegistry();

  for (let si = 0; si < SHIPS.length; si++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * BS_SIZE);
      const col = Math.floor(Math.random() * BS_SIZE);
      const result = placeShip(grid, registry, si, row, col, horizontal);
      if (result) {
        grid = result.grid;
        registry = result.registry;
        placed = true;
      }
      attempts++;
    }
  }
  return { grid, registry };
}

/* ── Ghost preview cells for setup ── */

export function getGhostCells(grid, shipSize, row, col, horizontal) {
  const cells = [];
  for (let i = 0; i < shipSize; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    cells.push({ row: r, col: c });
  }
  const valid = canPlaceShip(grid, shipSize, row, col, horizontal);
  return { cells, valid };
}

/* ── Shooting ── */

export function shoot(attackGrid, defenderGrid, defenderRegistry, row, col) {
  if (row < 0 || row >= BS_SIZE || col < 0 || col >= BS_SIZE) return null;
  if (attackGrid[row][col] !== WATER) return null;

  const newAttack = cloneGrid(attackGrid);
  const newDefender = cloneGrid(defenderGrid);

  if (defenderGrid[row][col] === SHIP) {
    newAttack[row][col] = HIT;
    newDefender[row][col] = HIT;

    let sunkShip = null;
    const newRegistry = defenderRegistry.map((ship) => {
      const isHitCell = ship.cells.some((c) => c.row === row && c.col === col);
      if (!isHitCell) return { ...ship, cells: [...ship.cells] };

      const newHits = ship.hits + 1;
      const nowSunk = newHits >= ship.size;

      if (nowSunk) {
        ship.cells.forEach((c) => {
          newAttack[c.row][c.col] = SUNK;
          newDefender[c.row][c.col] = SUNK;
        });
        sunkShip = ship.name;
      }
      return { ...ship, cells: [...ship.cells], hits: newHits, sunk: nowSunk };
    });

    return {
      hit: true,
      sunk: !!sunkShip,
      sunkShipName: sunkShip,
      attackGrid: newAttack,
      defenderGrid: newDefender,
      defenderRegistry: newRegistry,
      gameOver: newRegistry.every((s) => s.sunk),
    };
  }

  newAttack[row][col] = MISS;
  return {
    hit: false,
    sunk: false,
    sunkShipName: null,
    attackGrid: newAttack,
    defenderGrid: newDefender,
    defenderRegistry: [...defenderRegistry.map((s) => ({ ...s, cells: [...s.cells] }))],
    gameOver: false,
  };
}

export function allShipsSunk(registry) {
  return registry.every((s) => s.sunk);
}

export function shipsRemaining(registry) {
  return registry.filter((s) => !s.sunk).length;
}

/* ── AI shooting strategies ── */

function getAvailableCells(grid) {
  const cells = [];
  for (let r = 0; r < BS_SIZE; r++)
    for (let c = 0; c < BS_SIZE; c++)
      if (grid[r][c] === WATER) cells.push({ row: r, col: c });
  return cells;
}

function getUnsunkHits(grid) {
  const hits = [];
  for (let r = 0; r < BS_SIZE; r++)
    for (let c = 0; c < BS_SIZE; c++)
      if (grid[r][c] === HIT) hits.push({ row: r, col: c });
  return hits;
}

function adjacentTargets(grid, row, col) {
  return [
    [0, 1], [0, -1], [1, 0], [-1, 0],
  ]
    .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
    .filter(
      ({ row: r, col: c }) =>
        r >= 0 && r < BS_SIZE && c >= 0 && c < BS_SIZE && grid[r][c] === WATER
    );
}

/* Easy: pure random */
export function aiShootEasy(attackGrid) {
  const avail = getAvailableCells(attackGrid);
  return avail.length ? avail[Math.floor(Math.random() * avail.length)] : null;
}

/* Medium: hunt-and-target with checkerboard hunt */
export function aiShootMedium(attackGrid) {
  const unsunk = getUnsunkHits(attackGrid);
  if (unsunk.length) {
    const targets = unsunk.flatMap((h) => adjacentTargets(attackGrid, h.row, h.col));
    if (targets.length) return targets[Math.floor(Math.random() * targets.length)];
  }
  const avail = getAvailableCells(attackGrid).filter(
    ({ row, col }) => (row + col) % 2 === 0
  );
  if (avail.length) return avail[Math.floor(Math.random() * avail.length)];
  return aiShootEasy(attackGrid);
}

/* Hard: line-aware targeting + probability bias */
export function aiShootHard(attackGrid, defenderRegistry) {
  const unsunk = getUnsunkHits(attackGrid);

  if (unsunk.length >= 2) {
    const sorted = [...unsunk].sort((a, b) => a.row - b.row || a.col - b.col);
    const isHoriz = sorted[0].row === sorted[1].row;

    if (isHoriz) {
      const row = sorted[0].row;
      const cols = sorted.filter((h) => h.row === row).map((h) => h.col).sort((a, b) => a - b);
      const maxC = cols[cols.length - 1] + 1;
      const minC = cols[0] - 1;
      if (maxC < BS_SIZE && attackGrid[row][maxC] === WATER) return { row, col: maxC };
      if (minC >= 0 && attackGrid[row][minC] === WATER) return { row, col: minC };
    } else {
      const col = sorted[0].col;
      const rows = sorted.filter((h) => h.col === col).map((h) => h.row).sort((a, b) => a - b);
      const maxR = rows[rows.length - 1] + 1;
      const minR = rows[0] - 1;
      if (maxR < BS_SIZE && attackGrid[maxR][col] === WATER) return { row: maxR, col };
      if (minR >= 0 && attackGrid[minR][col] === WATER) return { row: minR, col };
    }
  }

  if (unsunk.length === 1) {
    const targets = adjacentTargets(attackGrid, unsunk[0].row, unsunk[0].col);
    if (targets.length) return targets[Math.floor(Math.random() * targets.length)];
  }

  return aiShootWithHeatmap(attackGrid, defenderRegistry);
}

/* Expert: always uses full probability heatmap */
export function aiShootExpert(attackGrid, defenderRegistry) {
  const unsunk = getUnsunkHits(attackGrid);
  if (unsunk.length) {
    const shot = aiShootHard(attackGrid, defenderRegistry);
    if (shot) return shot;
  }
  return aiShootWithHeatmap(attackGrid, defenderRegistry);
}

function aiShootWithHeatmap(attackGrid, defenderRegistry) {
  const heat = Array.from({ length: BS_SIZE }, () => Array(BS_SIZE).fill(0));
  const remaining = defenderRegistry.filter((s) => !s.sunk);

  for (const ship of remaining) {
    for (let r = 0; r < BS_SIZE; r++) {
      for (let c = 0; c < BS_SIZE; c++) {
        // horizontal
        if (c + ship.size <= BS_SIZE) {
          let valid = true;
          for (let i = 0; i < ship.size; i++) {
            const v = attackGrid[r][c + i];
            if (v === MISS || v === SUNK) { valid = false; break; }
          }
          if (valid) for (let i = 0; i < ship.size; i++) heat[r][c + i]++;
        }
        // vertical
        if (r + ship.size <= BS_SIZE) {
          let valid = true;
          for (let i = 0; i < ship.size; i++) {
            const v = attackGrid[r + i][c];
            if (v === MISS || v === SUNK) { valid = false; break; }
          }
          if (valid) for (let i = 0; i < ship.size; i++) heat[r + i][c]++;
        }
      }
    }
  }

  let best = null;
  for (let r = 0; r < BS_SIZE; r++) {
    for (let c = 0; c < BS_SIZE; c++) {
      if (attackGrid[r][c] !== WATER) continue;
      if (!best || heat[r][c] > heat[best.row][best.col]) best = { row: r, col: c };
    }
  }
  return best || aiShootEasy(attackGrid);
}

/* Return a copy of the grid with untouched SHIP cells hidden as WATER.
   Only HIT, MISS and SUNK remain visible. Used for 2P fleet display. */
export function maskedGrid(grid) {
  return grid.map((row) =>
    row.map((cell) => (cell === SHIP ? WATER : cell))
  );
}

/* Merge defender grid (shows ships + damage) with opponent attack grid (shows misses).
   Returns a combined view for end-of-game reveal. */
export function revealGrid(defenderGrid, attackGrid) {
  return defenderGrid.map((row, r) =>
    row.map((cell, c) => {
      if (cell === WATER && attackGrid[r][c] === MISS) return MISS;
      return cell;
    })
  );
}

export function pickAIShot(attackGrid, defenderRegistry, difficulty) {
  switch (difficulty) {
    case "Easy": return aiShootEasy(attackGrid);
    case "Medium": return aiShootMedium(attackGrid);
    case "Hard": return aiShootHard(attackGrid, defenderRegistry);
    case "Expert": return aiShootExpert(attackGrid, defenderRegistry);
    default: return aiShootMedium(attackGrid);
  }
}
