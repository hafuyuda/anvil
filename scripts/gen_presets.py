#!/usr/bin/env python3
"""生成 Anvil 的四个内置预设（0.4 项目目录）。

输出到 src-tauri/presets/<id>/：
  preset.json             元数据（id/label/description），供 build.rs 读取
  manifest.json           schema_version = "0.4"
  types/card_types.json   卡类型
  types/relation_kinds.json 关系类型
  cards/<type>/*.json     卡（每卡一文件，符合 Card 结构）
  relations/from/*.jsonl  关系
  boards/*.json           棋盘（仅 ttrpg）
  sessions/<id>/*         会话（仅 ttrpg）
  scenarios/<id>/*.md     剧本（仅 vn）
  card_groups/*.json      卡组（仅 tcg）
  assets/images/*.png     占位图

运行：python scripts/gen_presets.py
"""
import json
import os
import struct
import zlib

ROOT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "src-tauri", "presets")
)
T = 1700000000000  # 占位时间戳；导入时会被覆盖为 now_ms()


# ───────────────────────── 占位图 ─────────────────────────
def png(path: str, w: int, h: int, rgb: tuple[int, int, int]) -> None:
    raw = bytearray()
    for _ in range(h):
        raw.append(0)
        for _ in range(w):
            raw += bytes(rgb)
    comp = zlib.compress(bytes(raw), 9)

    def chunk(typ: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    out = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", comp)
        + chunk(b"IEND", b"")
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(out)


# ───────────────────────── 写入助手 ─────────────────────────
def wjson(*parts) -> None:
    # 约定：parts = (目录..., 文件名, 内容)；内容作为最后一个位置参数。
    *dir_parts, name, obj = parts
    d = os.path.join(*dir_parts)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def wjsonl(*parts) -> None:
    *dir_parts, name, rows = parts
    d = os.path.join(*dir_parts)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name), "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def wt(*parts) -> None:
    *dir_parts, name, text = parts
    d = os.path.join(*dir_parts)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name), "w", encoding="utf-8") as f:
        f.write(text)


# ───────────────────────── 字段构造 ─────────────────────────
def field(key, label, kind, options=None, group=None, order=0):
    f = {"key": key, "label": label, "ty": {"kind": kind}}
    if options is not None:
        f["ty"]["options"] = options
    if group:
        f["group"] = group
    f["order"] = order
    return f


