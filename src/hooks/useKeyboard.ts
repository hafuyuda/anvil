import { useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { flushAll } from "../lib/saveRegistry";

const MODULES = ["world", "story", "board", "session", "types"] as const;

export function useKeyboard() {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl+Z 撤销
      if (mod && !e.shiftKey && key === "z") {
        e.preventDefault();
        void undo();
        return;
      }

      // Ctrl+Shift+Z / Ctrl+Y 重做
      if ((mod && e.shiftKey && key === "z") || (mod && key === "y")) {
        e.preventDefault();
        void redo();
        return;
      }

      // Ctrl+S 立刻保存所有
      if (mod && key === "s") {
        e.preventDefault();
        void flushAll();
        return;
      }

      // Ctrl+1..5 切模块
      if (mod && key >= "1" && key <= "5") {
        e.preventDefault();
        const idx = Number(key) - 1;
        const m = MODULES[idx];
        if (m) setActiveModule(m);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, setActiveModule]);
}