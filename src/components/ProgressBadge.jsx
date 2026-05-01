import React, { useEffect, useState } from "react";
import { getProgress, levelFromXp } from "../utils/progress.js";

export default function ProgressBadge({ onOpen }) {
  const [p, setP] = useState(() => getProgress());

  useEffect(() => {
    const refresh = () => setP(getProgress());
    addEventListener("storage", refresh);
    addEventListener("mm4:progress", refresh);
    const i = setInterval(refresh, 2500);
    return () => {
      removeEventListener("storage", refresh);
      removeEventListener("mm4:progress", refresh);
      clearInterval(i);
    };
  }, []);

  const lvl = levelFromXp(p.xp);
  return (
    <button className="progress-badge" onClick={onOpen} title="View progress & achievements">
      <span className="pb-streak">🔥 {p.streak}</span>
      <span className="pb-level">Lv {lvl.level}</span>
      <span className="pb-xpbar"><span className="pb-xpfill" style={{ width: `${lvl.pct * 100}%` }} /></span>
    </button>
  );
}