# ══════════════════════════════════════════════════════════════
# 预设 1：跑团战役 · 矮人矿镇
# ══════════════════════════════════════════════════════════════
def gen_ttrpg():
    base = os.path.join(ROOT, "ttrpg")
    png(os.path.join(base, "assets", "images", "tavern_bg.png"), 1200, 800, (38, 28, 22))
    png(os.path.join(base, "assets", "images", "thorin.png"), 300, 400, (120, 86, 54))
    png(os.path.join(base, "assets", "images", "balin.png"), 300, 400, (104, 78, 56))
    png(os.path.join(base, "assets", "images", "smaug.png"), 300, 400, (156, 44, 30))

    wjson(base, "preset.json", {
        "id": "ttrpg",
        "label": "跑团战役 · 矮人矿镇",
        "description": "D&D 风格矮人主题战役：角色/地点/怪物/物品卡 + 关系，附 1 张地图与 1 场会话，满屏矮人笑话。",
    })
    wjson(base, "manifest.json", {
        "kind": "anvil-project",
        "schema_version": "0.4",
        "name": "矮人矿镇战役",
        "version": "0.1.0",
        "description": "内置预设：D&D 矮人主题跑团起点。",
        "created_at": T,
        "updated_at": T,
    })

    wjson(base, "types", "card_types.json", [
        {
            "id": "type_character", "name": "角色",
            "description": "PC 与 NPC。",
            "color": "#d9822b",
            "created_at": T, "updated_at": T,
            "fields": [
                field("race", "种族", "enum", ["矮人", "人类", "精灵", "半兽人", "巨人", "其他"]),
                field("job", "职业", "text"),
                field("alignment", "阵营", "enum",
                      ["守序善良", "中立善良", "混乱善良", "守序中立", "绝对中立",
                       "混乱中立", "守序邪恶", "中立邪恶", "混乱邪恶"]),
                # 战斗段：hp / max_hp 是跑团面板读血条的约定键名
                field("hp", "生命", "number", group="战斗", order=1),
                field("max_hp", "最大生命", "number", group="战斗", order=2),
                field("ac", "护甲", "number", group="战斗", order=3),
                # 属性段：面板会把每个 number 字段变成一枚快捷检定按钮
                field("str", "力量", "number", group="属性", order=4),
                field("dex", "敏捷", "number", group="属性", order=5),
                field("con", "体质", "number", group="属性", order=6),
                field("int", "智力", "number", group="属性", order=7),
                field("wis", "感知", "number", group="属性", order=8),
                field("cha", "魅力", "number", group="属性", order=9),
                field("bio", "简介", "rich_text", group="背景", order=10),
            ],
            "allowed_relation_kinds": ["rel_hostile", "rel_ally", "rel_vassal"],
        },
        {
            "id": "type_place", "name": "地点",
            "color": "#2980b9",
            "created_at": T, "updated_at": T,
            "fields": [
                field("region", "区域", "text"),
                field("desc", "描述", "rich_text", order=10),
            ],
        },
        {
            "id": "type_monster", "name": "怪物",
            "color": "#c0392b",
            "created_at": T, "updated_at": T,
            "fields": [
                field("species", "种类", "text"),
                field("threat", "威胁", "enum", ["低", "中", "高", "灭世"]),
                field("hp", "生命", "number", group="战斗", order=1),
                field("max_hp", "最大生命", "number", group="战斗", order=2),
                field("ac", "护甲", "number", group="战斗", order=3),
                field("str", "力量", "number", group="属性", order=4),
                field("dex", "敏捷", "number", group="属性", order=5),
                field("con", "体质", "number", group="属性", order=6),
                field("desc", "描述", "rich_text", order=10),
            ],
        },
        {
            "id": "type_item", "name": "物品",
            "color": "#8e44ad",
            "created_at": T, "updated_at": T,
            "fields": [
                field("category", "类别", "enum", ["武器", "护甲", "消耗品", "传说", "其他"]),
                field("desc", "描述", "rich_text", order=10),
            ],
        },
    ])

    wjson(base, "types", "relation_kinds.json", [
        {"id": "rel_hostile", "name": "敌对", "directed": True, "color": "#c0392b",
         "created_at": T, "updated_at": T},
        {"id": "rel_ally", "name": "同盟", "directed": False, "color": "#27ae60",
         "created_at": T, "updated_at": T},
        {"id": "rel_vassal", "name": "从属", "directed": True, "inverse_name": "统帅",
         "color": "#8e44ad", "created_at": T, "updated_at": T},
        {"id": "rel_located", "name": "位于", "directed": True, "inverse_name": "包含",
         "color": "#2980b9", "created_at": T, "updated_at": T},
    ])

    chars = {
        "thorin": {
            "name": "索林·铁须", "race": "矮人", "job": "国王", "alignment": "守序善良",
            "hp": 34, "max_hp": 34, "ac": 17,
            "str": 17, "dex": 11, "con": 16, "int": 11, "wis": 12, "cha": 14,
            "bio": "矮人王。座右铭：「不动的就雕，动的就砍，比你高的就爬上去砍。」"
                   "矮人从不数到四——因为数到三就忍不住开始挖了。",
        },
        "balin": {
            "name": "巴林", "race": "矮人", "job": "副官", "alignment": "守序善良",
            "hp": 28, "max_hp": 28, "ac": 16,
            "str": 15, "dex": 12, "con": 15, "int": 13, "wis": 14, "cha": 12,
            "bio": "索林最信任的老兵。口头禅：「年轻人，先喝一杯。矮人点菜从来只有肉、酒、肉、酒。」",
        },
        "bombur": {
            "name": "邦伯", "race": "矮人", "job": "御厨", "alignment": "中立善良",
            "hp": 26, "max_hp": 26, "ac": 13,
            "str": 14, "dex": 8, "con": 16, "int": 10, "wis": 11, "cha": 13,
            "bio": "全镇最圆的中坚。名言：「金子不会自己挖自己，所以才有了我们——但饭总得有人做。」",
        },
        "nori": {
            "name": "诺力", "race": "矮人", "job": "盗贼", "alignment": "混乱中立",
            "hp": 22, "max_hp": 22, "ac": 15,
            "str": 11, "dex": 17, "con": 12, "int": 13, "wis": 12, "cha": 14,
            "bio": "手指比胡子还灵活。被问偷没偷时答：「矮人字典里没有『撤退』，那叫『战略后撤，顺便把金子带上』。」",
        },
        "dwalin": {
            "name": "朵力", "race": "矮人", "job": "卫士", "alignment": "守序善良",
            "hp": 31, "max_hp": 31, "ac": 17,
            "str": 16, "dex": 13, "con": 16, "int": 10, "wis": 12, "cha": 11,
            "bio": "一脸凶相专吓哥布林。测试矿洞的方法：「扔块石头，『咣』是空的，『叮』是有矿，『啊』是有哥布林。」",
        },
        "dain": {
            "name": "丁列", "race": "矮人", "job": "援军统领", "alignment": "守序善良",
            "hp": 30, "max_hp": 30, "ac": 16,
            "str": 16, "dex": 12, "con": 15, "int": 11, "wis": 13, "cha": 13,
            "bio": "山那头的表亲。矮人三个愿望：1.金子 2.更多金子 3.一个装得下前两者的袋子。",
        },
    }
    for cid, c in chars.items():
        values = {k: v for k, v in c.items() if k != "name"}
        wjson(base, "cards/character", f"{cid}.json", {
            "id": f"card_{cid}", "type_id": "type_character", "name": c["name"],
            "values": values,
            "created_at": T, "updated_at": T,
        })

    wjson(base, "cards/monster", "smaug.json", {
        "id": "card_smaug", "type_id": "type_monster", "name": "红龙斯毛格",
        "values": {"species": "龙", "threat": "灭世",
                   "hp": 220, "max_hp": 220, "ac": 19,
                   "str": 23, "dex": 12, "con": 21,
                   "desc": "占了矿镇金子的老龙。矮人对它喊：「你头发长，见识短；你个子高，摔得惨！」——然后撒腿就跑。"},
        "created_at": T, "updated_at": T,
    })
    wjson(base, "cards/monster", "goblin.json", {
        "id": "card_goblin", "type_id": "type_monster", "name": "哥布林巡逻队",
        "values": {"species": "哥布林", "threat": "中",
                   "hp": 15, "max_hp": 15, "ac": 14,
                   "str": 10, "dex": 14, "con": 12,
                   "desc": "偷金子的小贼。矮人衡量友情的标准：能一起喝几桶麦酒；衡量敌人的标准：能一起挨几斧。"},
        "created_at": T, "updated_at": T,
    })

    # 遭遇卡：牌桌上那个「不知道会摸到什么」的堆
    for eid, (name, species, threat, hp, desc) in {
        "rat": ("洞穴巨鼠", "鼠群", "低", 6,
                "矿道里的常住民。矮人说：「它比我先到，可它没带锄头。」"),
        "bat": ("洞顶蝙蝠", "蝙蝠", "低", 5,
                "倒挂着看你。矮人扔石头：「咣」是石头，「吱」是它醒了。"),
        "spider": ("织网蜘蛛", "蜘蛛", "中", 11,
                   "网织得像矮人的账本，密不透风。矮人砍网比砍矿还费劲。"),
    }.items():
        wjson(base, "cards/monster", f"{eid}.json", {
            "id": f"card_{eid}", "type_id": "type_monster", "name": name,
            "values": {"species": species, "threat": threat,
                       "hp": hp, "max_hp": hp, "desc": desc},
            "created_at": T, "updated_at": T,
        })

    # 牌堆顺序即摸牌顺序：先摸到的在最前
    ENC = ["card_goblin", "card_rat", "card_smaug", "card_bat", "card_spider"]
    wjson(base, "card_groups", "encounter.json", {
        "id": "group_encounter", "name": "遭遇堆",
        "description": "矿道里可能撞见的东西，摸到什么算什么。",
        "card_ids": ENC,
        "created_at": T, "updated_at": T,
    })

    places = {
        "tavern": ("铁炉酒馆", "镇中心", "全镇的心脏，麦酒与锤声同频。一个矮人、一个精灵、一个人类走进酒馆，矮人先点了三杯麦酒，然后问：「矿在哪儿？」"),
        "mine": ("深岩矿坑", "地下", "金子的老家。矮人考古学只有一句话：挖得更深。"),
        "lair": ("巨龙巢穴", "山腹", "斯毛格的客厅，温控极差但金子管够。"),
    }
    for pid, (name, region, desc) in places.items():
        wjson(base, "cards/place", f"{pid}.json", {
            "id": f"card_{pid}", "type_id": "type_place", "name": name,
            "values": {"region": region, "desc": desc},
            "created_at": T, "updated_at": T,
        })

    items = {
        "axe": ("矮人战斧", "武器", "比爷爷还老，仍能砍。铁匠：「这斧比你爷爷还老。」矮人：「所以呢？它还能砍。」"),
        "ale": ("陈年麦酒", "消耗品", "矮人从不说「这不可能」，只说「这得加钱」——麦酒除外，免费的不好喝。"),
        "mithril": ("秘银锁子甲", "护甲", "轻得像谣言，硬得像矮人的脾气。"),
    }
    for iid, (name, cat, desc) in items.items():
        wjson(base, "cards/item", f"{iid}.json", {
            "id": f"card_{iid}", "type_id": "type_item", "name": name,
            "values": {"category": cat, "desc": desc},
            "created_at": T, "updated_at": T,
        })

    wjsonl(base, "relations/from", "rels.jsonl", [
        {"id": "rel_balin", "from": "card_balin", "to": "card_thorin", "kind": "rel_vassal", "created_at": T},
        {"id": "rel_nori", "from": "card_nori", "to": "card_thorin", "kind": "rel_ally", "created_at": T},
        {"id": "rel_dwalin", "from": "card_dwalin", "to": "card_thorin", "kind": "rel_vassal", "created_at": T},
        {"id": "rel_dain", "from": "card_dain", "to": "card_thorin", "kind": "rel_ally", "created_at": T},
        {"id": "rel_smaug", "from": "card_smaug", "to": "card_tavern", "kind": "rel_hostile", "created_at": T},
        {"id": "rel_goblin", "from": "card_goblin", "to": "card_mine", "kind": "rel_hostile", "created_at": T},
        {"id": "rel_mine", "from": "card_mine", "to": "card_tavern", "kind": "rel_located", "created_at": T},
        {"id": "rel_lair", "from": "card_lair", "to": "card_mine", "kind": "rel_located", "created_at": T},
    ])

    wjson(base, "boards", "board_tavern.json", {
        "id": "board_tavern", "name": "铁炉酒馆地图",
        "width": 1200, "height": 800,
        "background": "tavern_bg.png",
        "show_relations": True,
        "tokens": [
            {"id": "tok_thorin", "card_id": "card_thorin", "x": 320, "y": 400},
            {"id": "tok_balin", "card_id": "card_balin", "x": 520, "y": 430},
            {"id": "tok_bombur", "card_id": "card_bombur", "x": 720, "y": 450},
            {"id": "tok_encounter", "card_id": None, "x": 900, "y": 200,
             "w": 140, "h": 205, "name_override": "遭遇堆",
             "pile": {"group_id": "group_encounter", "label": "遭遇堆",
                      "remaining": ENC, "initial": ENC, "total": 5}},
        ],
        "created_at": T, "updated_at": T,
    })

    def bsnap(tid, cid, name, x, y, **kw):
        """牌谱快照里的一个 token —— 回放只认这些字段"""
        d = {"id": tid, "card_id": cid, "name": name, "x": x, "y": y,
             "w": None, "h": None, "rotation": 0, "layer": 0,
             "visible": True, "face_down": False,
             "is_pile": False, "pile_remaining": None}
        d.update(kw)
        return d

    # 牌谱起点：切棋盘那一刻记下的快照。之后的每一步都从它重放。
    START_TOKENS = [
        bsnap("tok_thorin", "card_thorin", "索林·铁须", 320, 400),
        bsnap("tok_balin", "card_balin", "巴林", 520, 430),
        bsnap("tok_bombur", "card_bombur", "邦伯", 720, 450),
        bsnap("tok_enc1", None, "遭遇堆", 900, 200,
              w=140, h=205, is_pile=True, pile_remaining=5),
    ]

    sess = os.path.join(base, "sessions", "session_night1")
    wjson(sess, "session.json", {
        "id": "session_night1", "name": "第一夜：麦酒与龙息",
        "board_id": "board_tavern",
        "rule_set": "dnd5e",
        # 先攻序列预置好但未激活：打开会话即可点「开始战斗」，也可直接推进
        "tracker": {
            "round": 1, "turn_index": 0, "active": False,
            "entries": [
                {"token_id": "tok_thorin", "card_id": "card_thorin",
                 "name": "索林·铁须", "value": 18, "is_pc": True},
                {"token_id": "tok_balin", "card_id": "card_balin",
                 "name": "巴林", "value": 15, "is_pc": True},
                {"token_id": "tok_bombur", "card_id": "card_bombur",
                 "name": "邦伯", "value": 9, "is_pc": True},
            ],
        },
        # 与牌谱重放到最后一步的结果保持一致
        "tokens": [
            {"id": "tok_thorin", "card_id": "card_thorin", "x": 300, "y": 320},
            {"id": "tok_balin", "card_id": "card_balin", "x": 560, "y": 380},
            {"id": "tok_bombur", "card_id": "card_bombur", "x": 720, "y": 450},
            {"id": "tok_enc1", "card_id": None, "x": 900, "y": 200,
             "w": 140, "h": 205, "name_override": "遭遇堆",
             "pile": {"group_id": "group_encounter", "label": "遭遇堆",
                      "remaining": ["card_smaug", "card_bat", "card_spider"],
                      "initial": ENC, "total": 5}},
            {"id": "tok_d1", "card_id": "card_goblin", "x": 1040, "y": 200,
             "w": 140, "h": 205, "face_down": False},
            {"id": "tok_d2", "card_id": "card_rat", "x": 1040, "y": 425,
             "w": 140, "h": 205, "face_down": True},
        ],
        "created_at": T, "updated_at": T,
    })
    wjsonl(sess, "events.jsonl", [
        {"seq": 0, "at": T, "kind": "session.start",
         "payload": {"board_id": "board_tavern", "tokens": START_TOKENS},
         "note": None},
        {"seq": 0, "at": T, "kind": "chat.narration",
         "payload": {"content": "铁炉酒馆里麦酒管够，锤声与笑声同频。这一夜还没人知道矿道尽头有什么。"},
         "note": None},
        {"seq": 0, "at": T, "kind": "board.step",
         "payload": {"moves": [
             {"id": "tok_thorin", "name": "索林·铁须",
              "from": [320, 400], "to": [300, 320]},
             {"id": "tok_balin", "name": "巴林",
              "from": [520, 430], "to": [560, 380]},
         ]},
         "note": "三人围桌落座"},
        {"seq": 0, "at": T, "kind": "chat.say",
         "payload": {"author_name": "索林", "content": "矮人看地图：北？那是向上挖吗？"},
         "note": None},
        {"seq": 0, "at": T, "kind": "chat.say",
         "payload": {"author_name": "巴林", "content": "矮人从不怕黑——火把在手，坏脾气在心。"},
         "note": None},
        {"seq": 0, "at": T, "kind": "chat.say",
         "payload": {"author_name": "邦伯",
                     "content": "问：矮人怎么数羊？一只羊、两只羊、三只羊……金子！（然后睡着了）"},
         "note": None},
        # 秘密消息：KP 全景可见，玩家视图看不到 —— 帷幕的示范
        {"seq": 0, "at": T, "kind": "chat.say",
         "payload": {"author_name": "KP",
                     "content": "斯毛格已经在矿道尽头睁开了眼。他们现在还不知道。"},
         "note": None, "visibility": "secret"},
        # 牌谱：KP 从遭遇堆摸了两张，玩家先看到扣着的牌背
        {"seq": 0, "at": T, "kind": "board.step",
         "payload": {"draws": [
             {"id": "tok_d1", "card_id": "card_goblin", "name": "哥布林巡逻队",
              "to": [1040, 200], "pile_id": "tok_enc1", "pile_name": "遭遇堆"},
             {"id": "tok_d2", "card_id": "card_rat", "name": "洞穴巨鼠",
              "to": [1040, 425], "pile_id": "tok_enc1", "pile_name": "遭遇堆"},
         ]},
         "note": "矿道里摸出两点动静"},
        {"seq": 0, "at": T, "kind": "chat.roll",
         "payload": {"author_name": "索林", "content": "1d20",
                     "roll": {"expr": "1d20", "result": 17, "detail": [17],
                              "dropped": [], "natural": 17,
                              "target": None, "rule_set": "dnd5e",
                              "outcome": None}},
         "note": None},
        {"seq": 0, "at": T, "kind": "board.step",
         "payload": {"flips": [
             {"id": "tok_d1", "name": "哥布林巡逻队", "face_down": False},
         ]},
         "note": "索林听出那是哥布林"},
    ])


