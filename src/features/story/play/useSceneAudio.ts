import { useEffect, useRef } from "react";
import { loadAsset } from "../../../lib/assetCache";
import { useAppSettings } from "../../../hooks/useAppSettings";
import {
  getPlayerState,
  pause as pausePlayer,
  play as playPlayer,
  setSceneAudioActive,
} from "../../../lib/audioPlayer";

/**
 * 视觉小说运行时音频控制。
 *
 * - bgm：跨行保持，只有 currentBgm 变化时才切换。循环播放。
 * - sfx：sfxList 变化时把列表里的音效全部播一遍。
 *
 * 组件卸载时停止所有音频。
 */
export function useSceneAudio(
  sceneId: string | null,
  bgm: string | null,
  sfxList: string[],
) {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmRef = useRef<string | null>(null);
  const settings = useAppSettings();

  // VN 接管：进入时暂停全局播放器，退出时恢复；同时让位全局媒体键（Space 等）
  useEffect(() => {
    const wasPlaying = getPlayerState().playing;
    if (wasPlaying) pausePlayer();
    setSceneAudioActive(true);
    return () => {
      setSceneAudioActive(false);
      if (wasPlaying) playPlayer();
    };
  }, []);

  // 卸载时停止
  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.src = "";
        bgmRef.current = null;
      }
    };
  }, []);

  // bgm 切换
  useEffect(() => {
    if (currentBgmRef.current === bgm) return;

    const oldAudio = bgmRef.current;
    if (oldAudio) {
      void fadeOut(oldAudio, 150).then(() => {
        oldAudio.pause();
        oldAudio.src = "";
      });
      bgmRef.current = null;
    }
    currentBgmRef.current = bgm;

    if (!bgm) return;

    let cancelled = false;
    void loadAsset(bgm).then((url) => {
      if (cancelled || !url) return;
      const audio = new Audio(url);
      // 场景 BGM 语义就是「循环到下一次 @bgm」。原先读 settings.playerLoop，
      // 但该设置自 P0 改队列播放模式后已无 UI 入口、恒为 false，等于 BGM 播完即静音。
      audio.loop = true;
      audio.volume = 0;
      void audio.play().catch(() => {
        // 浏览器可能因用户交互策略拒绝播放，静默
      });
      fadeIn(audio, 150, settings.playerVolume);
      bgmRef.current = audio;
    });

    return () => {
      cancelled = true;
    };
  }, [bgm]);

  // 全局音量变化时，实时调整正在播放的 bgm 音量
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = settings.playerVolume;
  }, [settings.playerVolume]);

  // sfx 触发：sfxList 变化时，把列表里的音效全部播一遍
  useEffect(() => {
    if (sfxList.length === 0) return;
    let cancelled = false;
    for (const path of sfxList) {
      void loadAsset(path).then((url) => {
        if (cancelled || !url) return;
        const audio = new Audio(url);
        void audio.play().catch(() => {
          // 静默
        });
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, sfxList]);
}

function fadeIn(audio: HTMLAudioElement, ms: number, targetVolume = 1) {
  const start = performance.now();
  function tick() {
    const t = Math.min(1, (performance.now() - start) / ms);
    audio.volume = t * targetVolume;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function fadeOut(audio: HTMLAudioElement, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const startVol = audio.volume;
    const start = performance.now();
    function tick() {
      const t = Math.min(1, (performance.now() - start) / ms);
      audio.volume = startVol * (1 - t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}
