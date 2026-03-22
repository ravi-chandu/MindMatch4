import React, { useEffect, useState } from "react";
import { SND } from "../utils/gameHelpers.js";

export default function WinBanner({ outcome, onFinished }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Play dramatic banner sound
    SND.banner?.();
    
    // Auto-dismiss after 1.8 seconds
    const t = setTimeout(() => {
      setVisible(false);
      onFinished?.();
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  let text = "STALEMATE";
  let color = "var(--muted)";
  
  if (outcome === "player_win" || outcome === "win") {
    text = "VICTORY";
    color = "var(--gold)";
  } else if (outcome === "ai_win" || outcome === "lose") {
    text = "DEFEATED";
    color = "var(--pink)";
  } else if (outcome === "p1_win") {
    text = "P1 WINS";
    color = "var(--pink)"; // Player 1 is red/pink
  } else if (outcome === "p2_win") {
    text = "P2 WINS";
    color = "var(--gold)"; // Player 2 is yellow
  }

  return (
    <div className="win-banner-overlay">
      <div className="win-banner-slash">
        <div className="win-banner-text" style={{ color }}>{text}</div>
      </div>
    </div>
  );
}
