import * as Engine from "../../ai/engine.js";

export const ROWS = 6;
export const COLS = 7;

export const emptyBoard = () => Array.from({ length: COLS }, () => []);
export const clampCol = (c) => Math.max(0, Math.min(COLS - 1, c));
export const canPlay = (b, c) => (b[c]?.length || 0) < ROWS;
export const clone = (b) => b.map((col) => col.slice());
export const play = (b, c, p) => {
  const nb = clone(b);
  nb[c] = (nb[c] || []).concat(p);
  return nb;
};
export const totalPieces = (b) => b.reduce((s, col) => s + (col?.length || 0), 0);

/* ---------- Threat count (for hints) ---------- */
export function nearWinScore(board, player = 1) {
  const at = (r, c) =>
    r < 0 || r >= ROWS || c < 0 || c >= COLS
      ? -99
      : board[c][ROWS - 1 - r] ?? 0;
  let score = 0;
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      for (const [dc, dr] of dirs) {
        let me = 0,
          opp = 0,
          empty = 0;
        for (let k = 0; k < 4; k++) {
          const v = at(r + dr * k, c + dc * k);
          if (v === player) me++;
          else if (v === -player) opp++;
          else empty++;
        }
        if (opp === 0 && me === 3 && empty === 1) score++;
      }
    }
  return score;
}

/* ---------- Endgame chatter ---------- */
export function engageMessage(outcome, { ms = 0, near = 0 } = {}) {
  const quick = ms < 45000,
    long = ms > 180000;
  const close = near >= 1,
    veryClose = near >= 2;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const AI = [
    close
      ? "So close! I squeezed a line. Rematch? 😉"
      : "Gotcha 😏 — try again?",
    veryClose
      ? "You nearly had me there. One different drop and it's yours."
      : "Watch diagonals. Hint helps in tight spots.",
    long
      ? "Epic grind! I found the last thread. Another round?"
      : "Bet you can’t beat me twice.",
  ];
  const YOU = [
    veryClose ? "Brilliant clutch! 🎉" : "Nice finish! 🔥",
    quick ? "Speedrun vibes. Again?" : "That patience paid off. One more?",
    "I’m dialing the difficulty up a notch…",
  ];
  const DRAW = [
    "Stalemate… rematch?",
    close
      ? "Both had threats brewing. Let’s settle this."
      : "Even match! One more?",
  ];
  if (outcome === "ai_win") return pick(AI);
  if (outcome === "player_win") return pick(YOU);
  return pick(DRAW);
}

/* ---------- Confetti ---------- */
export function fireConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = (canvas.width = innerWidth),
    H = (canvas.height = innerHeight);
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.33,
    s: 4 + Math.random() * 6,
    v: 2 + Math.random() * 4,
    a: Math.random() * Math.PI,
  }));
  let t = 0;
  const id = setInterval(() => {
    ctx.clearRect(0, 0, W, H);
    parts.forEach((p) => {
      p.y += p.v;
      p.x += Math.sin(t + p.a) * 1.5;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((t + p.a) * 0.2);
      ctx.fillStyle = [
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
        "#a855f7",
      ][p.s | 0 % 5];
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    });
    t += 0.03;
  }, 16);
  setTimeout(() => {
    clearInterval(id);
    ctx.clearRect(0, 0, W, H);
  }, 1800);
}

/* ---------- Share ---------- */
export function shareText(board, outcome) {
  const map = { "-1": "🔴", "1": "🟡", "0": "⚫" };
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) {
      const v = board[c][ROWS - 1 - r] ?? 0;
      line += map[String(v)];
    }
    rows.push(line);
  }
  const head = `MindMatch 4 — ${
    outcome === "player_win" ? "I won" : "They won"
  }\n`;
  return `${head}${rows.join("\n")}\nhttps://ravi-chandu.github.io/MindMatch4/`;
}

/* ---------- Hints with reasons ---------- */
export const CENTER_PREF = [3, 4, 5, 6, 5, 4, 3];