# ══════════════════════════════════════════════════════════════
# 预设 2：视觉小说
# ══════════════════════════════════════════════════════════════
def gen_vn():
    base = os.path.join(ROOT, "vn")
    png(os.path.join(base, "assets", "images", "hero.png"), 320, 440, (70, 110, 165))
    png(os.path.join(base, "assets", "images", "dwarf_king.png"), 320, 440, (112, 82, 54))
    png(os.path.join(base, "assets", "images", "elf.png"), 320, 440, (88, 160, 112))
    png(os.path.join(base, "assets", "images", "mine_bg.png"), 1200, 700, (30, 24, 20))
    png(os.path.join(base, "assets", "images", "forest_bg.png"), 1200, 700, (26, 52, 38))

    wjson(base, "preset.json", {
        "id": "vn",
        "label": "视觉小说 · 矮人王与勇者",
        "description": "含角色卡（带立绘）/场景卡（带背景）与示例剧本，演示立绘、表情、选项、分支与 @scene/@bg。",
    })
    wjson(base, "manifest.json", {
        "kind": "anvil-project", "schema_version": "0.4",
        "name": "矮人王与勇者", "version": "0.1.0",
        "description": "内置预设：视觉小说起点。",
        "created_at": T, "updated_at": T,
    })

    wjson(base, "types", "card_types.json", [
        {
            "id": "type_character", "name": "角色",
            "color": "#d9822b", "created_at": T, "updated_at": T,
            "fields": [
                field("portrait", "立绘", "image"),
                field("portrait_smile", "微笑立绘", "image"),
                field("bio", "简介", "rich_text", order=10),
            ],
        },
        {
            "id": "type_scene", "name": "场景",
            "color": "#2980b9", "created_at": T, "updated_at": T,
            "fields": [
                field("background", "背景", "image"),
                field("desc", "描述", "rich_text", order=10),
            ],
        },
    ])

    wjson(base, "types", "relation_kinds.json", [])

    chars = {
        "hero": ("人类勇者", "hero.png", "年轻的冒险者，听说矮人缺金子就来了。"),
        "dwarf_king": ("索林", "dwarf_king.png", "矮人王。矮人三个愿望：1.金子 2.更多金子 3.一个装得下前两者的袋子。"),
        "elf": ("精灵大使", "elf.png", "来自林地的外交官，对矮人的锤声颇有微词。"),
    }
    for cid, (name, img, bio) in chars.items():
        wjson(base, f"cards/character", f"{cid}.json", {
            "id": f"card_{cid}", "type_id": "type_character", "name": name,
            "values": {"portrait": img, "portrait_smile": img, "bio": bio},
            "created_at": T, "updated_at": T,
        })

    scenes = {
        "mine": ("深岩矿坑", "mine_bg.png", "金子失踪的地方，黑暗里回荡着哥布林的脚步。"),
        "forest": ("精灵林地", "forest_bg.png", "高树与微光，精灵在此慢条斯理地议事。"),
    }
    for sid, (name, bg, desc) in scenes.items():
        wjson(base, "cards/scene", f"{sid}.json", {
            "id": f"card_{sid}", "type_id": "type_scene", "name": name,
            "values": {"background": bg, "desc": desc},
            "created_at": T, "updated_at": T,
        })

    scen = os.path.join(base, "scenarios", "sc_main")
    wjson(scen, "scenario.json", {
        "id": "sc_main", "name": "矮人王与勇者",
        "entry_knot": None,
        "description": "矮人矿镇的金子失踪了，勇者受召而来。",
        "created_at": T, "updated_at": T,
    })
    wt(scen, "main.md", """=== 开场
> 铁炉镇的夜晚，麦酒的香气混着锤击声。

**索林**（严肃）：人类勇者，你终于来了。
**人类勇者**（疑惑）：矮人王召我何事？
**索林**（严肃）：地下的金子少了三车，而龙穴的火光更亮了。

* 立刻前往矿坑调查
* 先在酒馆喝一杯
* 向精灵大使打探消息

=== 矿坑
@bg mine_bg
@scene 深岩矿坑
**索林**（愤怒）：看，哥布林的脚印！它们偷了我们的金子。
**人类勇者**（坚定）：那就把金子挖回来——字面意义上。
> 你们握紧武器，向黑暗深处走去。

=== 酒馆
**巴林**（轻松）：年轻人，先喝一杯。矮人点菜从来只有肉、酒、肉、酒。
**人类勇者**（笑）：你们矮人真是……直来直去。

=== 精灵
@bg forest_bg
@scene 精灵林地
**精灵大使**（优雅）：勇者，龙穴在北边——或者说，向上挖的方向。
**人类勇者**（无奈）：向上挖？那是山的外面吧。
""")


