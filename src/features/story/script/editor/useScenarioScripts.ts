import { useCallback, useEffect, useRef, useState } from "react";
import { ipc } from "../../../../core/ipc";
import { runWithError } from "../../../../lib/runWithError";

/**
 * 剧本文件的装载 / 保存 / 脏追踪。
 *
 * 从 ScriptEditor 里抽出来 —— 那是个三栏编辑器，混着这套状态机的时候
 * 没人分得清哪行是业务哪行是 JSX。
 *
 * 两条约束：
 * - **当前文件自动保存**（防抖，按行数调延迟）；其余脏文件在切换 /
 *   增删文件前由 `flushAll` 立即落盘。
 * - **空内容 = 删除文件**：`save_script` 的契约。所以创建文件必须带
 *   初始 knot，否则写进去的瞬间文件就没了。
 */
export function useScenarioScripts(scenarioId: string) {
  const [files, setFiles] = useState<string[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [dirtyFiles, setDirtyFiles] = useState<Record<string, true>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const lastSavedRef = useRef<Record<string, string>>({});
  const contentsRef = useRef(contents);
  contentsRef.current = contents;
  const dirtyRef = useRef(dirtyFiles);
  dirtyRef.current = dirtyFiles;

  const reloadAll = useCallback(
    async (prefer?: string) => {
      const list = await ipc
        .listScenarioScriptFiles(scenarioId)
        .catch(() => [] as string[]);
      const entries = await Promise.all(
        list.map(
          async (f) =>
            [
              f,
              await ipc.loadScenarioScript(scenarioId, f).catch(() => ""),
            ] as const,
        ),
      );
      const map: Record<string, string> = {};
      for (const [f, c] of entries) map[f] = c ?? "";
      lastSavedRef.current = map;
      setFiles(list);
      setContents(map);
      setDirtyFiles({});
      setCurrentFile((cur) => {
        if (prefer && list.includes(prefer)) return prefer;
        if (cur && list.includes(cur)) return cur;
        return list[0] ?? null;
      });
      setLoaded(true);
    },
    [scenarioId],
  );

  useEffect(() => {
    setLoaded(false);
    reloadAll();
  }, [reloadAll]);

  // ── 自动保存（当前文件，防抖）───────────────────────
  const dirty = currentFile != null && currentFile in dirtyFiles;

  useEffect(() => {
    if (!loaded || !currentFile || !(currentFile in dirtyFiles)) return;
    const file = currentFile;
    const c = contents[file] ?? "";
    const lineCount = c.split("\n").length;
    const delay = lineCount > 500 ? 1500 : 800;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await ipc.saveScenarioScript(scenarioId, file, c);
        lastSavedRef.current[file] = c;
        setDirtyFiles((d) => {
          if (!(file in d)) return d;
          const n = { ...d };
          delete n[file];
          return n;
        });
      } catch {
        // 保留 dirty，下次重试
      } finally {
        setSaving(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [contents, dirtyFiles, currentFile, loaded, scenarioId]);

  // ── 脏文件立即落盘（切换 / 增删文件前调用）─────────
  const flushAll = useCallback(async () => {
    const ops: Promise<unknown>[] = [];
    for (const f of Object.keys(dirtyRef.current)) {
      const c = contentsRef.current[f];
      if (c === undefined) continue;
      ops.push(
        ipc
          .saveScenarioScript(scenarioId, f, c)
          .then(() => {
            lastSavedRef.current[f] = c;
          })
          .catch(() => {}),
      );
    }
    await Promise.all(ops);
    setDirtyFiles({});
  }, [scenarioId]);

  const handleChange = useCallback(
    (c: string) => {
      if (!currentFile) return;
      const file = currentFile;
      setContents((prev) => ({ ...prev, [file]: c }));
      setDirtyFiles((d) => (d[file] ? d : { ...d, [file]: true }));
    },
    [currentFile],
  );

  const switchFile = useCallback(
    async (next: string) => {
      if (next === currentFile) return;
      await flushAll();
      setCurrentFile(next);
    },
    [currentFile, flushAll],
  );

  // ── 文件管理 ────────────────────────────────────────
  const createFile = useCallback(
    async (filename: string) => {
      await flushAll();
      // save_script 语义：空内容 = 删除文件，因此创建时必须带初始 knot
      const r = await runWithError(
        () => ipc.saveScenarioScript(scenarioId, filename, "=== 开场\n"),
        "创建失败",
      );
      if (!r.ok) return false;
      await reloadAll(filename);
      return true;
    },
    [scenarioId, flushAll, reloadAll],
  );

  const deleteFile = useCallback(
    async (filename: string) => {
      const r = await runWithError(
        () => ipc.deleteScenarioScript(scenarioId, filename),
        "删除失败",
      );
      if (!r.ok) return false;
      const next = files.find((f) => f !== filename);
      await reloadAll(next);
      return true;
    },
    [scenarioId, files, reloadAll],
  );

  return {
    files,
    contents,
    dirtyFiles,
    loaded,
    saving,
    currentFile,
    dirty,
    reloadAll,
    flushAll,
    handleChange,
    switchFile,
    createFile,
    deleteFile,
    content: currentFile ? (contents[currentFile] ?? "") : "",
  };
}