export function reasonFor(board, player, col) {
  if (!canPlay(board, col)) return null;
  const opp = -player;
  const nb = play(board, col, player);
  if (Engine.winner(nb) === player)
    return { col, tag: "win", note: "Winning move" };
  if (Engine.winner(play(board, col, opp)) === opp)
    return { col, tag: "block", note: "Block opponent" };
  const ourThreats = nearWinScore(nb, player);
  if (ourThreats >= 2) return { col, tag: "fork", note: "Creates multiple threats" };
  if (col === 3) return { col, tag: "center", note: "Controls center" };
  return { col, tag: "heuristic", note: "Good shape" };
}

export function computeLocalHints(board, player = 1) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (canPlay(board, c)) legal.push(c);
  if (!legal.length) return { best: [], note: "No moves" };
  for (const c of legal) {
    if (Engine.winner(play(board, c, player)) === player)
      return { best: [c], note: "Winning move", reasons: [reasonFor(board, player, c)] };
  }
  const opp = -player,
    blocks = [];
  for (const c of legal) {
    if (Engine.winner(play(board, c, opp)) === opp) blocks.push(c);
  }
  if (blocks.length)
    return {
      best: blocks,
      note: "Block opponent",
      reasons: blocks.map((c) => reasonFor(board, player, c)),
    };
  const scored = [];
  for (const c of legal) {
    const nb = play(board, c, player);
    let suicide = false;
    for (let oc = 0; oc < COLS; oc++) {
      if (!canPlay(nb, oc)) continue;
      if (Engine.winner(play(nb, oc, opp)) === opp) {
        suicide = true;
        break;
      }
    }
    if (suicide) {
      scored.push({
        c,
        score: -1e9,
        reason: { col: c, tag: "danger", note: "Gives immediate reply" },
      });
      continue;
    }
    const our = nearWinScore(nb, player);
    const their = nearWinScore(nb, opp);
    const score = CENTER_PREF[c] + 3 * our - 2 * their;
    scored.push({ c, score, reason: reasonFor(board, player, c) });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > -1e8).slice(0, 3);
  return {
    best: top.map((s) => s.c),
    note: "Best by heuristic",
    reasons: top.map((s) => s.reason),
  };
}

/* ---------- Lightweight MCTS ---------- */
export function randomHeuristicMove(b, p) {
  const cand = [];
  for (let c = 0; c < COLS; c++) if (canPlay(b, c)) cand.push(c);
  if (!cand.length) return -1;
  const weights = cand.map((c) => CENTER_PREF[c]);
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < cand.length; i++) {
    r -= weights[i];
    if (r <= 0) return cand[i];
  }
  return cand[0];
}

export function playoutWinner(board, startP) {
  let b = clone(board),
    p = startP,
    w = Engine.winner(b);
  let safety = 72;
  while (w === 0 && safety--) {
    const c = randomHeuristicMove(b, p);
    if (c < 0) break;
    b = play(b, c, p);
    w = Engine.winner(b);
    p = -p;
  }
  return w;
}

export function mctsPick(board, player, iters = 200) {
  const moves = [];
  for (let c = 0; c < COLS; c++) if (canPlay(board, c)) moves.push(c);
  if (!moves.length) return { col: -1, note: "No moves" };
  for (const c of moves) {
    if (Engine.winner(play(board, c, player)) === player)
      return { col: c, note: "Winning move" };
  }
  const opp = -player;
  for (const c of moves) {
    if (Engine.winner(play(board, c, opp)) === opp)
      return { col: c, note: "Block opponent" };
  }
  const scores = new Map(moves.map((c) => [c, CENTER_PREF[c] * 0.2]));
  for (let i = 0; i < iters; i++) {
    const c = moves[i % moves.length];
    const w = playoutWinner(play(board, c, player), -player);
    if (w === player) scores.set(c, scores.get(c) + 1);
    else if (w === 2) scores.set(c, scores.get(c) + 0.3);
    else if (w === -player) scores.set(c, scores.get(c) - 0.7);
  }
  const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { col: best, note: "Monte‑Carlo rollout" };
}
