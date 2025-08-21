import React, { useEffect, useRef } from "react";

export default function Modal({ children, onClose }) {
  const dialogRef = useRef(null);
  const lastFocused = useRef(null);

  useEffect(() => {
    // Save the previously focused element
    lastFocused.current = document.activeElement;
    const node = dialogRef.current;
    if (!node) return;

    // Focus the first focusable element inside the dialog
    const focusable = node.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first && first.focus();

    function handleKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose && onClose();
      } else if (e.key === "Tab") {
        if (focusable.length === 0) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    node.addEventListener("keydown", handleKey);
    return () => {
      node.removeEventListener("keydown", handleKey);
      // Restore focus when modal unmounts
      if (lastFocused.current && typeof lastFocused.current.focus === "function") {
        lastFocused.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="dialog" ref={dialogRef}>
        {children}
      </div>
    </div>
  );
}
