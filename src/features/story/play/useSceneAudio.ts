import { useEffect, useRef } from "react";
import { loadAudio } from "../../../lib/audioCache";

/**
 * 视觉小说运行时音频控制。
 *
 * - bgm：跨行保持，只有 currentBgm 变化时才切换。循环播放。
 * - sfx：lineIndex 或 sceneId 变化时触发当前行的 sfx 列表。
 *
 * 组件卸载时停止所有音频。
 */
export function useSceneAudio(
  sceneId: string | null,
  lineIndex: number,
  bgm: string | null,
  sfxList: string[],
) {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmRef = useRef<string | null>(null);

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
    void loadAudio(bgm).then((url) => {
      if (cancelled || !url) return;
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0;
      void audio.play().catch(() => {
        // 浏览器可能因用户交互策略拒绝播放，静默
      });
      fadeIn(audio, 150);
      bgmRef.current = audio;
    });

    return () => {
      cancelled = true;
    };
  }, [bgm]);

  // sfx 触发：lineIndex 或 sceneId 变化时，把当前行的 sfx 全部播一遍
  useEffect(() => {
    if (sfxList.length === 0) return;
    let cancelled = false;
    for (const path of sfxList) {
      void loadAudio(path).then((url) => {
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
  }, [sceneId, lineIndex]);
}

function fadeIn(audio: HTMLAudioElement, ms: number) {
  const start = performance.now();
  function tick() {
    const t = Math.min(1, (performance.now() - start) / ms);
    audio.volume = t;
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
