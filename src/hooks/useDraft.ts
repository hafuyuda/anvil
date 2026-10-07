import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../stores/projectStore";
import { registerFlusher } from "../lib/saveRegistry";
import { useAppSettings } from "./useAppSettings";

interface HasId {
  id: string;
}

interface Options<T> {
  autoSave?: boolean;
  autoSaveDelay?: number;
  undoLabel?: string;
  onDraftChange?: (draft: T) => void;
}

export function useDraft<T extends HasId>(
  source: T,
  save: (v: T) => Promise<void | boolean> | void | boolean,
  options?: Options<T>,
) {
  const [draft, setDraft] = useState<T>(source);
  const [dirty, setDirty] = useState(false);

  const appSettings = useAppSettings();
  const autoSave = options?.autoSave ?? true;
  const delay = options?.autoSaveDelay ?? appSettings.autoSaveDelayMs;
  const label = options?.undoLabel ?? "编辑";
  const onDraftChange = options?.onDraftChange;

  const saveRef = useRef(save);
  saveRef.current = save;

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  const draftRef = useRef<T>(draft);
  draftRef.current = draft;

  const baselineRef = useRef<T>(source);

  const pushUndo = useProjectStore((s) => s.pushUndo);
  const incPendingSaves = useProjectStore((s) => s.incPendingSaves);
  const decPendingSaves = useProjectStore((s) => s.decPendingSaves);

  // 切换 source（不同 id）时重置
  if (draft.id !== source.id) {
    setDraft(source);
    setDirty(false);
    baselineRef.current = source;
    draftRef.current = source;
  }

  // ── 关键：draft 变化后，在 effect 里通知 onDraftChange ──
  const lastNotifiedRef = useRef<T | null>(null);
  useEffect(() => {
    if (lastNotifiedRef.current === draft) return;
    const changed =
      lastNotifiedRef.current === null ||
      JSON.stringify(lastNotifiedRef.current) !== JSON.stringify(draft);
    lastNotifiedRef.current = draft;
    if (changed) {
      onDraftChangeRef.current?.(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function update(patch: Partial<T>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  function set(next: T) {
    setDraft(next);
    setDirty(true);
  }

  async function doSave(value: T) {
    incPendingSaves();
    try {
      return await saveRef.current(value);
    } finally {
      decPendingSaves();
    }
  }

  async function flush(): Promise<void> {
    if (!dirty) return;
    const before = baselineRef.current;
    const after = draftRef.current;
    if (JSON.stringify(before) === JSON.stringify(after)) {
      setDirty(false);
      return;
    }
    const result = await doSave(after);
    if (result !== false) {
      pushUndo({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label,
        undo: async () => {
          baselineRef.current = before;
          setDraft(before);
          await saveRef.current(before);
        },
        redo: async () => {
          baselineRef.current = after;
          setDraft(after);
          await saveRef.current(after);
        },
      });
      baselineRef.current = after;
      setDirty(false);
    }
  }

  function reset() {
    setDraft(source);
    setDirty(false);
    baselineRef.current = source;
  }

  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    return registerFlusher(() => flushRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty || !autoSave) return;
    const handle = setTimeout(() => {
      void flush();
    }, delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, draft, autoSave, delay]);

  return {
    draft,
    dirty,
    update,
    set,
    commit: flush,
    reset,
    flush,
  };
}
