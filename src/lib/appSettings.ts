const KEY = "anvil.appSettings";

export interface AppSettings {
  /** CardFrame 风格 id；未知 id 会在渲染时回退 anvil */
  defaultCardFrameStyle: string;
  typewriterSpeed: number;
  typewriterEnabled: boolean;
  typewriterNarration: boolean;
  autoSaveDelayMs: number;
  recentProjectsMax: number;
  fontScale: number;
  playerVolume: number;
  playerLoop: boolean;
  /** 播放模式：顺序 / 列表循环 / 单曲循环 / 随机 */
  playerPlayMode: "sequential" | "loopAll" | "loopOne" | "shuffle";
  /** 集合（分组 / 收藏）映射：音频相对路径 → 集合名。P1 启用。 */
  playerCollections: Record<string, string>;
  /** 播放队列（相对路径），用于跨重启恢复。P2 启用。 */
  playerQueue: string[];
  /** 队列当前下标，跨重启恢复用。 */
  playerQueueIndex: number;
  /** 队列所属项目的绝对路径。换项目后旧队列作废（相对路径会串到别的项目）。 */
  playerQueueProject: string | null;
  /** 当前曲目播放位置（秒），跨重启恢复用。 */
  playerPosition: number;
  /** 播放倍速 0.25–2。 */
  playerSpeed: number;
  /** 跨曲淡入淡出时长（毫秒），0 = 关闭。 */
  playerCrossfadeMs: number;
  /** 上次使用的掷骰表达式，作为掷骰面板初值。 */
  lastRollExpr: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultCardFrameStyle: "anvil",
  typewriterSpeed: 35,
  typewriterEnabled: true,
  typewriterNarration: false,
  autoSaveDelayMs: 800,
  recentProjectsMax: 10,
  fontScale: 1.0,
  playerVolume: 0.7,
  playerLoop: false,
  playerPlayMode: "sequential",
  playerCollections: {},
  playerQueue: [],
  playerQueueIndex: -1,
  playerQueueProject: null,
  playerPosition: 0,
  playerSpeed: 1,
  playerCrossfadeMs: 0,
  lastRollExpr: "1d20",
};

let cached: AppSettings | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_APP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function getAppSettings(): AppSettings {
  if (!cached) cached = readFromStorage();
  return cached;
}

function notify() {
  for (const fn of listeners) fn();
}

export function setAppSettings(patch: Partial<AppSettings>): void {
  const next = { ...getAppSettings(), ...patch };
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可用时静默，内存内仍生效
  }
  notify();
}

export function resetAppSettings(): void {
  cached = { ...DEFAULT_APP_SETTINGS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 同上
  }
  notify();
}

export function subscribeAppSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
