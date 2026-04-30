import React, { useEffect, useState } from "react";

/**
 * Toast that appears when a new achievement unlocks or level-up happens.
 * Listens to a global 'mm4:toast' event with detail { kind, title, body, emoji }.
 */
export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const t = { id: Math.random().toString(36).slice(2), ...e.detail };
      setToasts(arr => [...arr, t]);
      setTimeout(() => {
        setToasts(arr => arr.filter(x => x.id !== t.id));
      }, 4200);
    };
    addEventListener("mm4:toast", handler);
    return () => removeEventListener("mm4:toast", handler);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind || "info"}`}>
          <span className="toast-emoji">{t.emoji || "🎉"}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.body && <div className="toast-text">{t.body}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function fireToast(detail) {
  dispatchEvent(new CustomEvent("mm4:toast", { detail }));
}