# ══════════════════════════════════════════════════════════════
# 预设 3：卡牌游戏
# ══════════════════════════════════════════════════════════════
def gen_tcg():
    base = os.path.join(ROOT, "tcg")
    wjson(base, "preset.json", {
        "id": "tcg",
        "label": "卡牌游戏 · 元素对决",
        "description": "含「卡牌」类型（费用/攻/防/稀有度）、进化/克制关系与 1 个起始卡组。",
    })
    wjson(base, "manifest.json", {
        "kind": "anvil-project", "schema_version": "0.4",
        "name": "元素对决", "version": "0.1.0",
        "description": "内置预设：卡牌游戏起点。",
        "created_at": T, "updated_at": T,
    })

    wjson(base, "types", "card_types.json", [
        {
            "id": "type_card", "name": "卡牌",
            "color": "#16a085", "created_at": T, "updated_at": T,
            "fields": [
                field("cost", "费用", "number"),
                field("atk", "攻击", "number", group="数值"),
                field("def", "防御", "number", group="数值"),
                field("rarity", "稀有度", "enum", ["普通", "稀有", "史诗", "传说"]),
                field("desc", "描述", "rich_text", order=10),
            ],
        },
    ])

    wjson(base, "types", "relation_kinds.json", [
        {"id": "rel_evolve", "name": "进化", "directed": True, "inverse_name": "退化",
         "color": "#8e44ad", "created_at": T, "updated_at": T},
        {"id": "rel_counter", "name": "克制", "directed": True, "color": "#c0392b",
         "created_at": T, "updated_at": T},
    ])

    cards = {
        "fire": ("烈焰小鬼", 2, 3, 1, "普通", "火元素的小跟班，脾气比个头大。"),
        "golem": ("岩石傀儡", 5, 4, 6, "稀有", "慢，但很顶。"),
        "dragon": ("红龙领主", 8, 9, 9, "传说", "山腹的主人，金子的收藏家。"),
        "heal": ("圣光治愈", 3, 0, 0, "稀有", "回血的法术，不扛伤。"),
    }
    for cid, (name, cost, atk, dfn, rarity, desc) in cards.items():
        wjson(base, "cards/card", f"{cid}.json", {
            "id": f"card_{cid}", "type_id": "type_card", "name": name,
            "values": {"cost": cost, "atk": atk, "def": dfn, "rarity": rarity, "desc": desc},
            "created_at": T, "updated_at": T,
        })

    wjsonl(base, "relations/from", "rels.jsonl", [
        {"id": "rel_e1", "from": "card_fire", "to": "card_golem", "kind": "rel_evolve", "created_at": T},
        {"id": "rel_e2", "from": "card_golem", "to": "card_dragon", "kind": "rel_evolve", "created_at": T},
        {"id": "rel_c1", "from": "card_dragon", "to": "card_golem", "kind": "rel_counter", "created_at": T},
    ])

    wjson(base, "card_groups", "deck_starter.json", {
        "id": "group_starter", "name": "新手牌组",
        "description": "预组的起手牌组。",
        "card_ids": ["card_fire", "card_golem", "card_dragon", "card_heal"],
        "created_at": T, "updated_at": T,
    })


