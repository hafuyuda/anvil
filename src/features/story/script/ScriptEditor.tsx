import { useCallback, useMemo, useRef, useState } from "react";
import { ipc, type Scenario, type ScriptHit } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { parseScript } from "./parser";
import type { ParsedScript } from "./types";
import { ScriptSourceEditor } from "./source/ScriptSourceEditor";
import { ScriptStructuredEditor } from "./structured/ScriptStructuredEditor";
import { toast } from "../../../lib/toast";
import { confirmDialog } from "../../../lib/confirm";
import { nowMs } from "../../../lib/time";
import { Modal } from "../../../components/ui/Modal";
import { useScenarioScripts } from "./editor/useScenarioScripts";
import { ScriptFileTree } from "./editor/ScriptFileTree";
import { ScriptSearchBox } from "./editor/ScriptSearchBox";
import {
  ScriptInspectorPanel,
  type ScriptVar,
} from "./editor/ScriptInspectorPanel";
import { TabButton, type OutlineGroup } from "./editor/primitives";
import { pcToSourceLine, sourceLineToPc } from "./lineMap";

interface Props {
  scenarioId: string;
  /** 入口 knot（用于检查器显示） */
  entryKnot: string | null;
}

type Mode = "structured" | "source";

/**
 * 剧本编辑器外壳：三栏（文件树 / 编辑器 / 检查器）+ 结构 / 源码双模式。
 *
 * 自己只留编排：装载与落盘在 `useScenarioScripts`，三个面板各自独立成文件，
 * 行号换算在 `lineMap`。原先这是个 1000 行的上帝组件，
 * 改一行保存逻辑要在三百行 JSX 里找上下文。
 */
export function ScriptEditor({ scenarioId, entryKnot }: Props) {
  const [mode, setMode] = useState<Mode>("structured");
  const [cursorLine, setCursorLine] = useState<number | null>(null);
  const [pending, setPending] = useState<{
    pc?: number;
    sourceLine?: number;
    nonce: number;
  } | null>(null);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const nonceRef = useRef(0);
  const contentsRef = useRef<Record<string, string>>({});

  const scenarios = useProjectStore((s) => s.scenarios) ?? [];
  const upsertScenario = useProjectStore((s) => s.upsertScenario);

  const store = useScenarioScripts(scenarioId);
  const {
    files,
    contents,
    dirtyFiles,
    loaded,
    saving,
    currentFile,
    dirty,
    flushAll,
    handleChange,
    switchFile,
    createFile,
    deleteFile,
  } = store;
  contentsRef.current = contents;

  const content = currentFile ? (contents[currentFile] ?? "") : "";

  // ── 派生：解析结果 / knot 大纲 / 变量表 ─────────────
  const parsedByFile = useMemo(() => {
    const map: Record<string, ParsedScript> = {};
    for (const f of files) map[f] = parseScript(contents[f] ?? "");
    return map;
  }, [files, contents]);

  const outline = useMemo<OutlineGroup[]>(
    () =>
      files.map((f) => {
        const p: ParsedScript | undefined = parsedByFile[f];
        return { file: f, knots: p ? Object.values(p.knots) : [] };
      }),
    [files, parsedByFile],
  );

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

  const allVars = useMemo<ScriptVar[]>(() => {
    const out: ScriptVar[] = [];
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
    const srcLines = content.split(/\r?\n/);
    for (let i = Math.min(cursorLine, srcLines.length - 1); i >= 0; i--) {
      const m = srcLines[i].match(/^===\s*(.+?)\s*$/);
      if (m) return m[1];
    }
    return null;
  }, [mode, cursorLine, currentFile, parsedByFile, content]);

  const currentKnot =
    currentFile && currentKnotName
      ? (parsedByFile[currentFile]?.knots[currentKnotName] ?? null)
      : null;

  // ── 定位（knot 大纲 / 搜索命中）────────────────────
  const openKnot = useCallback(
    async (file: string, knotName: string) => {
      const k = parsedByFile[file]?.knots[knotName];
      if (!k) return;
      await flushAll();
      if (file !== currentFile) {
        await switchFile(file);
      }
      setCursorLine(null);
      setPending({
        pc: k.pc,
        sourceLine: pcToSourceLine(contentsRef.current[file] ?? "", k.pc),
        nonce: ++nonceRef.current,
      });
    },
    [parsedByFile, flushAll, currentFile, switchFile],
  );

  const openSearchHit = useCallback(
    (h: ScriptHit) => {
      const fileContent = contentsRef.current[h.filename] ?? "";
      void switchFile(h.filename);
      setCursorLine(null);
      setPending({
        sourceLine: h.line,
        pc: sourceLineToPc(fileContent, h.line),
        nonce: ++nonceRef.current,
      });
    },
    [switchFile],
  );

  // ── 入口 knot 编辑 ──────────────────────────────────
  const handleEntryKnot = useCallback(
    async (v: string) => {
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
    },
    [scenarios, scenarioId, upsertScenario],
  );

  // ── 文件管理 ────────────────────────────────────────
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
    await createFile(filename);
  }

  async function handleDeleteFile(filename: string) {
    if (
      !(await confirmDialog({
        message: `删除剧本文件「${filename}」？不可恢复。`,
        danger: true,
      }))
    )
      return;
    await deleteFile(filename);
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
      <ScriptFileTree
        files={files}
        currentFile={currentFile}
        dirtyFiles={dirtyFiles}
        outline={outline}
        knotCount={allKnotNames.length}
        currentKnotName={currentKnotName}
        onSwitch={(f) => {
          // 光标行是按文件存的，切文件必须重置，否则面包屑会拿旧文件的
          // 光标去新文件里找 knot
          setCursorLine(null);
          void switchFile(f);
        }}
        onDelete={(f) => void handleDeleteFile(f)}
        onCreate={handleAddFile}
        onOpenKnot={(f, k) => void openKnot(f, k)}
      />

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
          <ScriptSearchBox scenarioId={scenarioId} onOpenHit={openSearchHit} />
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
              onClick={() => void createFile("main.md")}
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
                    content={content}
                    onChange={handleChange}
                    knotNames={allKnotNames}
                    varNames={allVars.map((v) => v.key)}
                    onCursorLine={setCursorLine}
                    scrollToLine={structuredScroll}
                  />
                ) : (
                  <ScriptSourceEditor
                    key={`${scenarioId}:${currentFile}:source`}
                    content={content}
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

      <ScriptInspectorPanel
        entryKnot={entryKnot}
        allKnotNames={allKnotNames}
        allVars={allVars}
        currentKnot={currentKnot}
        onEntryKnot={(v) => void handleEntryKnot(v)}
      />

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
