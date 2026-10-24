#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 Anvil 项目从 schema 0.3 迁移到 0.4。

0.4 的破坏性变更（对照 src-tauri 源码确认，不是猜的）：
  1. manifest.schema_version 必须是字面 "0.4"，否则 Project::open 硬门禁直接拒绝。
  2. 剧情从「扁平 scenarios/<id>.json 的 graph 格式」改为
     「scenarios/<id>/scenario.json（元数据） + scenarios/<id>/*.md（weave 剧本）」。
     store/scenarios.rs::load_scenarios 只遍历**目录**，扁平文件会被静默忽略
     —— 不迁的话剧情不是报错，是凭空消失。
  3. 关系 meta 里的 scenario_id / condition / effects 三个 0.3 字段删除。
  4. Card 模型不再有 image_extend_override（「出框」功能已删；裁剪 image_crop_override 保留）。
  5. .anvil/index.db 由 app 打开时按 needs_rebuild 自愈重建，旧的移走即可。

安全约定（脚本自己强制，不靠调用方自觉）：
  - 默认 dry-run，只有 --apply 才落盘。
  - --apply 第一步必定是整目录备份，备份失败就不往下走。
  - 不删除任何东西：旧扁平剧情、旧索引都是 move 进备份目录。

用法：
  python scripts/migrate_schema_0_4.py <项目目录>              # 只看报告
  python scripts/migrate_schema_0_4.py <项目目录> --apply      # 备份后执行
  python scripts/migrate_schema_0_4.py <项目目录> --verify     # 校验 0.4 形状
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

TARGET_SCHEMA = "0.4"

# 0.3 关系 meta 里已经不存在的键（0.4 不再有剧情图，条件/效果也不挂在关系上）
LEGACY_META_KEYS = ("scenario_id", "condition", "effects")
# 0.4 Card 模型没有的键（「出框」已删；image_crop_override 是裁剪，保留）
LEGACY_CARD_KEYS = ("image_extend_override",)


def read_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data) -> None:
    """与后端 to_vec_pretty 对齐：2 空格缩进、非 ASCII 原样、结尾换行。"""
    text = json.dumps(data, ensure_ascii=False, indent=2)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        f.write(text + "\n")
    os.replace(tmp, path)


class Report:
    def __init__(self) -> None:
        self.lines: list[str] = []

    def add(self, msg: str) -> None:
        self.lines.append(msg)
        print(msg)


def backup_project(root: Path) -> Path:
    """整目录备份。已存在同名备份就加时间戳，绝不覆盖上一份。"""
    base = root.parent / f"{root.name}.bak-0.3"
    dest = base
    if dest.exists():
        dest = root.parent / f"{root.name}.bak-0.3-{time.strftime('%Y%m%d%H%M%S')}"
    shutil.copytree(root, dest)
    return dest


def migrate_manifest(root: Path, rep: Report, apply: bool) -> bool:
    path = root / "manifest.json"
    data = read_json(path)
    cur = data.get("schema_version")
    if cur == TARGET_SCHEMA:
        rep.add(f"  manifest: 已是 {TARGET_SCHEMA}，跳过")
        return False
    rep.add(f"  manifest: schema_version {cur!r} → {TARGET_SCHEMA!r}")
    if apply:
        data["schema_version"] = TARGET_SCHEMA
        write_json(path, data)
    return True


def migrate_scenarios(root: Path, rep: Report, apply: bool, backup: Path | None) -> int:
    """
    扁平 scenarios/<id>.json → scenarios/<id>/scenario.json + 留底 scenario.0.3.json。

    0.4 的 Scenario 只有 {id, name, description?, entry_knot?, created_at, updated_at}。
    旧 graph 的 entry_node / node_ids / edge_kinds / node_positions / variables
    在 weave 模型里**没有对应物**，硬塞进 scenario.json 会被 serde 忽略，
    不如整份留底：剧情拓扑、变量定义都还在 scenario.0.3.json 里，
    用户照着它重写 weave 剧本即可。
    """
    sdir = root / "scenarios"
    if not sdir.exists():
        rep.add("  scenarios: 目录不存在，跳过")
        return 0

    flats = sorted(p for p in sdir.glob("*.json") if p.is_file())
    if not flats:
        rep.add("  scenarios: 无扁平旧文件，跳过")
        return 0

    moved = 0
    for src in flats:
        old = read_json(src)
        sid = old.get("id") or src.stem
        rep.add(
            f"  scenarios: {src.name} → scenarios/{sid}/"
            f"（留底 scenario.0.3.json，变量 {len(old.get('variables') or [])} 个）"
        )
        if not apply:
            moved += 1
            continue

        target_dir = sdir / sid
        target_dir.mkdir(parents=True, exist_ok=True)

        # 新元数据：只留 0.4 认识的字段
        new = {
            "id": sid,
            "name": old.get("name") or sid,
            "description": old.get("description"),
            # 旧图没有 knot 概念，入口交给用户写剧本时自己定
            "entry_knot": None,
            "created_at": old.get("created_at", 0),
            "updated_at": old.get("updated_at", 0),
        }
        write_json(target_dir / "scenario.json", new)

        # 原始 graph 整份留底（拓扑 + 变量）
        write_json(target_dir / "scenario.0.3.json", old)

        # 旧扁平文件移进备份，不删
        if backup:
            flat_dir = backup / "_flat_scenarios"
            flat_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(flat_dir / src.name))
        else:
            src.unlink()
        moved += 1
    return moved


def migrate_relations(root: Path, rep: Report, apply: bool) -> int:
    """剥离关系 meta 里的 0.3 字段。jsonl 逐行处理，整文件重写。"""
    rdir = root / "relations" / "from"
    if not rdir.exists():
        rep.add("  relations: 目录不存在，跳过")
        return 0

    touched = 0
    hit_counter: dict[str, int] = {}
    for path in sorted(rdir.glob("*.jsonl")):
        lines = path.read_text(encoding="utf-8").splitlines()
        out = []
        changed = False
        for line in lines:
            if not line.strip():
                out.append(line)
                continue
            rel = json.loads(line)
            meta = rel.get("meta")
            if isinstance(meta, dict):
                for k in LEGACY_META_KEYS:
                    if k in meta:
                        meta.pop(k)
                        hit_counter[k] = hit_counter.get(k, 0) + 1
                        changed = True
            out.append(json.dumps(rel, ensure_ascii=False))
        if changed:
            touched += 1
            if apply:
                tmp = path.with_suffix(".jsonl.tmp")
                tmp.write_text("\n".join(out) + "\n", encoding="utf-8")
                os.replace(tmp, path)

    if hit_counter:
        detail = "、".join(f"{k}×{v}" for k, v in sorted(hit_counter.items()))
        rep.add(f"  relations: 剥离旧 meta 字段（{detail}），涉及 {touched} 个分片")
    else:
        rep.add("  relations: 无旧 meta 字段，跳过")
    return touched


def migrate_cards(root: Path, rep: Report, apply: bool) -> int:
    """去掉 Card 模型已不认识的字段（出框 image_extend_override）。"""
    cdir = root / "cards"
    if not cdir.exists():
        rep.add("  cards: 目录不存在，跳过")
        return 0

    touched = 0
    for path in sorted(cdir.glob("**/*.json")):
        data = read_json(path)
        changed = False
        for k in LEGACY_CARD_KEYS:
            if k in data:
                data.pop(k)
                changed = True
        if changed:
            touched += 1
            rep.add(f"  cards: {path.relative_to(cdir)} 移除 {', '.join(LEGACY_CARD_KEYS)}")
            if apply:
                write_json(path, data)
    if touched == 0:
        rep.add("  cards: 无旧字段，跳过")
    return touched