# ══════════════════════════════════════════════════════════════
# 预设 4：世界设定集
# ══════════════════════════════════════════════════════════════
def gen_world():
    base = os.path.join(ROOT, "world")
    wjson(base, "preset.json", {
        "id": "world",
        "label": "世界设定集 · 铁炉编年",
        "description": "纯设定用：概念/阵营/人物/地点/事件 卡类型 + 属于/对立/引发 关系，适合小说与世界观党。",
    })
    wjson(base, "manifest.json", {
        "kind": "anvil-project", "schema_version": "0.4",
        "name": "铁炉编年", "version": "0.1.0",
        "description": "内置预设：世界设定起点。",
        "created_at": T, "updated_at": T,
    })

    wjson(base, "types", "card_types.json", [
        {"id": "type_concept", "name": "概念", "color": "#7f8c8d",
         "created_at": T, "updated_at": T, "fields": [field("desc", "描述", "rich_text")]},
        {"id": "type_faction", "name": "阵营", "color": "#8e44ad",
         "created_at": T, "updated_at": T,
         "fields": [field("creed", "理念", "rich_text"), field("color", "代表色", "color")]},
        {"id": "type_person", "name": "人物", "color": "#d9822b",
         "created_at": T, "updated_at": T,
         "fields": [field("title", "身份", "text"), field("desc", "描述", "rich_text", order=10)]},
        {"id": "type_place", "name": "地点", "color": "#2980b9",
         "created_at": T, "updated_at": T, "fields": [field("desc", "描述", "rich_text")]},
        {"id": "type_event", "name": "事件", "color": "#c0392b",
         "created_at": T, "updated_at": T,
         "fields": [field("when", "时间", "text"), field("desc", "描述", "rich_text", order=10)]},
    ])

    wjson(base, "types", "relation_kinds.json", [
        {"id": "rel_belongs", "name": "属于", "directed": True, "inverse_name": "包含",
         "color": "#2980b9", "created_at": T, "updated_at": T},
        {"id": "rel_oppose", "name": "对立", "directed": False, "color": "#c0392b",
         "created_at": T, "updated_at": T},
        {"id": "rel_cause", "name": "引发", "directed": True, "inverse_name": "源于",
         "color": "#16a085", "created_at": T, "updated_at": T},
    ])

    wjson(base, "cards/concept", "concept_honor.json", {
        "id": "card_concept_honor", "type_id": "type_concept", "name": "荣誉",
        "values": {"desc": "矮人氏族的核心价值：锤不离手，言出必行。"},
        "created_at": T, "updated_at": T,
    })
    wjson(base, "cards/faction", "faction_dwarf.json", {
        "id": "card_faction_dwarf", "type_id": "type_faction", "name": "矮人氏族",
        "values": {"creed": "金子与锤，山即故乡。", "color": "#d9822b"},
        "created_at": T, "updated_at": T,
    })
    wjson(base, "cards/faction", "faction_elf.json", {
        "id": "card_faction_elf", "type_id": "type_faction", "name": "精灵议会",
        "values": {"creed": "长歌与林，岁月为友。", "color": "#27ae60"},
        "created_at": T, "updated_at": T,
    })
    wjson(base, "cards/person", "person_thorin.json", {
        "id": "card_person_thorin", "type_id": "type_person", "name": "索林",
        "values": {"title": "矮人王", "desc": "带领氏族夺回矿镇的国王。"},
        "created_at": T, "updated_at": T,
    })
    wjson(base, "cards/place", "place_ironhall.json", {
        "id": "card_place_ironhall", "type_id": "type_place", "name": "铁炉镇",
        "values": {"desc": "矮人氏族的故乡，以锻造闻名。"},
        "created_at": T, "updated_at": T,
    })
    wjson(base, "cards/event", "event_awaken.json", {
        "id": "card_event_awaken", "type_id": "type_event", "name": "龙醒之年",
        "values": {"when": "第三纪", "desc": "斯毛格占据矿坑，矮人踏上归乡路。"},
        "created_at": T, "updated_at": T,
    })

    wjsonl(base, "relations/from", "rels.jsonl", [
        {"id": "rel_b1", "from": "card_person_thorin", "to": "card_faction_dwarf", "kind": "rel_belongs", "created_at": T},
        {"id": "rel_b2", "from": "card_place_ironhall", "to": "card_faction_dwarf", "kind": "rel_belongs", "created_at": T},
        {"id": "rel_b3", "from": "card_concept_honor", "to": "card_faction_dwarf", "kind": "rel_belongs", "created_at": T},
        {"id": "rel_o1", "from": "card_faction_dwarf", "to": "card_faction_elf", "kind": "rel_oppose", "created_at": T},
        {"id": "rel_c1", "from": "card_event_awaken", "to": "card_person_thorin", "kind": "rel_cause", "created_at": T},
    ])


if __name__ == "__main__":
    gen_ttrpg()
    gen_vn()
    gen_tcg()
    gen_world()
    print("presets generated under", ROOT)
