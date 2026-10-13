export interface FoilStyleDef {
  /** 唯一 id，存进 card_frame.foil_style */
  id: string;
  /** 下拉 / 标签显示的名字 */
  label: string;
  /**
   * 该风格的 CSS。只在首次加载时注入一次到 <head>。
   * 约定：所有选择器以 `.foil--{id}` 起头，避免跨风格污染。
   */
  css: string;
}
