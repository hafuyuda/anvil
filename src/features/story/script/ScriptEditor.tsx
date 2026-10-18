import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ipc, type Scenario, type ScriptHit } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { parseScript } from "./parser";
import type { ParsedScript } from "./types";
import { ScriptSourceEditor } from "./source/ScriptSourceEditor";
import { ScriptStructuredEditor } from "./structured/ScriptStructuredEditor";
import { toast } from "../../../lib/toast";
import { runWithError } from "../../../lib/runWithError";
import { nowMs } from "../../../lib/time";
import { Modal } from "../../../components/ui/Modal";
import { confirmDialog } from "../../../lib/confirm";

interface Props {
  scenarioId: string;
  /** 入口 knot（用于检查器显示） */
  entryKnot: string | null;
}

type Mode = "structured" | "source";

/** 源码行（0-based）→ 结构行索引（跳过 frontmatter 与空行）。 */
function sourceLineToPc(content: string, sourceLine: number): number {
  const lines = content.split(/\r?\n/);
  let pc = 0;
  let inFm = false;
  for (let i = 0; i < sourceLine && i < lines.length; i++) {
    const t = lines[i].trim();
    if (inFm) {
      if (t === "---") inFm = false;
      continue;
    }
    if (i === 0 && t === "---") {
      inFm = true;
      continue;
    }
    if (t !== "") pc++;
  }
  return pc;
}

/** 结构行索引 → 源码行（0-based）。 */
function pcToSourceLine(content: string, pc: number): number {
  const lines = content.split(/\r?\n/);
  let count = 0;
  let inFm = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (inFm) {
      if (t === "---") inFm = false;
      continue;
    }
    if (i === 0 && t === "---") {
      inFm = true;
      continue;
    }
    if (t === "") continue;
    if (count === pc) return i;
    count++;
  }
  return Math.max(0, lines.length - 1);
}

