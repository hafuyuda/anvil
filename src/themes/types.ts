export interface ThemeDef {
  /** 唯一 id，与 manifest.theme_id 对应 */
  id: string;
  /** 显示名 */
  name: string;
  /** CSS 变量覆盖。只放覆盖项，缺失的走 :root 默认 */
  variables: Record<string, string>;
}
