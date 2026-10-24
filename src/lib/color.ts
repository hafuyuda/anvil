/**
 * 字符串 -> 稳定颜色 / 头像首字。
 *
 * 合并原先散落在 audioCollections（集合色块）与 VNStage（说话人侧别）的
 * 同款哈希算法，避免两处日后漂移。
 */
import { basename } from "./path";

/** 稳定的字符串哈希（FNV-ish，31 进位）。同一字符串总得同一非负整数。 */
export function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 由字符串稳定推导一个 HSL 颜色（同字符串同色），用于头像 / 集合色块占位。 */
export function colorFromString(
  str: string,
  opts: { saturation?: number; lightness?: number } = {},
): string {
  const h = hashString(str) % 360;
  const s = opts.saturation ?? 52;
  const l = opts.lightness ?? 46;
  return `hsl(${h} ${s}% ${l}%)`;
}

/** 取路径/字符串首字符（去扩展名），大写，用于色块占位；空则回退 ♪。 */
export function initials(str: string): string {
  const ch = basename(str).replace(/\.[^.]+$/, "").charAt(0);
  return ch ? ch.toUpperCase() : "♪";
}
