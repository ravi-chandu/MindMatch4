import React from "react";

export default function HazardBadge() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", zIndex: 3, pointerEvents: "none" }}
    >
      <path d="M12 2 1 21h22L12 2z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
      <rect x="11" y="8" width="2" height="7" rx="1" fill="#111827" />
      <rect x="11" y="17" width="2" height="2" rx="1" fill="#111827" />
    </svg>
  );
}