def retire_index(root: Path, rep: Report, apply: bool, backup: Path | None) -> bool:
    """.anvil/index.db 移走，交给 app 打开时重建（needs_rebuild 自愈）。"""
    idx_dir = root / ".anvil"
    if not idx_dir.exists():
        rep.add("  index: 无 .anvil 目录，跳过")
        return False
    rep.add("  index: .anvil/index.db 移入备份，由 app 打开时重建")
    if apply and backup:
        dest = backup / "_old_index"
        dest.mkdir(parents=True, exist_ok=True)
        shutil.move(str(idx_dir), str(dest / ".anvil"))
    elif apply:
        shutil.rmtree(idx_dir)
    return True


def verify(root: Path, rep: Report) -> bool:
    """校验 0.4 形状。返回是否全部通过。"""
    ok = True

    def check(cond: bool, msg: str) -> None:
        nonlocal ok
        rep.add(f"  [{'OK ' if cond else 'FAIL'}] {msg}")
        if not cond:
            ok = False

    manifest = read_json(root / "manifest.json")
    check(manifest.get("schema_version") == TARGET_SCHEMA,
          f"manifest.schema_version == {TARGET_SCHEMA}（实际 {manifest.get('schema_version')!r}）")

    sdir = root / "scenarios"
    flats = list(sdir.glob("*.json")) if sdir.exists() else []
    check(not flats, f"无扁平 scenario 文件（实际 {len(flats)} 个）")

    dirs = [d for d in sdir.iterdir() if d.is_dir()] if sdir.exists() else []
    check(bool(dirs), f"剧情以目录形式存在（{len(dirs)} 个）")
    for d in dirs:
        meta = d / "scenario.json"
        check(meta.exists(), f"{d.name}/scenario.json 存在")
        if meta.exists():
            data = read_json(meta)
            known = {"id", "name", "description", "entry_knot", "created_at", "updated_at"}
            extra = set(data) - known
            check(not extra, f"{d.name}/scenario.json 无 0.3 残留字段（多余: {extra or '无'}）")

    bad_meta = 0
    for path in (root / "relations" / "from").glob("*.jsonl"):
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            meta = json.loads(line).get("meta") or {}
            bad_meta += sum(1 for k in LEGACY_META_KEYS if k in meta)
    check(bad_meta == 0, f"关系 meta 无旧字段（残留 {bad_meta} 处）")

    bad_card = 0
    for path in (root / "cards").glob("**/*.json"):
        data = read_json(path)
        bad_card += sum(1 for k in LEGACY_CARD_KEYS if k in data)
    check(bad_card == 0, f"卡牌无出框字段（残留 {bad_card} 处）")

    check(not (root / ".anvil").exists(), ".anvil 已移除（等待 app 重建）")

    # ── 数据完整性：迁移不该碰的部分，也要确认它本来就是好的 ──────────
    # 跑团事件流是最珍贵也最容易在迁移后被误认为「迁坏了」的数据，单独查。
    cards = [read_json(p) for p in (root / "cards").glob("**/*.json")]
    check(
        all(all(k in c for k in ("id", "type_id", "name", "values", "updated_at")) for c in cards),
        f"卡牌必填字段齐备（{len(cards)} 张）",
    )

    sessions = [read_json(p) for p in (root / "sessions").glob("*/session.json")]
    check(
        all(all(k in s for k in ("id", "name", "created_at", "updated_at")) for s in sessions),
        f"会话必填字段齐备（{len(sessions)} 个）",
    )

    ev_total = 0
    ev_bad = 0
    seq_bad = 0
    for path in sorted((root / "sessions").glob("*/events.jsonl")):
        seqs: list[int] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            ev_total += 1
            try:
                seqs.append(int(json.loads(line).get("seq", 0)))
            except Exception:
                ev_bad += 1
        if any(a > b for a, b in zip(seqs, seqs[1:])):
            seq_bad += 1
    check(ev_bad == 0, f"事件行 JSON 合法（{ev_total} 行，失败 {ev_bad}）")
    check(seq_bad == 0, f"事件 seq 单调递增（异常文件 {seq_bad} 个）")

    rels = sum(
        1
        for p in (root / "relations" / "from").glob("*.jsonl")
        for line in p.read_text(encoding="utf-8").splitlines()
        if line.strip()
    )
    rep.add(f"  [信息] 关系 {rels} 条 / 事件 {ev_total} 行 / 卡牌 {len(cards)} 张")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Anvil 项目 schema 0.3 → 0.4 迁移")
    ap.add_argument("project", help="项目目录（.anvil 目录）")
    ap.add_argument("--apply", action="store_true", help="实际执行（默认只出报告）")
    ap.add_argument("--verify", action="store_true", help="校验 0.4 形状")
    args = ap.parse_args()

    root = Path(args.project).expanduser().resolve()
    if not root.is_dir():
        print(f"错误：项目目录不存在 —— {root}")
        return 2

    rep = Report()

    if args.verify:
        print(f"校验 {root}")
        return 0 if verify(root, rep) else 1

    print(f"{'执行迁移' if args.apply else 'DRY-RUN（未落盘）'}：{root}")
    rep.add("─" * 60)

    backup: Path | None = None
    if args.apply:
        backup = backup_project(root)
        rep.add(f"  备份：{backup}")
    rep.add("─" * 60)

    migrate_manifest(root, rep, args.apply)
    migrate_scenarios(root, rep, args.apply, backup)
    migrate_relations(root, rep, args.apply)
    migrate_cards(root, rep, args.apply)
    retire_index(root, rep, args.apply, backup)

    rep.add("─" * 60)
    if args.apply:
        print("迁移完成。")
    else:
        print("以上是 dry-run 结果。确认无误后加 --apply 执行（会先整目录备份）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
