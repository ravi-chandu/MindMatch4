import { aiMove } from "../../ai/coach.js";

self.addEventListener("message", (e) => {
  const board = e.data?.board ?? e.data;
  const col = aiMove(board);
  self.postMessage({ col });
});
