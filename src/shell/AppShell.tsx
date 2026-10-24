import { useEffect, useRef } from "react";
import { TopBar } from "./TopBar";
import { LeftNav } from "./LeftNav";
import { Workspace } from "./Workspace";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import { useKeyboard } from "../hooks/useKeyboard";
import { useCardTilt } from "../hooks/useCardTilt";
import { useCommands } from "../hooks/useCommands";
import { useGlobalCommands } from "../features/commands/useGlobalCommands";
import { CommandPalette } from "../components/overlay/CommandPalette";
import { ipc } from "../core/ipc";
import { MergePackDialog } from "../features/project/MergePackDialog";
import { tryAutoOpenLastProject } from "../core/actions/openProjectAt";
import { ToastHost } from "../components/overlay/ToastHost";
import { useAppSettings } from "../hooks/useAppSettings";
import { applyFontScale } from "../lib/fontScale";
import { ConfirmHost } from "../components/overlay/ConfirmHost";
import { RefConfirmHost } from "../components/overlay/RefConfirmHost";
import { SettingsPage } from "../features/settings/SettingsPage";
import { MiniPlayer } from "../features/player/MiniPlayer";
import { installPlayerHotkeys } from "../lib/playerHotkeys";
import { restorePlayer } from "../lib/audioPlayer";
import { isModified } from "../lib/keyboard";

export function AppShell() {
  const projectPath = useProjectStore((s) => s.projectPath);

  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const closePalette = useUIStore((s) => s.closePalette);
  const togglePalette = useUIStore((s) => s.togglePalette);

  const commands = useCommands();
  useGlobalCommands();
  useKeyboard();
  // 闪卡倾斜：一个全局委托监听器，见 hook 注释
  useCardTilt();
  // 媒体键 + OS MediaSession；启动恢复上次队列（停在暂停态）。
  // 必须在 effect 里只跑一次：这两件事都有副作用（改 state、重建 audio.src、
  // 挂 MediaSession 元数据），写在渲染体里会随每次重渲染重置播放进度。
  useEffect(() => {
    installPlayerHotkeys();
    restorePlayer();
  }, []);

  const mergePackOpen = useUIStore((s) => s.mergePackOpen);
  const closeMergePack = useUIStore((s) => s.closeMergePack);

  const settingsOpen = useUIStore((s) => s.settingsOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = isModified(e);
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }

      if (mod && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (useProjectStore.getState().projectPath) {
          useProjectStore.getState().setActiveModule("player");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  useEffect(() => {
    let timer: number | null = null;
    async function onFocus() {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (!projectPath) return;
        if ((useProjectStore.getState().pendingSaves ?? 0) > 0) return;
        try {
          const snap = await ipc.reloadProject();
          useProjectStore.getState().refreshProject({
            cards: snap.cards,
            cardTypes: snap.card_types,
            relationKinds: snap.relation_kinds,
            relations: snap.relations,
            scenarios: snap.scenarios,
            boards: snap.boards,
            sessions: snap.sessions,
            cardGroups: snap.card_groups,
          });
          const m = await ipc.loadManifest();
          useProjectStore.getState().setManifest(m);
        } catch {
          // 忽略
        }
      }, 500);
    }
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [projectPath]);

  const autoOpenTriedRef = useRef(false);

  useEffect(() => {
    if (autoOpenTriedRef.current) return;
    autoOpenTriedRef.current = true;
    void tryAutoOpenLastProject();
  }, []);

  const appSettings = useAppSettings();

  useEffect(() => {
    applyFontScale(appSettings.fontScale);
  }, [appSettings.fontScale]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-app)",
        backgroundImage: "var(--tex-iron)",
        color: "var(--fg-primary)",
        fontFamily: "var(--font-body)",
      }}
    >
      <TopBar />

      {settingsOpen && <SettingsPage />}

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav />
        <Workspace />
        <Inspector />
      </div>
      <StatusBar />

      <MiniPlayer />

      <ToastHost />

      <ConfirmHost />

      <RefConfirmHost />

      {paletteOpen && (
        <CommandPalette commands={commands} onClose={closePalette} />
      )}

      {mergePackOpen && <MergePackDialog onClose={closeMergePack} />}
    </div>
  );
}
