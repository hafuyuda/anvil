import type { SlotValue } from "../mapping";

/** 读文本槽位，无值返回 "" */
export function readText(slot: SlotValue | undefined): string {
  return slot?.kind === "text" ? slot.text : "";
}

/** 读数值槽位，无值返回 null */
export function readStat(
  slot: SlotValue | undefined,
): { value: number; label: string | null } | null {
  return slot?.kind === "stat"
    ? { value: slot.value, label: slot.label }
    : null;
}

/** 读正文槽位，返回行数组 */
export function readBody(slot: SlotValue | undefined): string[] {
  return slot?.kind === "body" ? slot.lines : [];
}

/** 读图像槽位，无值返回 undefined */
export function readImage(slot: SlotValue | undefined): string | undefined {
  return slot?.kind === "image" ? (slot.path ?? undefined) : undefined;
}
