/**
 * 语义组件层的统一入口。
 *
 * 存在的理由：**降低采用成本**。审计时发现组件建了却没人用 —— EmptyState
 * 全站 2 处引用，而 4 个文件一字不差地抄了它那份内联样式。原因之一就是
 * 要写 `from "../../components/ui/EmptyState"` 这种深路径，抄一遍内联更快。
 *
 * 有了 barrel：`import { EmptyState } from "../../components/ui"`。
 *
 * 与 index.css 工具类的分工：
 *   纯样式、无结构 → 用类（.row / .stack / .muted / .grow / .truncate …）
 *   有结构或有行为 → 用组件（这里的）
 * 判断标准很简单：需要 children 之外的 props 或内部状态，就做组件。
 *
 * 注意：barrel 会让 audit-deadcode.mjs 把每个组件都算作「被引用」，
 * 所以这里的死组件不会被脚本发现 —— 新增组件后请确认它真的有消费方。
 */

export { useContextMenu } from "./ContextMenu";
export { EmptyState } from "./EmptyState";
export { Modal } from "./Modal";
export { Row, Stack } from "./Stack";
export { SaveInput } from "./SaveInput";
export { SectionLabel } from "./SectionLabel";
export { Toggle } from "./Toggle";
export { Toolbar, ToolbarSpacer } from "./Toolbar";
