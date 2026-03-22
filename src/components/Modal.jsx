import React from "react";

export default function ResultModal({ end, mode, talk, onRematch, onShare, onAIFirst, onBack }) {
  if (!end) return null;
  const isWin = (mode === "ai" && end === "player_win") || (mode !== "ai" && end === "player_win");
  const emoji = end === "player_win" ? "🏆✨" : end === "ai_win" ? "💫" : "⚔️";
  const title =
    mode === "ai"
      ? end === "player_win" ? "VICTORY!" : end === "ai_win" ? "DEFEATED..." : "STALEMATE!"
      : end === "player_win" ? "P1 WINS!" : end === "ai_win" ? "P2 WINS!" : "STALEMATE!";

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className={`dialog ${isWin ? "dialog-win" : ""}`}>
        <div className="dialog-emoji">{emoji}</div>
        <h2 className="dialog-title">{title}</h2>
        {talk && <p className="dialog-talk">{talk}</p>}
        <div className="actions">
          <button className="btn-primary" onClick={onRematch}>▶ Play Again</button>
          {mode === "ai" && onAIFirst && (
            <button onClick={onAIFirst}>🔄 AI First</button>
          )}
          <button onClick={onShare}>📤 Share</button>
          <button onClick={onBack}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
}
