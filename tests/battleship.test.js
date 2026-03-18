import {
  createEmptyGrid,
  createShipRegistry,
  canPlaceShip,
  placeShip,
  randomPlacement,
  shoot,
  allShipsSunk,
  SHIPS,
  WATER,
  SHIP,
  HIT,
  MISS,
  SUNK,
  BS_SIZE,
  pickAIShot,
} from "../src/utils/battleshipHelpers.js";

test("empty grid is 10x10 and all water", () => {
  const grid = createEmptyGrid();
  expect(grid).toHaveLength(BS_SIZE);
  grid.forEach((row) => {
    expect(row).toHaveLength(BS_SIZE);
    row.forEach((cell) => expect(cell).toBe(WATER));
  });
});

test("canPlaceShip respects boundaries", () => {
  const grid = createEmptyGrid();
  expect(canPlaceShip(grid, 5, 0, 0, true)).toBe(true);
  expect(canPlaceShip(grid, 5, 0, 6, true)).toBe(false); // overflows right
  expect(canPlaceShip(grid, 5, 6, 0, false)).toBe(false); // overflows bottom
  expect(canPlaceShip(grid, 5, 5, 0, false)).toBe(true);
});

test("placeShip places ship and returns updated grid", () => {
  const grid = createEmptyGrid();
  const registry = createShipRegistry();
  const result = placeShip(grid, registry, 0, 0, 0, true); // Carrier at (0,0) horizontal

  expect(result).not.toBeNull();
  for (let c = 0; c < 5; c++) {
    expect(result.grid[0][c]).toBe(SHIP);
  }
  expect(result.registry[0].cells).toHaveLength(5);
});

test("placeShip rejects overlap", () => {
  const grid = createEmptyGrid();
  const registry = createShipRegistry();
  const first = placeShip(grid, registry, 0, 0, 0, true);
  const second = placeShip(first.grid, first.registry, 1, 0, 0, false); // overlaps at (0,0)

  expect(second).toBeNull();
});

test("randomPlacement places all five ships", () => {
  const { grid, registry } = randomPlacement();

  const shipCells = grid.flat().filter((c) => c === SHIP).length;
  const totalSize = SHIPS.reduce((sum, s) => sum + s.size, 0);
  expect(shipCells).toBe(totalSize);
  registry.forEach((s) => expect(s.cells.length).toBe(s.size));
});

test("shoot registers hit and miss correctly", () => {
  const grid = createEmptyGrid();
  const registry = createShipRegistry();
  const { grid: placed, registry: reg } = placeShip(grid, registry, 4, 0, 0, true); // Destroyer (size 2) at (0,0)-(0,1)
  const attack = createEmptyGrid();

  // Hit
  const hitResult = shoot(attack, placed, reg, 0, 0);
  expect(hitResult.hit).toBe(true);
  expect(hitResult.attackGrid[0][0]).toBe(HIT);

  // Miss
  const missResult = shoot(attack, placed, reg, 5, 5);
  expect(missResult.hit).toBe(false);
  expect(missResult.attackGrid[5][5]).toBe(MISS);
});

test("sinking a ship marks cells as SUNK", () => {
  const grid = createEmptyGrid();
  const registry = createShipRegistry();
  const { grid: placed, registry: reg } = placeShip(grid, registry, 4, 0, 0, true); // Destroyer size 2

  let attack = createEmptyGrid();
  const r1 = shoot(attack, placed, reg, 0, 0);
  expect(r1.sunk).toBe(false);

  const r2 = shoot(r1.attackGrid, r1.defenderGrid, r1.defenderRegistry, 0, 1);
  expect(r2.sunk).toBe(true);
  expect(r2.sunkShipName).toBe("Destroyer");
  expect(r2.attackGrid[0][0]).toBe(SUNK);
  expect(r2.attackGrid[0][1]).toBe(SUNK);
});

test("duplicate shot returns null", () => {
  const grid = createEmptyGrid();
  const registry = createShipRegistry();
  const attack = createEmptyGrid();

  const r1 = shoot(attack, grid, registry, 3, 3);
  const r2 = shoot(r1.attackGrid, grid, registry, 3, 3);
  expect(r2).toBeNull();
});

test("AI picks a valid cell for all difficulty levels", () => {
  const attack = createEmptyGrid();
  const registry = createShipRegistry();

  for (const diff of ["Easy", "Medium", "Hard", "Expert"]) {
    const shot = pickAIShot(attack, registry, diff);
    expect(shot).not.toBeNull();
    expect(shot.row).toBeGreaterThanOrEqual(0);
    expect(shot.row).toBeLessThan(BS_SIZE);
    expect(shot.col).toBeGreaterThanOrEqual(0);
    expect(shot.col).toBeLessThan(BS_SIZE);
  }
});
