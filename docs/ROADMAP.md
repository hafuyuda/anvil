# Anvil 路线图

> 本文档承接 `docs/DESIGN.md` 中剥离出的非设计内容（原 §23 里程碑、§24 待办清单）。
> - 发布记录见 `CHANGELOG.md`；
> - 设计约定见 `docs/DESIGN.md`。

## 待办（提升与优化）

- [ ] 图片缩略图
- [ ] 命令面板性能
- [ ] 文件监听（notify）
- [ ] 资源包合并支持音频（已知缺口：当前 `pack.rs` 合并时跳过 `assets/audio/`，
      见 `docs/DESIGN.md` §18.3）

## 技术债（顺手改）

- [ ] 内联样式 → 组件（`SectionLabel` / `EmptyState` / `Toggle`）长尾替换
- [ ] `useEffect` 依赖数组隐患逐个核实
- [ ] CI 增强（加 `cargo check` + `cargo fmt --check` + `prettier --check`）
- [ ] `index.css` 里 `.graph-handle` 残留样式清理

## 长期

- [ ] 场景卡强制约束
- [ ] 受限插件系统

## 里程碑（已发布，详见 `CHANGELOG.md`）

- M1 卡牌核心 · M2 关系 · M3 分支故事 · M4 棋盘与跑团 · M5 分享与扩展
  · M6 打磨与生态 · M6.5 视觉小说
- 0.2.0（2026-10-09）· 0.3.0（2026-10-13）· 0.4.0（2026-10-24）
