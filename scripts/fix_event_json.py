#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 Anvil 会话事件流（sessions/<id>/events.jsonl）里的坏行。

为什么需要它：
  后端 store/sessions.rs::load_events 是 `if let Ok(ev) = from_str(line)`，
  **坏行被静默跳过 —— 不报错、不计数**。所以一行坏 JSON = 一条消息在
  界面上凭空消失，且用户完全不会收到提示。

已观察到的两类坏行（都在「心海沉音：虚伪新月」里出现过）：
  1. 叙述文本含未转义的半角双引号：`直到半年前，"无心化症候群"出现`
     → 字符串被提前截断，整行不是合法 JSON。
  2. 两条记录粘在同一物理行（`}{"seq":896`）—— 某条写入时缺了换行符。
     （与缺陷 C 修过的「文件尾无换行」是同一类。）

修复策略：
  - 引号：逐字符扫描，用「后随字符」判定 —— 字符串内的 `"` 若紧跟
    `:` `,` `]` `}`（跳过空白）就是真实结束引号，否则是内容里的裸引号。
  - 粘行：按 `{"seq":` 的起始位置切开；只有一个对象时不切，避免误伤。
  - 修完必须 `json.loads` 通过才采纳，修不动的原样保留并报告。

模式：
  escape（默认）：`"` → `\"`，可见文本一字不改，只是变成合法 JSON。
  curly：`"` → “/” 交替，中文排版更地道，但**会改变可见字符**。

安全：默认 dry-run。--apply 才落盘，且落盘前对每个文件做 .bak 备份。

用法：
  python scripts/fix_event_json.py <项目目录>                 # 只出报告
  python scripts/fix_event_json.py <项目目录> --apply         # 执行修复
  python scripts/fix_event_json.py <项目目录> --mode curly    # 转中文引号
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import shutil
import sys

STRUCT_TAIL = ":,]}"


def fix_line(line: str, mode: str) -> str | None:
    """修复单行。返回修复后的文本；无法修复（仍不是合法 JSON）返回 None。"""
    out: list[str] = []
    in_string = False
    curly_open = True
    i = 0
    n = len(line)
    while i < n:
        c = line[i]
        # 转义序列整体保留
        if in_string and c == "\\":
            out.append(line[i : i + 2])
            i += 2
            continue
        if c == '"':
            if not in_string:
                in_string = True
                out.append(c)
                i += 1
                continue
            j = i + 1
            while j < n and line[j] in " \t":
                j += 1
            nxt = line[j] if j < n else ""
            if nxt in STRUCT_TAIL:
                in_string = False
                out.append(c)
                i += 1
                continue
            if mode == "curly":
                out.append("\u201c" if curly_open else "\u201d")
                curly_open = not curly_open
            else:
                out.append('\\"')
            i += 1
            continue
        out.append(c)
        i += 1

    fixed = "".join(out)
    try:
        json.loads(fixed)
    except Exception:
        return None
    return fixed


def split_glued(line: str) -> list[str]:
    """一行里粘了多条记录 → 按 `{"seq":` 的起始位置切开。只粘了才切。"""
    starts: list[int] = []
    idx = 0
    while True:
        i = line.find('{"seq":', idx)
        if i < 0:
            break
        starts.append(i)
        idx = i + 1
    if len(starts) <= 1:
        return [line]
    return [line[s:(starts[k + 1] if k + 1 < len(starts) else len(line))] for k, s in enumerate(starts)]


def main() -> int:
    ap = argparse.ArgumentParser(description="修复 Anvil events.jsonl 的坏行")
    ap.add_argument("project", help="项目目录")
    ap.add_argument("--mode", choices=["escape", "curly"], default="escape")
    ap.add_argument("--apply", action="store_true", help="落盘（默认 dry-run）")
    ap.add_argument("--show", type=int, default=3, help="展示几条前后对比")
    args = ap.parse_args()

    root = os.path.abspath(args.project)
    if not os.path.isdir(root):
        print(f"错误：项目目录不存在 —— {root}")
        return 2
    files = sorted(glob.glob(os.path.join(root, "sessions", "*", "events.jsonl")))
    if not files:
        print("未找到任何 events.jsonl")
        return 0

    total = bad = fixed_ok = still_bad = 0
    per_file: dict[str, list[int]] = {}
    samples: list[tuple[str, str]] = []

    for path in files:
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()
        out: list[str] = []
        changed_here: list[int] = []
        for idx, line in enumerate(lines):
            if not line.strip():
                out.append(line)
                continue
            total += 1
            try:
                json.loads(line)
                out.append(line)
                continue
            except Exception:
                bad += 1

            fixed = fix_line(line, args.mode)
            if fixed is not None:
                fixed_ok += 1
                changed_here.append(idx + 1)
                if len(samples) < args.show:
                    samples.append((line[:100], fixed[:100]))
                out.append(fixed)
                continue

            pieces = split_glued(line)
            if len(pieces) > 1:
                rebuilt = []
                ok = True
                for p in pieces:
                    fp = fix_line(p, args.mode)
                    if fp is None:
                        ok = False
                        break
                    rebuilt.append(fp)
                if ok:
                    fixed_ok += 1
                    changed_here.append(idx + 1)
                    if len(samples) < args.show:
                        samples.append((line[:90], (" ⏎ ".join(rebuilt))[:150]))
                    out.extend(rebuilt)
                    continue

            still_bad += 1
            out.append(line)
            print(f"  !! 无法修复 {os.path.basename(os.path.dirname(path))} L{idx + 1}:")
            print(f"     {line[:300]}")

        if changed_here:
            per_file[os.path.basename(os.path.dirname(path))] = changed_here
            if args.apply:
                bak = path + ".bak"
                if not os.path.exists(bak):
                    shutil.copy2(path, bak)
                tmp = path + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    f.write("\n".join(out) + "\n")
                os.replace(tmp, path)

    print(f"事件总行 {total} | 坏行 {bad} | 修复成功 {fixed_ok} | 仍失败 {still_bad}")
    print(f"受影响会话 {len(per_file)} 个：")
    for k, v in per_file.items():
        print(f"  {k}: 行 {v[:8]}{'…' if len(v) > 8 else ''}")
    if samples:
        print(f"\n前后对比（模式 {args.mode}）：")
        for a, b in samples:
            print(f"  原: {a}")
            print(f"  新: {b}\n")
    if not args.apply:
        print("dry-run 未落盘。加 --apply 执行（会先逐个文件 .bak 备份）。")
    return 0 if still_bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
