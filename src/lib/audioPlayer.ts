import { loadAsset } from "./assetCache";
import { clamp } from "./math";
import { getAppSettings, setAppSettings } from "./appSettings";

/**
 * 全局音频播放器单例。
 *
 * - 以「队列」为核心：点击任意曲目 = 以当前列表为队列播放该曲。
 * - 播放模式控制一曲结束后的行为（顺序 / 列表循环 / 单曲循环 / 随机）。
 * - 跨重启恢复：队列 / 下标 / 进度 / 模式 / 倍速写回 appSettings，启动时停在暂停态。
 * - 跨曲淡入淡出（crossfade）：双音频槽，crossfadeMs>0 时交叉，=0 时退化为原单元素行为。
 *
 * 体积 / 性能原则：仍是纯 HTMLAudioElement 播放（呈现层），不引入 Web Audio 解码或
 * 重编码管线（那属于被明确排除的「加工层」）。
 */

export type PlayMode = "sequential" | "loopAll" | "loopOne" | "shuffle";

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
  /** audio metadata 是否已加载（可 seek） */
  ready: boolean;
  /** 播放队列（相对路径列表） */
  queue: string[];
  /** 当前曲目在队列中的下标；队列为空时为 -1 */
  queueIndex: number;
  /** 播放模式 */
  playMode: PlayMode;
  /** 播放倍速 0.25–2 */
  speed: number;
  /** 跨曲淡入淡出时长（毫秒），0 = 关闭 */
  crossfadeMs: number;
}

function initialVolume(): number {
  return getAppSettings().playerVolume;
}
function initialPlayMode(): PlayMode {
  return getAppSettings().playerPlayMode;
}
function initialSpeed(): number {
  return getAppSettings().playerSpeed;
}
function initialCrossfade(): number {
  return getAppSettings().playerCrossfadeMs;
}

let state: PlayerState = {
  current: null,
  playing: false,
  position: 0,
  duration: 0,
  volume: initialVolume(),
  ready: false,
  queue: [],
  queueIndex: -1,
  playMode: initialPlayMode(),
  speed: initialSpeed(),
  crossfadeMs: initialCrossfade(),
};

const listeners = new Set<() => void>();

// ── 双音频槽（crossfade 用）──
// slots[activeSlot] 为当前主轨；切换曲目时在新槽起播并淡入，旧槽淡出后停。
let slots: [HTMLAudioElement | null, HTMLAudioElement | null] = [null, null];
let activeSlot = 0;
let rafHandle: number | null = null;
// 末尾预触发 crossfade 的防重入标记
let crossfadeTriggered = false;

// 随机模式下的播放序与指针
let shuffleOrder: number[] = [];
let shufflePos = -1;

// 队列所属项目（绝对路径）。队列里是 `assets/audio/x.mp3` 这类相对路径，
// 换项目后必须整体作废，否则会指向另一个项目的同名文件。
let queueProject: string | null = getAppSettings().playerQueueProject;

// VN 播放时让位：视觉小说接管音频时不抢 Space 等全局媒体键
let sceneAudioActive = false;

function getActive(): HTMLAudioElement | null {
  return slots[activeSlot];
}

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

// ── tick：播放时更新 position + 末尾预触发 crossfade ──

