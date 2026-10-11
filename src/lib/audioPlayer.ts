import { loadAsset } from "./assetCache";
import { getAppSettings, setAppSettings } from "./appSettings";

/**
 * 全局音频播放器单例。
 *
 * - 只有一个 HTMLAudioElement，同一时刻只播一首
 * - 状态通过 useSyncExternalStore 订阅
 * - 组件卸载不停止播放（跨页面保持）
 * - 音量 / 循环持久化到 appSettings
 */

export interface PlayerState {
  /** 当前曲目的相对路径 */
  current: string | null;
  /** 是否在播放 */
  playing: boolean;
  /** 当前位置（秒） */
  position: number;
  /** 总时长（秒），未加载时为 0 */
  duration: number;
  /** 0–1 */
  volume: number;
  /** 是否循环 */
  loop: boolean;
  /** audio metadata 是否已加载（可 seek） */
  ready: boolean;
}

function initialVolume(): number {
  return getAppSettings().playerVolume;
}

function initialLoop(): boolean {
  return getAppSettings().playerLoop;
}

let state: PlayerState = {
  current: null,
  playing: false,
  position: 0,
  duration: 0,
  volume: initialVolume(),
  loop: initialLoop(),
  ready: false,
};

const listeners = new Set<() => void>();

let audio: HTMLAudioElement | null = null;
let rafHandle: number | null = null;

function notify() {
  for (const fn of listeners) fn();
}

function setState(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  notify();
}

export function getPlayerState(): PlayerState {
  return state;
}

export function subscribePlayer(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ── tick：播放时更新 position ──

function startTick() {
  if (rafHandle !== null) return;
  const tick = () => {
    if (!audio) {
      rafHandle = null;
      return;
    }
    setState({ position: audio.currentTime });
    rafHandle = requestAnimationFrame(tick);
  };
  rafHandle = requestAnimationFrame(tick);
}

function stopTick() {
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }
}

// ── 创建 audio 元素 ──

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;

  const el = new Audio();
  el.volume = state.volume;
  el.loop = state.loop;

  el.addEventListener("loadedmetadata", () => {
    if (el.duration && Number.isFinite(el.duration)) {
      setState({ duration: el.duration, ready: true });
    }
  });

  el.addEventListener("ended", () => {
    // loop 由 audio.loop 处理；到这里说明没循环
    setState({ playing: false, position: 0 });
    stopTick();
  });

  el.addEventListener("play", () => setState({ playing: true }));
  el.addEventListener("pause", () => setState({ playing: false }));

  audio = el;
  return el;
}

// ── 公开 API ──

/** 换曲并播放。传 null 则停止。 */
export async function playTrack(relative: string | null): Promise<void> {
  if (!relative) {
    stop();
    return;
  }

  // 同一首：切到播放
  if (state.current === relative && audio) {
    play();
    return;
  }

  const url = await loadAsset(relative);
  if (!url) return;

  const el = ensureAudio();
  el.pause();
  el.src = url;
  el.currentTime = 0;

  setState({ current: relative, position: 0, duration: 0, ready: false });

  try {
    await el.play();
    startTick();
  } catch {
    // 浏览器策略或用户未交互，保持暂停态
    setState({ playing: false });
  }
}

export function play(): void {
  if (!audio || !state.current) return;
  void audio.play().then(
    () => startTick(),
    () => setState({ playing: false }),
  );
}

export function pause(): void {
  if (!audio) return;
  audio.pause();
  stopTick();
}

export function toggle(): void {
  if (state.playing) pause();
  else play();
}

export function stop(): void {
  stopTick();
  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }
  setState({
    current: null,
    playing: false,
    position: 0,
    duration: 0,
    ready: false,
  });
}

export function seek(seconds: number): void {
  if (!audio || !state.ready) return;
  const clamped = Math.max(0, Math.min(seconds, state.duration || 0));
  audio.currentTime = clamped;
  setState({ position: clamped });
}

export function setVolume(v: number): void {
  const clamped = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = clamped;
  setState({ volume: clamped });
  setAppSettings({ playerVolume: clamped });
}

export function setLoop(v: boolean): void {
  if (audio) audio.loop = v;
  setState({ loop: v });
  setAppSettings({ playerLoop: v });
}