export function ScriptEditor({ scenarioId, entryKnot }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [dirtyFiles, setDirtyFiles] = useState<Record<string, true>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("structured");
  const [cursorLine, setCursorLine] = useState<number | null>(null);
  const [pending, setPending] = useState<{
    pc?: number;
    sourceLine?: number;
    nonce: number;
  } | null>(null);

  const lastSavedRef = useRef<Record<string, string>>({});
  const contentsRef = useRef(contents);
  contentsRef.current = contents;
  const dirtyRef = useRef(dirtyFiles);
  dirtyRef.current = dirtyFiles;
  const nonceRef = useRef(0);

  const scenarios = useProjectStore((s) => s.scenarios) ?? [];
  const upsertScenario = useProjectStore((s) => s.upsertScenario);

  // ── 加载 / 重载全部文件 ──────────────────────────────
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
  async function flushAll() {
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
  }

  function handleChange(c: string) {
    if (!currentFile) return;
    const file = currentFile;
    setContents((prev) => ({ ...prev, [file]: c }));
    setDirtyFiles((d) => (d[file] ? d : { ...d, [file]: true }));
  }

  async function switchFile(next: string) {
    if (next === currentFile) return;
    await flushAll();
    setCurrentFile(next);
    setCursorLine(null);
  }

  // ── 文件管理 ────────────────────────────────────────
  async function handleCreateFile(filename: string) {
    await flushAll();
    // save_script 语义：空内容 = 删除文件，因此创建时必须带初始 knot
    const r = await runWithError(
      () => ipc.saveScenarioScript(scenarioId, filename, "=== 开场\n"),
      "创建失败",
    );
    if (!r.ok) return;
    await reloadAll(filename);
  }

  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  function handleAddFile() {
    setNewFileName(`part${files.length + 1}.md`);
    setNewFileOpen(true);
  }

  async function confirmNewFile() {
    const name = newFileName.trim();
    if (!name) return;
    const filename = name.endsWith(".md") ? name : `${name}.md`;
    if (files.includes(filename)) {
      toast.error("文件已存在");
      return;
    }
    setNewFileOpen(false);
    await handleCreateFile(filename);
  }

  async function handleDeleteFile(filename: string) {
    if (
      !(await confirmDialog({
        message: `删除剧本文件「${filename}」？不可恢复。`,
        danger: true,
      }))
    )
      return;
    const r = await runWithError(
      () => ipc.deleteScenarioScript(scenarioId, filename),
      "删除失败",
    );
    if (!r.ok) return;
    const next = files.find((f) => f !== filename);
    await reloadAll(next);
  }

  // ── 解析结果（全部文件）─────────────────────────────
  const parsedByFile = useMemo(() => {
    const map: Record<string, ParsedScript> = {};
    for (const f of files) map[f] = parseScript(contents[f] ?? "");
    return map;
  }, [files, contents]);

  // knot 大纲（按文件分组，pc 顺序）
  const outline = useMemo(
    () =>
      files.map((f) => {
        const p: ParsedScript | undefined = parsedByFile[f];
        return { file: f, knots: p ? Object.values(p.knots) : [] };
      }),
    [files, parsedByFile],
  );

  // 全部 knot 名（去重，跨文件可跳）
  const allKnotNames = useMemo(() => {
    const out: string[] = [];
    for (const f of files) {
      const p: ParsedScript | undefined = parsedByFile[f];
      if (!p) continue;
      for (const k of Object.keys(p.knots)) {
        if (!out.includes(k)) out.push(k);
      }
    }
    return out;
  }, [files, parsedByFile]);

  // 全部变量（按 key 去重，先出现者优先）
  const allVars = useMemo(() => {
    const out: { key: string; literal: string }[] = [];
    for (const f of files) {
      for (const v of parsedByFile[f]?.vars ?? []) {
        if (!out.some((x) => x.key === v.key)) out.push(v);
      }
    }
    return out;
  }, [files, parsedByFile]);

  // ── 当前 knot（光标定位）───────────────────────────
  const currentKnotName = useMemo(() => {
    if (cursorLine === null || !currentFile) return null;
    if (mode === "structured") {
      const p = parsedByFile[currentFile];
      if (!p) return null;
      for (let i = Math.min(cursorLine, p.lines.length - 1); i >= 0; i--) {
        const l = p.lines[i];
        if (l.type === "knot") return l.name;
      }
      return null;
    }
    const srcLines = (contents[currentFile] ?? "").split(/\r?\n/);
    for (let i = Math.min(cursorLine, srcLines.length - 1); i >= 0; i--) {
      const m = srcLines[i].match(/^===\s*(.+?)\s*$/);
      if (m) return m[1];
    }
    return null;
  }, [mode, cursorLine, currentFile, parsedByFile, contents]);

  const currentKnot =
    currentFile && currentKnotName
      ? (parsedByFile[currentFile]?.knots[currentKnotName] ?? null)
      : null;

  // ── 定位（knot 大纲 / 搜索命中）────────────────────
  async function openKnot(file: string, knotName: string) {
    const k = parsedByFile[file]?.knots[knotName];
    if (!k) return;
    await flushAll();
    setCurrentFile(file);
    setCursorLine(null);
    const content = contentsRef.current[file] ?? "";
    setPending({
      pc: k.pc,
      sourceLine: pcToSourceLine(content, k.pc),
      nonce: ++nonceRef.current,
    });
  }

  function openSearchHit(h: ScriptHit) {
    const content = contentsRef.current[h.filename] ?? "";
    setCurrentFile(h.filename);
    setCursorLine(null);
    setQ("");
    setHits(null);
    setPending({
      sourceLine: h.line,
      pc: sourceLineToPc(content, h.line),
      nonce: ++nonceRef.current,
    });
  }

  // ── 剧本内搜索 ──────────────────────────────────────
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ScriptHit[] | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 3) {
      setHits(null);
      return;
    }
    const h = setTimeout(async () => {
      const r = await runWithError(
        () => ipc.searchScenarioScripts(scenarioId, text, 30),
        "搜索失败",
      );
      if (!r.ok) return;
      setHits(r.value);
    }, 300);
    return () => clearTimeout(h);
  }, [q, scenarioId]);

  useEffect(() => {
    if (hits === null) return;
    function onDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setHits(null);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [hits]);

  // ── 入口 knot 编辑 ──────────────────────────────────
  async function handleEntryKnot(v: string) {
    const s = scenarios.find((x) => x.id === scenarioId);
    if (!s) return;
    const next: Scenario = {
      ...s,
      entry_knot: v || null,
      updated_at: nowMs(),
    };
    try {
      await ipc.upsertScenario(next);
      upsertScenario(next);
    } catch {
      toast.error("保存入口 knot 失败");
    }
  }

  if (!loaded) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted)",
          fontSize: 12,
        }}
      >
        加载中…
      </div>
    );
  }

  const structuredScroll =
    pending?.pc != null ? { line: pending.pc, nonce: pending.nonce } : null;
  const sourceScroll =
    pending?.sourceLine != null
      ? { line: pending.sourceLine, nonce: pending.nonce }
      : null;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {/* ── 左：文件树 + knot 大纲 ── */}
      <div
        style={{
          width: 180,
          flexShrink: 0,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <PanelHeader>剧本文件</PanelHeader>
        <div
          style={{
            flexShrink: 0,
            maxHeight: "45%",
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {files.map((f) => {
            const active = f === currentFile;
            return (
              <div
                key={f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 12,
                  paddingRight: 6,
                }}
              >
                <button
                  onClick={() => switchFile(f)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "4px 0",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    fontWeight: active ? 600 : 400,
                    color: active
                      ? "var(--accent-gold)"
                      : "var(--fg-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={f}
                >
                  {f}
                  {f in dirtyFiles ? " *" : ""}
                </button>
                {files.length > 1 && (
                  <button
                    onClick={() => handleDeleteFile(f)}
                    title={`删除 ${f}`}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--fg-muted)",
                      cursor: "pointer",
                      fontSize: 11,
                      padding: "0 4px",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={handleAddFile}
            title="新建剧本文件"
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              color: "var(--fg-secondary)",
              cursor: "pointer",
              fontSize: 12,
              padding: "6px 12px",
            }}
          >
            + 新建文件
          </button>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            marginTop: 4,
          }}
        />
        <PanelHeader>
          knot 大纲
          <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>
            {allKnotNames.length}
          </span>
        </PanelHeader>
        <div
          style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 8 }}
        >
          {outline.map(({ file, knots }) => (
            <div key={file}>
              {files.length > 1 && (
                <div
                  style={{
                    padding: "4px 12px 2px",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={file}
                >
                  {file}
                </div>
              )}
              {knots.length === 0 && (
                <div
                  style={{
                    padding: "2px 12px",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                  }}
                >
                  （无 knot）
                </div>
              )}
              {knots.map((k) => {
                const active =
                  k.name === currentKnotName && file === currentFile;
                return (
                  <button
                    key={`${file}:${k.name}`}
                    onClick={() => openKnot(file, k.name)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: active ? "var(--bg-raised)" : "transparent",
                      cursor: "pointer",
                      padding: "3px 12px",
                      fontSize: 12,
                      color: active
                        ? "var(--accent-gold)"
                        : "var(--fg-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={k.name}
                  >
                    {k.name}
                    {k.scene ? (
                      <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>
                        {" "}
                        @{k.scene}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── 中：面包屑 + 编辑器 ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-panel)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              color: "var(--fg-primary)",
            }}
          >
            {currentFile ?? "（无文件）"}
          </span>
          {currentKnotName && (
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              › {currentKnotName}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 11,
              color: saving
                ? "var(--accent-flame)"
                : dirty
                  ? "var(--warning)"
                  : "var(--fg-muted)",
              flexShrink: 0,
            }}
          >
            {saving ? "保存中…" : dirty ? "有未保存修改" : "已保存"}
          </span>
          <div ref={searchRef} style={{ position: "relative", flexShrink: 0 }}>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索剧本（≥3 字）"
              style={{ width: 170, fontSize: 12, padding: "4px 8px" }}
            />
            {hits !== null && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  width: 320,
                  maxHeight: 320,
                  overflowY: "auto",
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  zIndex: 100,
                }}
              >
                {hits.length === 0 && (
                  <div
                    style={{
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--fg-muted)",
                    }}
                  >
                    无匹配结果
                  </div>
                )}
                {hits.map((h) => (
                  <button
                    key={`${h.filename}:${h.line}`}
                    onClick={() => openSearchHit(h)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 12px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-raised)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--fg-primary)",
                      }}
                    >
                      {h.filename} : {h.line + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--fg-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <SnippetText snippet={h.snippet} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {files.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "var(--fg-muted)",
              fontSize: 12,
            }}
          >
            还没有剧本文件
            <button
              className="btn btn-primary"
              onClick={() => handleCreateFile("main.md")}
              style={{ fontSize: 12 }}
            >
              创建 main.md
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "4px 12px",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-panel)",
                display: "flex",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <TabButton
                active={mode === "structured"}
                onClick={() => setMode("structured")}
              >
                结构
              </TabButton>
              <TabButton
                active={mode === "source"}
                onClick={() => setMode("source")}
              >
                源码
              </TabButton>
            </div>

            {currentFile && (
              <>
                {mode === "structured" ? (
                  <ScriptStructuredEditor
                    key={`${scenarioId}:${currentFile}:structured`}
                    content={contents[currentFile] ?? ""}
                    onChange={handleChange}
                    knotNames={allKnotNames}
                    varNames={allVars.map((v) => v.key)}
                    onCursorLine={setCursorLine}
                    scrollToLine={structuredScroll}
                  />
                ) : (
                  <ScriptSourceEditor
                    key={`${scenarioId}:${currentFile}:source`}
                    content={contents[currentFile] ?? ""}
                    onChange={handleChange}
                    cursorKey={`${scenarioId}:${currentFile}`}
                    knotNames={allKnotNames}
                    varNames={allVars.map((v) => v.key)}
                    onCursorLine={setCursorLine}
                    scrollToLine={sourceScroll}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── 右：检查器 ── */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 12,
        }}
      >
        <section>
          <PanelHeader>剧情设置</PanelHeader>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
              入口 knot
            </span>
            <select
              className="select"
              value={entryKnot ?? ""}
              onChange={(e) => handleEntryKnot(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="">默认（第一个 knot）</option>
              {allKnotNames.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              {entryKnot &&
              entryKnot !== "END" &&
              !allKnotNames.includes(entryKnot) ? (
                <option value={entryKnot}>{entryKnot}（未找到）</option>
              ) : null}
            </select>
          </div>
        </section>

        <section>
          <PanelHeader>
            变量（只读）
            <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>
              {allVars.length}
            </span>
          </PanelHeader>
          {allVars.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
              剧本中还没有 VAR 行
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-secondary)",
              }}
            >
              {allVars.map((v) => (
                <div key={v.key} style={{ padding: "2px 0" }}>
                  <span style={{ color: "var(--fg-muted)" }}>VAR </span>
                  {v.key} = {v.literal}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <PanelHeader>当前 knot</PanelHeader>
          {currentKnot ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--fg-primary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {currentKnot.name}
              </span>
              {currentKnot.scene && (
                <span style={{ color: "var(--fg-secondary)", fontSize: 11 }}>
                  <span style={{ color: "var(--fg-muted)" }}>@scene </span>
                  {currentKnot.scene}
                </span>
              )}
              {currentKnot.actors.map((a) => (
                <span
                  key={a}
                  style={{ color: "var(--fg-secondary)", fontSize: 11 }}
                >
                  <span style={{ color: "var(--fg-muted)" }}>@actor </span>
                  {a}
                </span>
              ))}
              {!currentKnot.scene && currentKnot.actors.length === 0 && (
                <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
                  无 @scene / @actor
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>—</div>
          )}
        </section>
      </div>
      {newFileOpen && (
        <Modal
          title="新建剧本文件"
          onClose={() => setNewFileOpen(false)}
          width={400}
        >
          <input
            className="input"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmNewFile();
            }}
            placeholder="main.md"
          />
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button className="btn" onClick={() => setNewFileOpen(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={confirmNewFile}>
              创建
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "8px 12px 4px",
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 12px",
      }}
    >
      {children}
    </button>
  );
}

function SnippetText({ snippet }: { snippet: string }) {
  const parts: React.ReactNode[] = [];
  let rest = snippet;
  let key = 0;
  while (rest.length > 0) {
    const start = rest.indexOf("[[");
    if (start === -1) {
      parts.push(rest);
      break;
    }
    if (start > 0) parts.push(rest.slice(0, start));
    const end = rest.indexOf("]]", start + 2);
    if (end === -1) {
      parts.push(rest.slice(start));
      break;
    }
    parts.push(
      <mark
        key={key++}
        style={{
          background: "var(--accent-gold)",
          color: "var(--bg-app)",
          borderRadius: 2,
          padding: "0 2px",
        }}
      >
        {rest.slice(start + 2, end)}
      </mark>,
    );
    rest = rest.slice(end + 2);
  }
  return <>{parts}</>;
}
