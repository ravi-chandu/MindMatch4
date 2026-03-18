import React, { useEffect, useRef, useState } from "react";

/**
 * Countdown timer component for all MindMatch games.
 *
 * Props:
 *   seconds   – total countdown seconds (changes reset the timer)
 *   paused    – freezes the countdown
 *   onTimeUp  – called once when the timer reaches 0
 */
export default function GameTimer({ seconds, paused = false, onTimeUp }) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  /* Reset when the parent changes the total (new game) */
  useEffect(() => {
    setRemaining(seconds);
    firedRef.current = false;
  }, [seconds]);

  /* Tick every second while running */
  useEffect(() => {
    if (paused || remaining <= 0) return;

    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [paused, remaining > 0]);

  /* Fire callback when reaching zero */
  useEffect(() => {
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      onTimeUp?.();
    }
  }, [remaining, onTimeUp]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = seconds > 0 ? remaining / seconds : 1;
  const isLow = pct <= 0.25;
  const isCritical = pct <= 0.1;

  return (
    <span
      className={`game-timer ${isLow ? "timer-low" : ""} ${
        isCritical ? "timer-critical" : ""
      }`}
      aria-label={`${mins} minutes ${secs} seconds remaining`}
    >
      ⏱ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}
