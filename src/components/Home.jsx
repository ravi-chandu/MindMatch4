import React from "react";

export default function Home({ onPlayAI, onPlay2P, onDaily }) {
  return (
    <div className="card" style={{ margin: "0 auto", maxWidth: 520 }}>
      <h2 style={{ margin: "0 0 10px", textAlign: "center" }}>Welcome</h2>
      <p className="tiny" style={{ textAlign: "center", margin: "0 0 10px" }}>
        Connect <b>four</b> discs in a row. Tap a column to drop your disc. Use
        <b> Hint</b> when stuck.
      </p>
      <div className="big-options">
        <button className="big-btn ai" onClick={onPlayAI}>Play vs AI</button>
        <button className="big-btn p2" onClick={onPlay2P}>Local Multiplayer</button>
        <button className="big-btn daily" onClick={onDaily}>Daily Puzzle</button>
      </div>
      <ul className="tiny" style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
        <li>Yellow = You, Red = AI</li>
        <li>AI adapts to your play. Winning increases its search depth.</li>
        <li>Daily gives a fresh curated mid‑game each day.</li>
      </ul>
    </div>
  );
}
