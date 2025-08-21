import React from "react";

export default function ResultModal({ end, mode, talk, onRematch, onShare, onAIFirst, onBack }) {
  if (!end) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="dialog">
        <h2>
          {mode === "ai"
            ? end === "player_win"
              ? "🎉 You win!"
              : end === "ai_win"
              ? "🤖 AI wins"
              : "🤝 Draw"
            : end === "player_win"
            ? "🟡 P1 wins!"
            : end === "ai_win"
            ? "🔴 P2 wins!"
            : "🤝 Draw"}
        </h2>
        <p style={{ opacity: 0.9 }}>{talk}</p>
        <div className="actions">
          <button onClick={onRematch}>Play again</button>
          <button onClick={onShare}>Share</button>
          {mode === "ai" && onAIFirst && (
            <button onClick={onAIFirst}>AI first move</button>
          )}
          <button onClick={onBack}>Home</button>
        </div>
      </div>
    </div>
  );
}
