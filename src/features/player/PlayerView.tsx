import { useCallback, useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type AudioMeta } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import {
  getPlayerState,
  subscribePlayer,
  enqueue,
  stop,
} from "../../lib/audioPlayer";
import { invalidateAsset } from "../../lib/assetCache";
import { prefetchDuration } from "../../lib/audioMetaCache";
import { basename } from "../../lib/path";
import { formatBytes, formatDuration } from "../../lib/format";
import {
  getCollection,
  setCollection,
  removeCollectionsForPaths,
  collectionNames,
  collectionColor,
} from "../../lib/audioCollections";
import { runWithError } from "../../lib/runWithError";
import { confirmDialog } from "../../lib/confirm";
import { useSyncExternalStore } from "react";

type SortKey = "name" | "duration" | "size" | "ref";
type Selected = "all" | "ungrouped" | string;

export function PlayerView() {
  const player = useSyncExternalStore(subscribePlayer, getPlayerState);
  // 列表来自磁盘扫描（不是 store），必须在项目切换时重新拉。
  const projectPath = useProjectStore((s) => s.projectPath);
  const [items, setItems] = useState<AudioMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [durations, setDurations] = useState<Record<string, number>>({});

  // P1：集合 / 排序 / 分组视图
  const [selected, setSelected] = useState<Selected>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupView, setGroupView] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await ipc.listAudiosWithMeta();
      setItems(list);
      setError(null);
    } catch (e) {
      // 静默吞掉会把「读取失败」显示成「还没有音频」，这里必须露出原因
      setItems([]);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // 依赖 projectPath：切换项目时 Workspace 不会卸载本组件（key 只跟 activeModule），
  // 仅用 [] 会让列表永久停留在上一个项目的快照。
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelected("all");
    setQuery("");
    setDurations({});
    void refresh();
  }, [projectPath, refresh]);

  // 列表变化时批量预取时长（每首只解码一次，结果进模块缓存）
  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    Promise.all(
      items.map((it) =>
        prefetchDuration(it.path).then((d) => [it.path, d] as const),
      ),
    ).then((entries) => {
      if (!active) return;
      const map: Record<string, number> = {};
      for (const [p, d] of entries) if (d !== null) map[p] = d;
      setDurations(map);
    });
    return () => {
      active = false;
    };
  }, [items]);

  // 合并前端集合分组（后端 AudioMeta.collection 暂未返回，以设置为准）
  const itemsWithCollection = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        collection: getCollection(it.path) ?? it.collection ?? undefined,
      })),
    [items],
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      itemsWithCollection.filter((it) => {
        const inSel =
          selected === "all"
            ? true
            : selected === "ungrouped"
              ? !it.collection
              : it.collection === selected;
        const inQ = q ? basename(it.path).toLowerCase().includes(q) : true;
        return inSel && inQ;
      }),
    [itemsWithCollection, selected, q],
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = basename(a.path).localeCompare(basename(b.path), "zh-Hans-CN");
          break;
        case "duration":
          cmp = (durations[a.path] ?? 0) - (durations[b.path] ?? 0);
          break;
        case "size":
          cmp = a.size - b.size;
          break;
        case "ref":
          cmp = a.ref_count - b.ref_count;
          break;
      }
      if (cmp === 0) cmp = a.path.localeCompare(b.path);
      return cmp * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir, durations]);

  // 排序后的可见队列（点击行即以它为队列播放）
  const visibleQueue = sorted.map((it) => it.path);

  const collections = collectionNames(itemsWithCollection);
  const ungroupedCount = itemsWithCollection.filter((it) => !it.collection).length;
  const countFor = (name: string) =>
    itemsWithCollection.filter((it) => it.collection === name).length;

  function playRow(item: AudioMeta) {
    const idx = visibleQueue.indexOf(item.path);
    if (idx >= 0) void enqueue(visibleQueue, idx);
  }

  function enqueueGroup(name: string | null) {
    const paths = itemsWithCollection
      .filter((it) => (name === null ? !it.collection : it.collection === name))
      .map((it) => it.path);
    if (paths.length) void enqueue(paths, 0);
  }

  function handleAssign(item: AudioMeta, value: string) {
    if (value === "__new__") {
      const name = window.prompt("新分组名称（如：战斗 BGM、酒馆 BGM）");
      if (name && name.trim()) {
        setCollection(item.path, name.trim());
        setSelected(name.trim());
      }
      return;
    }
    setCollection(item.path, value || null);
  }

  async function handleImport() {
    const src = await openDialog({
      multiple: false,
      filters: [{ name: "音频", extensions: ["mp3", "ogg", "wav", "m4a"] }],
      title: "导入音频",
    });
    if (!src || Array.isArray(src)) return;

    const r = await runWithError(async () => {
      const relative = await ipc.importAudio(src);
      invalidateAsset(relative);
      await refresh();
      return relative;
    }, "导入失败");
    if (!r.ok) return;

    // 若当前选中了某分组，新导入的音频归入该分组
    if (selected !== "all" && selected !== "ungrouped") {
      setCollection(r.value, selected);
    }

    if (!getPlayerState().playing) {
      void enqueue([r.value], 0);
    }
  }

  async function handleDelete(item: AudioMeta) {
    const msg =
      item.ref_count > 0
        ? `「${basename(item.path)}」被 ${item.ref_count} 个剧本引用。删除后那些剧本将无法播放。继续？`
        : `删除「${basename(item.path)}」？`;
    if (
      !(await confirmDialog({
        message: msg,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;

    await runWithError(async () => {
      if (player.current === item.path) stop();
      await ipc.deleteAudio(item.path);
      invalidateAsset(item.path);
      removeCollectionsForPaths([item.path]);
      await refresh();
    }, "删除失败");
  }

  const totalSize = items.reduce((s, i) => s + i.size, 0);

  // 分组视图：按集合归并
  const groups = useMemo(() => {
    if (!groupView) return [{ key: "__all__", label: "", items: sorted }];
    const map = new Map<string, AudioMeta[]>();
    for (const it of sorted) {
      const key = it.collection ?? "__ungrouped__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    const out: { key: string; label: string; items: AudioMeta[] }[] = [];
    for (const name of collections) {
      if (map.has(name)) out.push({ key: name, label: name, items: map.get(name)! });
    }
    if (map.has("__ungrouped__")) {
      out.push({ key: "__ungrouped__", label: "未分组", items: map.get("__ungrouped__")! });
    }
    return out;
  }, [groupView, sorted, collections]);

  const totalVisible = sorted.length;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        background: "var(--bg-app)",
      }}
    >
      {/* 集合侧栏 */}
      <div
        style={{
          width: 184,
          flexShrink: 0,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            padding: "10px 12px 6px",
          }}
        >
          分组 / 播放列表
        </div>
        <CollectionRow
          active={selected === "all"}
          color={null}
          label="全部"
          count={itemsWithCollection.length}
          onSelect={() => setSelected("all")}
          onPlay={() => void enqueue(visibleQueue, 0)}
        />
        {collections.map((name) => (
          <CollectionRow
            key={name}
            active={selected === name}
            color={collectionColor(name)}
            label={name}
            count={countFor(name)}
            onSelect={() => setSelected(name)}
            onPlay={() => enqueueGroup(name)}
          />
        ))}
        <CollectionRow
          active={selected === "ungrouped"}
          color={null}
          label="未分组"
          count={ungroupedCount}
          onSelect={() => setSelected("ungrouped")}
          onPlay={() => enqueueGroup(null)}
        />
      </div>

      {/* 主区域 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 12px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-panel)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--fg-secondary)",
              marginRight: "auto",
            }}
          >
            {query || selected !== "all"
              ? `显示 ${totalVisible} / ${items.length} 个音频`
              : `共 ${items.length} 个音频 · ${formatBytes(totalSize)}`}
          </span>

          <select
            className="input"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{ width: 96, fontSize: 12 }}
            title="排序方式"
          >
            <option value="name">文件名</option>
            <option value="duration">时长</option>
            <option value="size">大小</option>
            <option value="ref">引用数</option>
          </select>
          <button
            className="btn btn-ghost"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            style={{ fontSize: 12, padding: "4px 8px" }}
            title={sortDir === "asc" ? "升序" : "降序"}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
          <button
            className={groupView ? "btn btn-primary" : "btn"}
            onClick={() => setGroupView((v) => !v)}
            style={{ fontSize: 12, padding: "4px 8px" }}
            title="按分组显示"
          >
            分组视图
          </button>

          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文件名…"
            style={{ width: 150, fontSize: 12 }}
          />
          <button
            className="btn"
            onClick={handleImport}
            style={{ fontSize: 12 }}
          >
            + 导入音频
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
            style={{ fontSize: 12 }}
            title="重新扫描 assets/audio（文件在应用外变动后使用）"
          >
            刷新
          </button>
        </div>

        <div
          style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12 }}
        >
          {loading && (
            <div className="muted">
              加载中…
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: 12,
                fontSize: 12,
                color: "var(--danger)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ flex: 1, wordBreak: "break-all" }}>
                读取音频列表失败：{error}
              </span>
              <button
                className="btn"
                onClick={() => {
                  setLoading(true);
                  void refresh();
                }}
                style={{ fontSize: 12, flexShrink: 0 }}
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--fg-muted)",
                fontSize: 12,
                border: "1px dashed var(--border-default)",
                borderRadius: "var(--radius-md)",
              }}
            >
              还没有音频。点右上角「+ 导入音频」开始。
            </div>
          )}

          {!loading && items.length > 0 && totalVisible === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--fg-muted)",
                fontSize: 12,
              }}
            >
              无匹配
            </div>
          )}

          {totalVisible > 0 &&
            groups.map((group) => (
              <div key={group.key} style={{ marginBottom: 14 }}>
                {groupView && group.key !== "__all__" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background:
                          group.key === "__ungrouped__"
                            ? "var(--bg-raised)"
                            : collectionColor(group.label),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--fg-primary)",
                      }}
                    >
                      {group.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--fg-muted)",
                      }}
                    >
                      {group.items.length}
                    </span>
                  </div>
                )}
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                  }}
                >
                  {group.items.map((item, i) => {
                    const isCurrent = player.current === item.path;
                    const isPlaying = isCurrent && player.playing;
                    return (
                      <li
                        key={item.path}
                        onClick={() => playRow(item)}
                        style={{
                          padding: "8px 14px",
                          borderBottom:
                            i < group.items.length - 1
                              ? "1px solid var(--border-subtle)"
                              : "none",
                          cursor: "pointer",
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          color: isCurrent
                            ? "var(--accent-gold)"
                            : "var(--fg-primary)",
                          background: isCurrent
                            ? "var(--bg-raised)"
                            : "transparent",
                        }}
                      >
                        <span
                          style={{
                            width: 12,
                            color: "var(--accent-gold)",
                            flexShrink: 0,
                          }}
                        >
                          {isCurrent ? (isPlaying ? "▶" : "■") : ""}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "var(--font-mono)",
                          }}
                          title={item.path}
                        >
                          {basename(item.path)}
                        </span>
                        {/* 分组分配 */}
                        <select
                          value={item.collection ?? ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleAssign(item, e.target.value);
                          }}
                          title="分配到分组"
                          style={{
                            fontSize: 11,
                            maxWidth: 96,
                            padding: "2px 4px",
                            background: item.collection
                              ? collectionColor(item.collection)
                              : "var(--bg-raised)",
                            color: item.collection ? "#fff" : "var(--fg-muted)",
                            border:
                              item.collection
                                ? "1px solid transparent"
                                : "1px solid var(--border-default)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <option value="">未分组</option>
                          {collections.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                          <option value="__new__">＋ 新建分组…</option>
                        </select>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--fg-muted)",
                            fontFamily: "var(--font-mono)",
                            flexShrink: 0,
                            width: 40,
                            textAlign: "right",
                          }}
                        >
                          {formatDuration(durations[item.path] ?? null)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--fg-muted)",
                            fontFamily: "var(--font-mono)",
                            flexShrink: 0,
                            width: 64,
                            textAlign: "right",
                          }}
                        >
                          {formatBytes(item.size)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              item.ref_count > 0
                                ? "var(--fg-muted)"
                                : "var(--warning)",
                            flexShrink: 0,
                            width: 72,
                            textAlign: "right",
                          }}
                        >
                          {item.ref_count > 0
                            ? `${item.ref_count} 处引用`
                            : "未引用"}
                        </span>
                        <button
                          className="btn btn-ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(item);
                          }}
                          title="删除"
                          style={{
                            padding: "2px 8px",
                            fontSize: 12,
                            color: "var(--danger)",
                            flexShrink: 0,
                          }}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function CollectionRow(props: {
  active: boolean;
  color: string | null;
  label: string;
  count: number;
  onSelect: () => void;
  onPlay: () => void;
}) {
  return (
    <div
      onClick={props.onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: 12,
        background: props.active ? "var(--bg-raised)" : "transparent",
        color: props.active ? "var(--accent-gold)" : "var(--fg-primary)",
        borderLeft: props.active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: props.color ?? "var(--bg-raised)",
          flexShrink: 0,
        }}
      />
      <span
        className="grow truncate"
      >
        {props.label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
        }}
      >
        {props.count}
      </span>
      <button
        className="btn btn-ghost"
        onClick={(e) => {
          e.stopPropagation();
          props.onPlay();
        }}
        title="整组入队"
        style={{ padding: "0 6px", fontSize: 11, color: "var(--fg-muted)" }}
      >
        ▶
      </button>
    </div>
  );
}