function startTick() {
  if (rafHandle !== null) return;
  let lastPersist = 0;
  const tick = () => {
    const el = getActive();
    if (!el) {
      rafHandle = null;
      return;
    }
    setState({ position: el.currentTime });

    // 进度持久化（节流，约每 4s 写一次）
    const now = performance.now();
    if (now - lastPersist > 4000) {
      lastPersist = now;
      persistPosition();
    }

    // crossfade 末尾预触发：剩余不足一个淡出时长时提前切下一首，形成重叠。
    // 单曲循环不能触发 —— 否则「循环」会变成「切下一首」。
    if (
      state.crossfadeMs > 0 &&
      state.playMode !== "loopOne" &&
      state.duration > 0 &&
      !crossfadeTriggered &&
      state.duration - el.currentTime <= state.crossfadeMs / 1000 + 0.05
    ) {
      crossfadeTriggered = true;
      if (advance(1)) void playCurrent();
    }

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

// ── 持久化 ──

function persistQueue() {
  setAppSettings({
    playerQueue: state.queue,
    playerQueueIndex: state.queueIndex,
    playerQueueProject: queueProject,
  });
}
function persistPosition() {
  setAppSettings({ playerPosition: state.position });
}

// ── 随机序 ──

function buildShuffle() {
  const n = state.queue.length;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  shuffleOrder = order;
  shufflePos = n > 0 ? Math.max(0, order.indexOf(state.queueIndex)) : -1;
}

// ── 音量淡变（crossfade 用，ms<=0 立即生效）──

function fadeVolume(el: HTMLAudioElement, target: number, ms: number): Promise<void> {
  if (ms <= 0) {
    el.volume = target;
    return Promise.resolve();
  }
  const start = performance.now();
  const startVol = el.volume;
  return new Promise((resolve) => {
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / ms);
      el.volume = startVol + (target - startVol) * t;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

// ── 创建音频槽 ──

function ensureSlot(i: number): HTMLAudioElement {
  if (slots[i]) return slots[i];
  const el = new Audio();
  el.volume = state.volume;
  el.playbackRate = state.speed;

  el.addEventListener("loadedmetadata", () => {
    if (el === getActive() && el.duration && Number.isFinite(el.duration)) {
      setState({ duration: el.duration, ready: true });
    }
  });

  el.addEventListener("ended", () => {
    // 仅主轨的 ended 触发续播；淡出中的旧槽忽略
    if (el !== getActive()) return;
    // loopOne 由 audio.loop 处理，ended 不会触发；到这里说明需要续播
    if (advance(1)) {
      void playCurrent();
    } else {
      setState({ playing: false, position: 0 });
      stopTick();
    }
  });

  el.addEventListener("play", () => {
    if (el === getActive()) setState({ playing: true });
  });
  el.addEventListener("pause", () => {
    if (el === getActive()) setState({ playing: false });
  });

  slots[i] = el;
  return el;
}

// ── 队列推进 ──

/** 在队列内移动下标。返回是否成功（顺序/列表循环到达末尾且无循环时返回 false）。 */
function advance(dir: 1 | -1): boolean {
  const n = state.queue.length;
  if (n === 0) return false;

  if (state.playMode === "shuffle") {
    let pos = shufflePos + dir;
    if (pos >= shuffleOrder.length) {
      buildShuffle();
      pos = 0;
    } else if (pos < 0) {
      buildShuffle();
      pos = shuffleOrder.length - 1;
    }
    shufflePos = pos;
    state.queueIndex = shuffleOrder[pos];
    return true;
  }

  let i = state.queueIndex + dir;
  if (i >= n) {
    if (state.playMode === "loopAll") i = 0;
    else return false; // sequential：到末尾停下
  } else if (i < 0) {
    if (state.playMode === "loopAll") i = n - 1;
    else return false;
  }
  state.queueIndex = i;
  return true;
}

/** 加载并播放队列中 queueIndex 指向的曲目。 */
async function playCurrent(): Promise<void> {
  const path = state.queue[state.queueIndex];
  if (!path) return;

  const url = await loadAsset(path);
  if (!url) return;

  const cf = state.crossfadeMs;
  const old = getActive();

  if (cf > 0 && old && old.src) {
    // ── 交叉淡入淡出：在新槽起播并淡入，旧槽淡出后停 ──
    const newIdx = 1 - activeSlot;
    const nu = ensureSlot(newIdx);
    nu.loop = state.playMode === "loopOne";
    nu.playbackRate = state.speed;
    nu.volume = 0;
    nu.src = url;
    nu.currentTime = 0;

    try {
      await nu.play();
    } catch {
      // 浏览器策略或用户未交互，保持暂停态
    }

    activeSlot = newIdx;
    crossfadeTriggered = false;
    setState({ current: path, position: 0, duration: 0, ready: false });
    persistQueue();

    void fadeVolume(nu, state.volume, cf);
    void fadeVolume(old, 0, cf).then(() => {
      old.pause();
      old.removeAttribute("src");
      old.load();
    });
    startTick();
  } else {
    // ── 单元素路径（crossfade 关闭，或首次播放）──
    const idx = old ? activeSlot : 0;
    const el = ensureSlot(idx);
    // 停掉另一个槽（若有）
    const other = slots[1 - idx];
    if (other && other !== el) {
      other.pause();
      other.removeAttribute("src");
      other.load();
    }
    activeSlot = idx;
    el.loop = state.playMode === "loopOne";
    el.playbackRate = state.speed;
    el.volume = state.volume;
    el.pause();
    el.src = url;
    el.currentTime = 0;

    crossfadeTriggered = false;
    setState({ current: path, position: 0, duration: 0, ready: false });
    persistQueue();

    try {
      await el.play();
      startTick();
    } catch {
      setState({ playing: false });
    }
  }
}

// ── 公开 API ──

/**
 * 以 paths 为队列播放 startIndex 处的曲目。
 * 用于「列表即队列」：点击某行即把整张列表作为队列，从第 index 首开始。
 */
export async function enqueue(
  paths: string[],
  startIndex = 0,
): Promise<void> {
  if (paths.length === 0) return;
  const idx = clamp(startIndex, 0, paths.length - 1);
  setState({ queue: [...paths], queueIndex: idx });
  if (state.playMode === "shuffle") buildShuffle();
  await playCurrent();
}

/** 兼容旧调用：播放单首（队列即 [path]）。 */
export async function playTrack(relative: string | null): Promise<void> {
  if (!relative) {
    stop();
    return;
  }
  await enqueue([relative], 0);
}

export function play(): void {
  const el = getActive();
  if (!el || !state.current) return;
  void el.play().then(
    () => startTick(),
    () => setState({ playing: false }),
  );
}

export function pause(): void {
  const el = getActive();
  if (!el) return;
  el.pause();
  stopTick();
  persistPosition();
}

export function toggle(): void {
  if (state.playing) pause();
  else play();
}

export function stop(): void {
  stopTick();
  for (const el of slots) {
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  }
  slots = [null, null];
  activeSlot = 0;
  setState({
    current: null,
    playing: false,
    position: 0,
    duration: 0,
    ready: false,
    queue: [],
    queueIndex: -1,
  });
  setAppSettings({
    playerQueue: [],
    playerQueueIndex: -1,
    playerQueueProject: queueProject,
    playerPosition: 0,
  });
}

export function next(): void {
  if (advance(1)) void playCurrent();
}

export function prev(): void {
  // 主流播放器习惯：播放超过 3 秒时，上一首先回到曲目开头
  const el = getActive();
  if (el && el.currentTime > 3) {
    seek(0);
    return;
  }
  if (advance(-1)) void playCurrent();
}

export function setPlayMode(mode: PlayMode): void {
  setState({ playMode: mode });
  const el = getActive();
  if (el) el.loop = mode === "loopOne";
  if (mode === "shuffle") buildShuffle();
  setAppSettings({ playerPlayMode: mode });
}

export function setSpeed(s: number): void {
  const clamped = clamp(s, 0.25, 2);
  for (const el of slots) if (el) el.playbackRate = clamped;
  setState({ speed: clamped });
  setAppSettings({ playerSpeed: clamped });
}

export function setCrossfadeMs(ms: number): void {
  const clamped = clamp(ms, 0, 2000);
  setState({ crossfadeMs: clamped });
  setAppSettings({ playerCrossfadeMs: clamped });
}

export function seek(seconds: number): void {
  const el = getActive();
  if (!el || !state.ready) return;
  const clamped = clamp(seconds, 0, state.duration || 0);
  el.currentTime = clamped;
  setState({ position: clamped });
}

export function setVolume(v: number): void {
  const clamped = clamp(v, 0, 1);
  for (const el of slots) if (el) el.volume = clamped;
  setState({ volume: clamped });
  setAppSettings({ playerVolume: clamped });
}

/**
 * 把播放器绑定到当前项目。切换项目时丢弃旧队列与当前曲目 ——
 * 队列存的是相对路径，跨项目会指向另一个项目的同名文件。
 * 同一项目（启动时自动打开上次项目）则保留跨重启恢复的队列。
 */
export function bindPlayerToProject(path: string | null): void {
  if (queueProject === path) return;
  const hadQueue = state.queue.length > 0 || state.current !== null;
  queueProject = path;
  if (hadQueue) stop();
  else setAppSettings({ playerQueueProject: path });
}

/**
 * 跨重启恢复：重建队列 / 下标 / 进度 / 模式 / 倍速，但停在暂停态（不自动出声，
 * 符合浏览器自动播放策略）。当前曲目仅加载元数据以便显示时长与可 seek。
 */
export function restorePlayer(): void {
  const s = getAppSettings();
  const queue = s.playerQueue;
  if (!queue || queue.length === 0) return;
  const idx = clamp(s.playerQueueIndex ?? 0, 0, queue.length - 1);
  const current = queue[idx] ?? null;
  if (!current) return;

  setState({
    queue: [...queue],
    queueIndex: idx,
    playMode: s.playerPlayMode,
    speed: s.playerSpeed,
    crossfadeMs: s.playerCrossfadeMs,
    current,
    position: s.playerPosition,
    duration: 0,
    ready: false,
    playing: false,
  });
  if (state.playMode === "shuffle") buildShuffle();

  void loadAsset(current).then((url) => {
    if (!url) return;
    const el = ensureSlot(activeSlot);
    el.loop = false;
    el.playbackRate = state.speed;
    el.volume = state.volume;
    el.src = url;
    el.addEventListener(
      "loadedmetadata",
      () => {
        if (!Number.isFinite(el.duration)) return;
        setState({ duration: el.duration, ready: true });
        if (state.position > 0 && state.position < el.duration) {
          try {
            el.currentTime = state.position;
            setState({ position: state.position });
          } catch {
            // 某些格式 seek 失败，忽略
          }
        }
      },
      { once: true },
    );
  });
}

/** VN 运行时调用：进入时为 true（让位全局媒体键），退出为 false。 */
export function setSceneAudioActive(v: boolean): void {
  sceneAudioActive = v;
}

/** 供 playerHotkeys 读取，决定是否让位。 */
export function isSceneAudioActive(): boolean {
  return sceneAudioActive;
}
