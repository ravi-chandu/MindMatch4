import * as Engine from "../../ai/engine.js";

/* ---------- Sounds (WebAudio, no assets) ---------- */
export class Beep {
  constructor() { this.ctx = null; this.enabled = true; }
  _ctx() { return this.ctx ?? (this.ctx = new (window.AudioContext || window.webkitAudioContext)()); }
  toggle(on) { this.enabled = on; }
  play({ freq = 440, dur = 0.08, type = "sine", gain = 0.06, attack = 0.005, decay = 0.03 }) {
    if (!this.enabled) return;
    const ctx = this._ctx(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = 0; o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay + dur);
    o.start(t); o.stop(t + attack + decay + dur + 0.02);
  }
  /* Create filtered noise burst for water/explosion textures */
  _noise({ dur = 0.3, gain = 0.04, freq = 800, Q = 1, filterType = "lowpass" } = {}) {
    if (!this.enabled) return;
    const ctx = this._ctx(), len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = filterType; filt.frequency.value = freq; filt.Q.value = Q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t); src.stop(t + dur + 0.05);
  }
  click() { this.play({ freq: 520, dur: 0.05, type: "square" }); }
  drop()  { this.play({ freq: 240, dur: 0.10, type: "sawtooth" }); }
  win()   { this.play({ freq: 880, dur: 0.12, type: "triangle", gain: 0.08 }); setTimeout(() => this.play({ freq: 1108.7, dur: 0.12, type: "triangle", gain: 0.08 }), 120); }
  lose()  { this.play({ freq: 220, dur: 0.12, type: "sine", gain: 0.08 }); setTimeout(() => this.play({ freq: 174.6, dur: 0.12, type: "sine", gain: 0.08 }), 120); }
  draw()  { this.play({ freq: 400, dur: 0.08, type: "sine" }); setTimeout(() => this.play({ freq: 430, dur: 0.08 }), 80); }
  hint()  { this.play({ freq: 700, dur: 0.06, type: "square" }); }
  /* ── Battleship enhanced sounds ── */
  splash() {
    // Layered water splash: low thud + filtered noise swoosh + bubble pops
    this.play({ freq: 120, dur: 0.25, type: "sine", gain: 0.06, attack: 0.005, decay: 0.18 });
    this._noise({ dur: 0.35, gain: 0.05, freq: 600, Q: 0.6, filterType: "lowpass" });
    setTimeout(() => this.play({ freq: 350, dur: 0.06, type: "sine", gain: 0.02 }), 120);
    setTimeout(() => this.play({ freq: 500, dur: 0.04, type: "sine", gain: 0.015 }), 180);
    setTimeout(() => this.play({ freq: 280, dur: 0.05, type: "sine", gain: 0.015 }), 250);
  }
  explode() {
    // Multi-layer explosion: deep boom + crackle noise + metallic ring + debris scatter
    this.play({ freq: 55, dur: 0.35, type: "sawtooth", gain: 0.12, attack: 0.002, decay: 0.25 });
    this._noise({ dur: 0.4, gain: 0.08, freq: 1200, Q: 0.4, filterType: "lowpass" });
    setTimeout(() => {
      this.play({ freq: 80, dur: 0.18, type: "square", gain: 0.06 });
      this._noise({ dur: 0.25, gain: 0.04, freq: 2500, Q: 1, filterType: "bandpass" });
    }, 40);
    setTimeout(() => this.play({ freq: 1800, dur: 0.08, type: "sine", gain: 0.03 }), 80);
    setTimeout(() => this._noise({ dur: 0.15, gain: 0.02, freq: 3000, Q: 0.5 }), 200);
  }
  sinkShip() {
    // Dramatic sinking: alarm tone + hull creak + deep bubbles + underwater fade
    this.play({ freq: 520, dur: 0.12, type: "square", gain: 0.07 });
    setTimeout(() => this.play({ freq: 480, dur: 0.12, type: "square", gain: 0.06 }), 130);
    setTimeout(() => {
      this.play({ freq: 200, dur: 0.25, type: "sawtooth", gain: 0.05, attack: 0.01, decay: 0.2 });
      this._noise({ dur: 0.3, gain: 0.03, freq: 400, Q: 2, filterType: "bandpass" });
    }, 280);
    setTimeout(() => this.play({ freq: 120, dur: 0.3, type: "sine", gain: 0.04, attack: 0.05, decay: 0.2 }), 480);
    setTimeout(() => this.play({ freq: 80, dur: 0.4, type: "sine", gain: 0.03, attack: 0.05, decay: 0.3 }), 650);
    setTimeout(() => this._noise({ dur: 0.2, gain: 0.015, freq: 300, Q: 0.6 }), 750);
  }
  /* Sonar ping for turn changes and tension */
  sonar() {
    this.play({ freq: 1320, dur: 0.15, type: "sine", gain: 0.05, attack: 0.005, decay: 0.12 });
    setTimeout(() => this.play({ freq: 1320, dur: 0.25, type: "sine", gain: 0.025, attack: 0.01, decay: 0.2 }), 200);
  }
  /* Warning alarm for low ships or critical timer */
  alarm() {
    this.play({ freq: 660, dur: 0.08, type: "square", gain: 0.05 });
    setTimeout(() => this.play({ freq: 550, dur: 0.08, type: "square", gain: 0.05 }), 120);
    setTimeout(() => this.play({ freq: 660, dur: 0.08, type: "square", gain: 0.04 }), 240);
  }
  /* Cannon fire sound before missile lands */
  cannon() {
    this._noise({ dur: 0.12, gain: 0.07, freq: 800, Q: 0.3, filterType: "lowpass" });
    this.play({ freq: 90, dur: 0.15, type: "sawtooth", gain: 0.08, attack: 0.002, decay: 0.1 });
  }
  tick() { this.play({ freq: 900, dur: 0.03, type: "square", gain: 0.03 }); }

  /* ── UI enhancements ── */
  hover() { this.play({ freq: 1100, dur: 0.02, type: "sine", gain: 0.015 }); }
  select() { 
    this.play({ freq: 880, dur: 0.04, type: "square", gain: 0.04 }); 
    setTimeout(() => this.play({ freq: 1760, dur: 0.06, type: "sine", gain: 0.04 }), 50); 
  }
  flip() { 
    this._noise({ dur: 0.1, gain: 0.03, freq: 1800, Q: 0.8, filterType: "highpass" });
    this.play({ freq: 320, dur: 0.08, type: "triangle", gain: 0.04, attack: 0.01, decay: 0.05 }); 
  }
  banner() {
    this.play({ freq: 220, dur: 0.6, type: "sawtooth", gain: 0.08, attack: 0.02, decay: 0.4 });
    setTimeout(() => this.play({ freq: 330, dur: 0.5, type: "sawtooth", gain: 0.08, attack: 0.02, decay: 0.4 }), 80);
    setTimeout(() => this.play({ freq: 440, dur: 0.4, type: "square", gain: 0.08, attack: 0.02, decay: 0.3 }), 160);
    setTimeout(() => {
      this.play({ freq: 880, dur: 0.8, type: "sine", gain: 0.06, attack: 0.05, decay: 0.6 });
      this._noise({ dur: 0.4, gain: 0.05, freq: 2000, Q: 0.5 });
    }, 240);
  }
}
export const SND = new Beep();

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
      ][(p.s | 0) % 5];
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
