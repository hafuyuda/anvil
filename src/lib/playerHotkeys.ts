import {
  getPlayerState,
  subscribePlayer,
  toggle,
  next,
  prev,
  isSceneAudioActive,
} from "./audioPlayer";
import { isModified, isEditableTarget } from "./keyboard";
import { basename } from "./path";

/**
 * 全局媒体键 + OS MediaSession 接入。
 *
 * - Space：播放 / 暂停（输入框、可编辑区、命令面板打开时不触发；VN 播放时让位）。
 * - Ctrl/Cmd + ← / →：上一首 / 下一首。
 * - MediaSession：接管锁屏 / 通知栏 / 耳机线控的播放控件，显示曲名。
 *
 * 在 AppShell 挂载一次即可（installPlayerHotkeys）。
 */

let installed = false;

export function installPlayerHotkeys(): void {
  if (installed) return;
  installed = true;

  window.addEventListener("keydown", onKey);

  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    const safe = (action: MediaSessionAction, handler: () => void) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // 部分平台不支持该 action，忽略
      }
    };
    safe("play", () => toggle());
    safe("pause", () => toggle());
    safe("previoustrack", () => prev());
    safe("nexttrack", () => next());
  }

  // 状态变化时同步 MediaSession 元数据与播放态
  let lastCurrent: string | null = null;
  subscribePlayer(() => {
    const s = getPlayerState();
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (s.current !== lastCurrent) {
      lastCurrent = s.current;
      if (s.current) {
        try {
          ms.metadata = new MediaMetadata({
            title: basename(s.current),
            artist: "Anvil",
            album: "音乐库",
          });
        } catch {
          // 忽略
        }
      } else {
        ms.metadata = null;
      }
    }
    ms.playbackState = s.playing ? "playing" : "paused";
  });
}

function onKey(e: KeyboardEvent): void {
  if (isEditableTarget(e.target)) return;

  const mod = isModified(e);

  if (e.key === " " && !mod) {
    // VN 接管音频时（视觉小说正在演出）让位，不抢 Space
    if (isSceneAudioActive()) return;
    e.preventDefault();
    toggle();
  } else if (mod && e.key === "ArrowRight") {
    e.preventDefault();
    next();
  } else if (mod && e.key === "ArrowLeft") {
    e.preventDefault();
    prev();
  }
}
