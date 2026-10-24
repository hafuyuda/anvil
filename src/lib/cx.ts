/**
 * className 拼接。过滤 falsy 值。
 *
 * cx("a", cond && "b", null) -> "a b"
 * 零依赖，替代引入 clsx（项目沙箱约束：不新增 npm 依赖）。
 */
export function cx(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts.filter(Boolean).join(" ");
}
