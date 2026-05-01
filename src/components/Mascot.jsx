import React, { useEffect, useRef, useState } from "react";

/**
 * Friendly mascot with EMOTIONS.
 * - On Home: cheers and invites the player.
 * - In a game: after ~18s of inactivity, offers a tip.
 * - Reacts to game outcomes via the "mm4:mascot" event:
 *     mood: "celebrate" (level up / achievement)
 *           "happy"     (win)
 *           "sad"       (loss)
 *           "cheer"     (idle prompt)
 */

const HOME_TIPS = [
  "Hey! Pick a game and let's play! 🎮",
  "Try Word Scramble — fun for the brain! 📖",
  "Streaks earn bonus XP! Play daily! 🔥",
  "New here? Memory Match is a great start! 🧠",
  "Tap 📊 Progress to see your achievements!",
  "Math Sprint warms up the brain in 60 seconds! ⚡",
];

const GAME_HINTS = {
  connect4: [
    "Tip: control the center column!",
    "Watch for diagonal threats — they're sneaky!",
    "Block your opponent's 3-in-a-row right away.",
  ],
  reversi: [
    "Tip: corners are the strongest spots!",
    "Don't grab too many discs early — flexibility wins.",
    "Try to limit opponent's moves.",
  ],
  battleship: [
    "Tip: hunt in a checkerboard pattern!",
    "After a hit, try all 4 neighbours.",
    "Bigger ships are easier to find — start with them.",
  ],
  gomoku: [
    "Tip: build double threats — two open 3s!",
    "Block open 3-in-a-rows immediately.",
    "Center moves give the most directions.",
  ],
  twenty48: [
    "Tip: keep your biggest tile in one corner.",
    "Avoid swiping up — keep that corner safe!",
    "Build tiles in descending order along an edge.",
  ],
  memory: [
    "Tip: scan the board before flipping!",
    "Remember positions of cards you've seen.",
    "Work corner-to-corner for a mental map.",
  ],
  simon: [
    "Tip: say the colors out loud as they flash!",
    "Tap the rhythm with your finger — chunk it!",
    "Take a breath between rounds.",
  ],
  math: [
    "Tip: streaks multiply your score — stay accurate!",
    "Estimate first if you're unsure.",
    "Don't guess — you lose your streak!",
  ],
  word: [
    "Tip: look for common endings (-ing, -ed, -er).",
    "Spot vowels first, then group consonants.",
    "Stuck? Skip it — it only costs 5 seconds.",
  ],
  stroop: [
    "Tip: ignore the WORD, focus on the COLOR!",
    "Use number keys 1–4 for speed.",
    "Slow down for one second to break the pattern.",
  ],
};

const MOOD_EMOJI = {
  idle: "🕺",
  cheer: "🕺",
  happy: "🤩",
  celebrate: "🥳",
  sad: "😢",
};

const CELEBRATE_LINES = [
  "Woohoo! Amazing! 🎉",
  "You crushed it! 🏆",
  "Brain power overload! ⚡",
  "Legend! Keep it going! 🌟",
];
const HAPPY_LINES = [
  "Yes! Nice win! 🙌",
  "Brilliant move! 💪",
  "You're on fire! 🔥",
  "Great job! One more?",
];
const SAD_LINES = [
  "Aww, so close. Try again! 💪",
  "Don't give up — one more round!",
  "Every loss = practice. You got this!",
  "Shake it off — rematch?",
  "Almost had it! Try again!",
];

function pick(arr, lastIdx) {
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && i === lastIdx) i = (i + 1) % arr.length;
  return [arr[i], i];
}

export default function Mascot({ context = "home", gameId = null }) {
  const [hidden, setHidden] = useState(
    () => sessionStorage.getItem("mm4_mascot_hidden") === "1"
  );
  const [bubble, setBubble] = useState(null);
  const [mood, setMood] = useState("idle");
  const [tipIdx, setTipIdx] = useState(0);
  const lastLineIdx = useRef(-1);
  const idleTimer = useRef(null);
  const hideBubbleTimer = useRef(null);
  const moodTimer = useRef(null);

  /* ── Listen for game-outcome events ── */
  useEffect(() => {
    if (hidden) return;
    function onMascot(e) {
      const d = e.detail || {};
      const m = d.mood || "cheer";
      let text;
      if (m === "celebrate") {
        const [t, i] = pick(CELEBRATE_LINES, lastLineIdx.current);
        lastLineIdx.current = i;
        text = d.leveledUp ? "Level up! Wooo! ⭐" : t;
      } else if (m === "happy") {
        const [t, i] = pick(HAPPY_LINES, lastLineIdx.current);
        lastLineIdx.current = i;
        text = t;
      } else if (m === "sad") {
        const [t, i] = pick(SAD_LINES, lastLineIdx.current);
        lastLineIdx.current = i;
        text = t;
      } else {
        text = "Nice game!";
      }
      setMood(m);
      setBubble(text);
      if (hideBubbleTimer.current) clearTimeout(hideBubbleTimer.current);
      hideBubbleTimer.current = setTimeout(() => setBubble(null), 5500);
      if (moodTimer.current) clearTimeout(moodTimer.current);
      const moodMs = m === "celebrate" ? 6000 : m === "sad" ? 5000 : 4500;
      moodTimer.current = setTimeout(() => setMood("idle"), moodMs);
    }
    window.addEventListener("mm4:mascot", onMascot);
    return () => window.removeEventListener("mm4:mascot", onMascot);
  }, [hidden]);

  /* Greet shortly after appearing on home */
  useEffect(() => {
    if (hidden) return;
    if (context === "home") {
      const t = setTimeout(() => speak(), 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, context]);

  /* In-game idle hint */
  useEffect(() => {
    if (hidden || context !== "game") return;
    const reset = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => speak(), 18000);
    };
    const events = ["click", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [hidden, context, gameId]);

  function speak() {
    const pool =
      context === "game" && gameId && GAME_HINTS[gameId]
        ? GAME_HINTS[gameId]
        : HOME_TIPS;
    const next = pool[tipIdx % pool.length];
    setTipIdx((i) => i + 1);
    setBubble(next);
    setMood("cheer");
    if (hideBubbleTimer.current) clearTimeout(hideBubbleTimer.current);
    hideBubbleTimer.current = setTimeout(() => setBubble(null), 7000);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood("idle"), 3500);
  }

  function dismiss(e) {
    e.stopPropagation();
    setHidden(true);
    sessionStorage.setItem("mm4_mascot_hidden", "1");
  }

  if (hidden) return null;

  return (
    <div className={`mascot mascot-${context} mascot-mood-${mood}`} aria-live="polite">
      {bubble && (
        <div className={`mascot-bubble mascot-bubble-${mood}`} role="status">
          {bubble}
          <span className="mascot-bubble-tail" aria-hidden="true" />
        </div>
      )}
      <button
        type="button"
        className="mascot-body"
        onClick={speak}
        aria-label="Talk to your guide"
        title="Tap me!"
      >
        <span className="mascot-emoji" aria-hidden="true">{MOOD_EMOJI[mood] || MOOD_EMOJI.idle}</span>
        {mood === "celebrate" && (
          <span className="mascot-confetti" aria-hidden="true">
            <span>🎉</span><span>✨</span><span>⭐</span><span>🎊</span>
          </span>
        )}
        {mood === "sad" && <span className="mascot-tear" aria-hidden="true">💧</span>}
        <span className="mascot-shadow" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="mascot-close"
        onClick={dismiss}
        aria-label="Hide guide"
        title="Hide for now"
      >
        ✕
      </button>
    </div>
  );
}
