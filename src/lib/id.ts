import { nowMs } from "./time";

export function newId(): string {
  return crypto.randomUUID();
}

/**
 * 撤销栈条目的 ID。
 * 时间戳保证可读性，随机段保证同毫秒内不撞。
 */
export function makeUndoId(): string {
  return `${nowMs()}-${newId().slice(2, 8)}`;
}
