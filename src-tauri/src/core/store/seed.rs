use super::project::Project;
use crate::core::model::board::{Board, GridConfig, Token};
use crate::core::model::card::Card;
use crate::core::model::card_type::{CardFrameConfig, CardType, FieldType};
use crate::core::model::helpers::{fdef, values};
use crate::core::model::relation::Relation;
use crate::core::model::relation_kind::RelationKind;
use crate::core::model::scenario::{Scenario, VariableDef};
use crate::core::model::session::{Event, Session};
use crate::core::util::now_ms;
use std::collections::BTreeMap;

impl Project {
    pub fn seed_example_world(&self) -> anyhow::Result<()> {
        let existing_types = self.load_card_types()?;
        let existing_cards = self.load_all_cards()?;
        if !existing_types.is_empty() || !existing_cards.is_empty() {
            return Err(anyhow::anyhow!("项目已有内容，不会覆盖"));
        }

        let now = now_ms();

        // ============================================================
        // 卡牌类型
        // ============================================================

        let npc_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "角色".into(),
            icon: Some("user".into()),
            color: Some("#8b6f47".into()),
            description: Some("世界观中的 NPC 或人物".into()),
            fields: vec![
                fdef("race", "种族", FieldType::Text, 0, false),
                fdef("occupation", "职业", FieldType::Text, 1, false),
                fdef("age", "年龄", FieldType::Number, 2, false),
                fdef("appearance", "外貌", FieldType::RichText, 3, false),
                fdef("personality", "性格", FieldType::RichText, 4, false),
                fdef(
                    "skills",
                    "擅长",
                    FieldType::MultiEnum {
                        options: vec![
                            "锻造".into(),
                            "采矿".into(),
                            "酿酒".into(),
                            "战斗".into(),
                            "吟游".into(),
                            "潜行".into(),
                            "学识".into(),
                            "谈判".into(),
                        ],
                    },
                    5,
                    false,
                ),
                fdef("tags", "标签", FieldType::Tags, 6, false),
                fdef("alive", "存活", FieldType::Bool, 7, false),
                fdef("level", "等级", FieldType::Number, 8, false),
                fdef("atk", "攻击", FieldType::Number, 9, false),
                fdef("def", "防御", FieldType::Number, 10, false),
                fdef("portrait", "画像", FieldType::Image, 11, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: Some(CardFrameConfig {
                style: Some("yugioh".into()),
                title: None,
                subtitle: Some("occupation".into()),
                image: Some("portrait".into()),
                level: Some("level".into()),
                level_label: Some("等级".into()),
                type_line: Some("race".into()),
                body: vec!["personality".into(), "appearance".into()],
                atk: Some("atk".into()),
                atk_label: Some("武力".into()),
                def: Some("def".into()),
                def_label: Some("体质".into()),
                hp: None,
                hp_label: None,
                ..Default::default()
            }),
            created_at: now,
            updated_at: now,
        };

        let location_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "地点".into(),
            icon: Some("map-pin".into()),
            color: Some("#4a7a8c".into()),
            description: Some("城镇、遗迹、房间".into()),
            fields: vec![
                fdef("region", "区域", FieldType::Text, 0, false),
                fdef("description", "描述", FieldType::RichText, 1, false),
                fdef(
                    "danger",
                    "危险等级",
                    FieldType::Enum {
                        options: vec!["安全".into(), "警戒".into(), "危险".into(), "致命".into()],
                    },
                    2,
                    false,
                ),
                fdef("population", "人口", FieldType::Number, 3, false),
                fdef("image", "图像", FieldType::Image, 4, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: None,
            created_at: now,
            updated_at: now,
        };

        let item_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "物品".into(),
            icon: Some("package".into()),
            color: Some("#a05a2c".into()),
            description: Some("武器、工具、宝物".into()),
            fields: vec![
                fdef("material", "材质", FieldType::Text, 0, false),
                fdef("value", "价值", FieldType::Number, 1, false),
                fdef(
                    "rarity",
                    "稀有度",
                    FieldType::Enum {
                        options: vec!["普通".into(), "精良".into(), "稀有".into(), "传说".into()],
                    },
                    2,
                    false,
                ),
                fdef("damage", "伤害", FieldType::Number, 3, false),
                fdef("description", "描述", FieldType::RichText, 4, false),
                fdef("tags", "标签", FieldType::Tags, 5, false),
                fdef("image", "图像", FieldType::Image, 6, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: Some(CardFrameConfig {
                style: Some("yugioh".into()),
                title: None,
                subtitle: Some("material".into()),
                image: Some("image".into()),
                level: None,
                level_label: None,
                type_line: None,
                body: vec!["description".into(), "tags".into()],
                atk: Some("damage".into()),
                atk_label: Some("伤害".into()),
                def: Some("value".into()),
                def_label: Some("价值".into()),
                hp: None,
                hp_label: None,
                foil_field: Some("rarity".into()),
                foil_values: vec!["稀有".into(), "传说".into()],
                ..Default::default()
            }),
            created_at: now,
            updated_at: now,
        };

        let faction_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "组织".into(),
            icon: Some("shield".into()),
            color: Some("#6a4a7a".into()),
            description: Some("行会、议会、家族".into()),
            fields: vec![
                fdef("org_type", "类型", FieldType::Text, 0, false),
                fdef("description", "描述", FieldType::RichText, 1, false),
                fdef("motto", "格言", FieldType::Text, 2, false),
                fdef("member_count", "成员数", FieldType::Number, 3, false),
                fdef("color", "代表色", FieldType::Color, 4, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: None,
            created_at: now,
            updated_at: now,
        };

        let event_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "事件".into(),
            icon: Some("zap".into()),
            color: Some("#c8401f".into()),
            description: Some("历史事件、灾难、庆典".into()),
            fields: vec![
                fdef("date", "日期", FieldType::Text, 0, false),
                fdef("description", "描述", FieldType::RichText, 1, false),
                fdef("significance", "重要性", FieldType::RichText, 2, false),
                fdef("metadata", "附加数据", FieldType::Json, 3, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: None,
            created_at: now,
            updated_at: now,
        };

        // ★ 新增：场景类型
        let scene_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "场景".into(),
            icon: Some("film".into()),
            color: Some("#5a7a5a".into()),
            description: Some(
                "剧情中的一幕。建议把剧情图的节点都用场景卡，而不是角色或地点。".into(),
            ),
            fields: vec![
                fdef("time", "时间", FieldType::Text, 0, false),
                fdef(
                    "location",
                    "地点",
                    FieldType::Ref {
                        target_types: vec![],
                    },
                    1,
                    false,
                ),
                fdef(
                    "participants",
                    "参与者",
                    FieldType::Ref {
                        target_types: vec![],
                    },
                    2,
                    false,
                ),
                fdef(
                    "mood",
                    "氛围",
                    FieldType::Enum {
                        options: vec![
                            "平静".into(),
                            "紧张".into(),
                            "悲伤".into(),
                            "欢快".into(),
                            "神秘".into(),
                            "危险".into(),
                        ],
                    },
                    3,
                    false,
                ),
                fdef("description", "描述", FieldType::RichText, 4, false),
                fdef("dialogue", "对白", FieldType::RichText, 5, false),
                fdef("image", "图像", FieldType::Image, 6, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: None,
            created_at: now,
            updated_at: now,
        };

        self.save_card_types(&[
            npc_type.clone(),
            location_type.clone(),
            item_type.clone(),
            faction_type.clone(),
            event_type.clone(),
            scene_type.clone(),
        ])?;

        // ============================================================
        // 卡片 ID
        // ============================================================

        let anvil_id = uuid::Uuid::new_v4().to_string();
        let furnace_id = uuid::Uuid::new_v4().to_string();
        let tavern_id = uuid::Uuid::new_v4().to_string();
        let mine_id = uuid::Uuid::new_v4().to_string();

        let brokkr_id = uuid::Uuid::new_v4().to_string();
        let gretta_id = uuid::Uuid::new_v4().to_string();
        let dori_id = uuid::Uuid::new_v4().to_string();
        let balin_id = uuid::Uuid::new_v4().to_string();
        let hilda_id = uuid::Uuid::new_v4().to_string();

        let hammer_id = uuid::Uuid::new_v4().to_string();
        let mithril_id = uuid::Uuid::new_v4().to_string();
        let barrel_id = uuid::Uuid::new_v4().to_string();

        let council_id = uuid::Uuid::new_v4().to_string();
        let smiths_id = uuid::Uuid::new_v4().to_string();
        let caravan_id = uuid::Uuid::new_v4().to_string();

        // 四个场景卡 ID
        let scene_smithy_id = uuid::Uuid::new_v4().to_string();
        let scene_tavern_id = uuid::Uuid::new_v4().to_string();
        let scene_mine_id = uuid::Uuid::new_v4().to_string();
        let scene_dawn_id = uuid::Uuid::new_v4().to_string();

        let cards: Vec<Card> = vec![
            // ── 地点 ──────────────────────────────────────────────
            Card {
                id: anvil_id.clone(),
                type_id: location_type.id.clone(),
                name: "铁砧堡".into(),
                values: values(&[
                    ("region", serde_json::json!("北境山脉")),
                    ("description", serde_json::json!("依山而建的矮人要塞，炉火终年不熄。城中最大的建筑是中央熔炉，铁匠们在那里日夜锻造。")),
                    ("danger", serde_json::json!("安全")),
                    ("population", serde_json::json!(2400)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: furnace_id.clone(),
                type_id: location_type.id.clone(),
                name: "中央熔炉".into(),
                values: values(&[
                    ("region", serde_json::json!("铁砧堡")),
                    ("description", serde_json::json!("城中最大的建筑，炉火三百年不熄。据说熔炉的核心是一块从天而降的星铁。")),
                    ("danger", serde_json::json!("警戒")),
                    ("population", serde_json::json!(0)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: tavern_id.clone(),
                type_id: location_type.id.clone(),
                name: "打嗝山羊酒馆".into(),
                values: values(&[
                    ("region", serde_json::json!("铁砧堡")),
                    ("description", serde_json::json!("铁砧堡最有名的酒馆。招牌上画着一只打嗝的山羊。二楼的赌桌永远有人。")),
                    ("danger", serde_json::json!("安全")),
                    ("population", serde_json::json!(40)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: mine_id.clone(),
                type_id: location_type.id.clone(),
                name: "深铁矿洞".into(),
                values: values(&[
                    ("region", serde_json::json!("铁砧堡 · 西侧")),
                    ("description", serde_json::json!("铁砧堡的西矿脉，已开采四百年。最近几周矿工失踪了三个。")),
                    ("danger", serde_json::json!("危险")),
                    ("population", serde_json::json!(60)),
                ]),
                created_at: now,
                updated_at: now,
            },
            // ── 角色 ──────────────────────────────────────────────
            Card {
                id: brokkr_id.clone(),
                type_id: npc_type.id.clone(),
                name: "铁匠布洛克".into(),
                values: values(&[
                    ("race", serde_json::json!("矮人")),
                    ("occupation", serde_json::json!("铁匠铺主人")),
                    ("age", serde_json::json!(163)),
                    ("appearance", serde_json::json!("须发灰白，右臂上有灼伤旧痕，常穿沾满炉灰的皮革围裙。胡子编成三股，尾端各系一个小铁环。")),
                    ("personality", serde_json::json!("沉默寡言，但对手艺极为自负。认为所有问题都能用锤子解决，如果解决不了，那是锤子不够大。")),
                    ("skills", serde_json::json!(["锻造", "采矿", "学识"])),
                    ("tags", serde_json::json!(["铁匠", "长老", "固执"])),
                    ("alive", serde_json::json!(true)),
                    ("level", serde_json::json!(7)),
                    ("atk", serde_json::json!(12)),
                    ("def", serde_json::json!(14)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: gretta_id.clone(),
                type_id: npc_type.id.clone(),
                name: "学徒格蕾塔".into(),
                values: values(&[
                    ("race", serde_json::json!("人类")),
                    ("occupation", serde_json::json!("布洛克的学徒")),
                    ("age", serde_json::json!(19)),
                    ("appearance", serde_json::json!("短发，手指常被烫出水泡，眼睛很亮。")),
                    ("personality", serde_json::json!("好奇，话多，总想打听外来者的事。能用三种方言骂人。")),
                    ("skills", serde_json::json!(["锻造", "学识", "潜行"])),
                    ("tags", serde_json::json!(["学徒", "机灵"])),
                    ("alive", serde_json::json!(true)),
                    ("level", serde_json::json!(3)),
                    ("atk", serde_json::json!(6)),
                    ("def", serde_json::json!(5)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: dori_id.clone(),
                type_id: npc_type.id.clone(),
                name: "酿酒师多林".into(),
                values: values(&[
                    ("race", serde_json::json!("矮人")),
                    ("occupation", serde_json::json!("打嗝山羊酒馆老板")),
                    ("age", serde_json::json!(98)),
                    ("appearance", serde_json::json!("红脸，肚子比酒桶还圆。胡子很短——他说是酒渍烧的。")),
                    ("personality", serde_json::json!("热心，嗓门大，认识铁砧堡每一个人。认为酒是液体化的誓言。")),
                    ("skills", serde_json::json!(["酿酒", "谈判", "吟游"])),
                    ("tags", serde_json::json!(["商人", "酿酒"])),
                    ("alive", serde_json::json!(true)),
                    ("level", serde_json::json!(4)),
                    ("atk", serde_json::json!(8)),
                    ("def", serde_json::json!(7)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: balin_id.clone(),
                type_id: npc_type.id.clone(),
                name: "矿工头巴尔林".into(),
                values: values(&[
                    ("race", serde_json::json!("矮人")),
                    ("occupation", serde_json::json!("深铁矿洞工头")),
                    ("age", serde_json::json!(145)),
                    ("appearance", serde_json::json!("灰发，脸上有石尘。走路总低头，像在看脚下的岩层。")),
                    ("personality", serde_json::json!("务实，沉默，比布洛克还少话。深信石头在唱歌。")),
                    ("skills", serde_json::json!(["采矿", "战斗"])),
                    ("tags", serde_json::json!(["矿工", "迷信"])),
                    ("alive", serde_json::json!(true)),
                    ("level", serde_json::json!(5)),
                    ("atk", serde_json::json!(10)),
                    ("def", serde_json::json!(12)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: hilda_id.clone(),
                type_id: npc_type.id.clone(),
                name: "商队头目希尔达".into(),
                values: values(&[
                    ("race", serde_json::json!("矮人")),
                    ("occupation", serde_json::json!("商队联盟首领")),
                    ("age", serde_json::json!(78)),
                    ("appearance", serde_json::json!("穿皮甲，头发用铜环束起。")),
                    ("personality", serde_json::json!("精明，果断，账目算得比谁都清。")),
                    ("skills", serde_json::json!(["谈判", "战斗", "学识"])),
                    ("tags", serde_json::json!(["商人", "领袖"])),
                    ("alive", serde_json::json!(true)),
                    ("level", serde_json::json!(6)),
                    ("atk", serde_json::json!(11)),
                    ("def", serde_json::json!(9)),
                ]),
                created_at: now,
                updated_at: now,
            },
            // ── 物品 ──────────────────────────────────────────────
            Card {
                id: hammer_id.clone(),
                type_id: item_type.id.clone(),
                name: "熔炉之锤".into(),
                values: values(&[
                    ("material", serde_json::json!("星铁 + 古橡木")),
                    ("value", serde_json::json!(1200)),
                    ("rarity", serde_json::json!("稀有")),
                    ("damage", serde_json::json!(18)),
                    ("description", serde_json::json!("布洛克的传家宝，据说锤头的星铁来自坠落的陨石。")),
                    ("tags", serde_json::json!(["传家宝", "锻造", "稀有"])),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: mithril_id.clone(),
                type_id: item_type.id.clone(),
                name: "密银矿样".into(),
                values: values(&[
                    ("material", serde_json::json!("密银原矿")),
                    ("value", serde_json::json!(800)),
                    ("rarity", serde_json::json!("稀有")),
                    ("description", serde_json::json!("一块巴掌大的密银原矿，是深铁矿洞第三层挖出的。")),
                    ("tags", serde_json::json!(["矿物", "稀有"])),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: barrel_id.clone(),
                type_id: item_type.id.clone(),
                name: "「永不醉」酒桶".into(),
                values: values(&[
                    ("material", serde_json::json!("古橡木 + 铁箍")),
                    ("value", serde_json::json!(500)),
                    ("rarity", serde_json::json!("精良")),
                    ("description", serde_json::json!("多林的招牌酒。据说喝完整桶的人会说出所有真心话。")),
                    ("tags", serde_json::json!(["酒", "魔法"])),
                ]),
                created_at: now,
                updated_at: now,
            },
            // ── 组织 ──────────────────────────────────────────────
            Card {
                id: council_id.clone(),
                type_id: faction_type.id.clone(),
                name: "铁砧堡议会".into(),
                values: values(&[
                    ("org_type", serde_json::json!("长老会")),
                    ("description", serde_json::json!("铁砧堡最高决策机构，由七位长老组成。")),
                    ("motto", serde_json::json!("锤落无声，誓出必行。")),
                    ("member_count", serde_json::json!(7)),
                    ("color", serde_json::json!("#c9a961")),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: smiths_id.clone(),
                type_id: faction_type.id.clone(),
                name: "铁匠行会".into(),
                values: values(&[
                    ("org_type", serde_json::json!("行会")),
                    ("description", serde_json::json!("所有在铁砧堡经营铁匠铺的矮人都必须入会。")),
                    ("motto", serde_json::json!("一锤定音。")),
                    ("member_count", serde_json::json!(86)),
                    ("color", serde_json::json!("#a05a2c")),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: caravan_id.clone(),
                type_id: faction_type.id.clone(),
                name: "商队联盟".into(),
                values: values(&[
                    ("org_type", serde_json::json!("商业联盟")),
                    ("description", serde_json::json!("连接铁砧堡与外界的三支商队联合而成。")),
                    ("motto", serde_json::json!("车过留痕，账过留心。")),
                    ("member_count", serde_json::json!(52)),
                    ("color", serde_json::json!("#7a8590")),
                ]),
                created_at: now,
                updated_at: now,
            },
            // ── 场景 ──────────────────────────────────────────────
            Card {
                id: scene_smithy_id.clone(),
                type_id: scene_type.id.clone(),
                name: "铁匠铺 · 黄昏".into(),
                values: values(&[
                    ("time", serde_json::json!("黄昏")),
                    ("location", serde_json::json!(anvil_id.clone())),
                    ("participants", serde_json::json!([brokkr_id.clone(), gretta_id.clone()])),
                    ("mood", serde_json::json!("平静")),
                    ("description", serde_json::json!("炉火正旺。布洛克在砧前锻打一块铁，格蕾塔在一旁扫炉灰。你推门进来，带进一阵冷风。")),
                    ("dialogue", serde_json::json!(
"布洛克：坐吧，旅人。你说你想听点真东西？

布洛克：我认识一个矮人，他能从一块铁里看出三百年的天气。他说，今年冬天会很冷——因为铁在炉里哭了。

格蕾塔：师傅，那只是矿石里的水汽……

布洛克：闭嘴，丫头。你没听见铁哭，是因为你还不够老。"
                    )),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: scene_tavern_id.clone(),
                type_id: scene_type.id.clone(),
                name: "打嗝山羊 · 入夜".into(),
                values: values(&[
                    ("time", serde_json::json!("入夜")),
                    ("location", serde_json::json!(tavern_id.clone())),
                    ("participants", serde_json::json!([dori_id.clone()])),
                    ("mood", serde_json::json!("欢快")),
                    ("description", serde_json::json!("酒馆里坐满了人。多林正在擦一只大酒杯，见你进来，往桌上放了一桶酒。")),
                    ("dialogue", serde_json::json!(
"多林：再不来，酒就凉了！凉了的酒，是对祖先的侮辱。

多林：五个金币，我告诉你一件矿洞里的事。是三个矿工失踪那件。

（你把金币放在桌上。多林压低声音。）

多林：他们不是被塌方埋的。是有人——或者说，有东西——带走了他们。"
                    )),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: scene_mine_id.clone(),
                type_id: scene_type.id.clone(),
                name: "深铁矿洞 · 深夜".into(),
                values: values(&[
                    ("time", serde_json::json!("深夜")),
                    ("location", serde_json::json!(mine_id.clone())),
                    ("participants", serde_json::json!([balin_id.clone()])),
                    ("mood", serde_json::json!("危险")),
                    ("description", serde_json::json!("矿道深不见底，风从深处吹来，带着一股说不清的味道。巴尔林提着一盏灯，走在前面。")),
                    ("dialogue", serde_json::json!(
"巴尔林：别出声。

（远处传来一声石头碎裂的声音。）

巴尔林：听见了吗？

巴尔林：石头在唱歌。唱的是——有东西来了。"
                    )),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: scene_dawn_id.clone(),
                type_id: scene_type.id.clone(),
                name: "铁砧堡 · 破晓".into(),
                values: values(&[
                    ("time", serde_json::json!("破晓")),
                    ("location", serde_json::json!(anvil_id.clone())),
                    ("participants", serde_json::json!([brokkr_id.clone(), gretta_id.clone()])),
                    ("mood", serde_json::json!("平静")),
                    ("description", serde_json::json!("你从矿洞回来。布洛克站在铁匠铺门口，望着东方的天光。格蕾塔已经从矿洞里被救出来了，正在里屋休息。")),
                    ("dialogue", serde_json::json!(
"布洛克：回来了。

布洛克：丫头睡下了。她说明天想跟你走。

（他沉默了一会儿。）

布洛克：我说不行。矮人的学徒，不该跟着外人乱跑。

（他又沉默了一会儿。）

布洛克：……她说，我拦不住她。这一点，她说得对。"
                    )),
                ]),
                created_at: now,
                updated_at: now,
            },
        ];

        for c in &cards {
            self.save_card(c)?;
        }

        // ============================================================
        // 关系类型
        // ============================================================

        let located_in = RelationKind {
            id: "located_in".into(),
            name: "位于".into(),
            inverse_name: Some("包含".into()),
            directed: true,
            color: Some("#4a7a8c".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };
        let apprentice_of = RelationKind {
            id: "apprentice_of".into(),
            name: "学徒于".into(),
            inverse_name: Some("师傅是".into()),
            directed: true,
            color: Some("#8b6f47".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };
        let owns = RelationKind {
            id: "owns".into(),
            name: "持有".into(),
            inverse_name: Some("被持有".into()),
            directed: true,
            color: Some("#a05a2c".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };
        let member_of = RelationKind {
            id: "member_of".into(),
            name: "成员于".into(),
            inverse_name: Some("成员有".into()),
            directed: true,
            color: Some("#6a4a7a".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };
        let knows = RelationKind {
            id: "knows".into(),
            name: "认识".into(),
            inverse_name: Some("认识".into()),
            directed: false,
            color: Some("#7a8590".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };

        self.save_relation_kinds(&[located_in, apprentice_of, owns, member_of, knows])?;

        // ============================================================
        // 世界观关系
        // ============================================================

        let world_rels = vec![
            (brokkr_id.clone(), anvil_id.clone(), "located_in", None),
            (gretta_id.clone(), anvil_id.clone(), "located_in", None),
            (dori_id.clone(), tavern_id.clone(), "located_in", None),
            (balin_id.clone(), mine_id.clone(), "located_in", None),
            (furnace_id.clone(), anvil_id.clone(), "located_in", None),
            (tavern_id.clone(), anvil_id.clone(), "located_in", None),
            (mine_id.clone(), anvil_id.clone(), "located_in", None),
            (gretta_id.clone(), brokkr_id.clone(), "apprentice_of", None),
            (brokkr_id.clone(), hammer_id.clone(), "owns", None),
            (brokkr_id.clone(), smiths_id.clone(), "member_of", None),
            (
                hilda_id.clone(),
                caravan_id.clone(),
                "member_of",
                Some("首领"),
            ),
            (brokkr_id.clone(), dori_id.clone(), "knows", None),
            (brokkr_id.clone(), balin_id.clone(), "knows", None),
            (hilda_id.clone(), dori_id.clone(), "knows", None),
        ];

        let mut by_from: BTreeMap<String, Vec<Relation>> = BTreeMap::new();
        for (from, to, kind, label) in world_rels {
            let rel = Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: from.clone(),
                to,
                kind: kind.into(),
                label: label.map(|s| s.to_string()),
                meta: BTreeMap::new(),
                created_at: now,
            };
            by_from.entry(from).or_default().push(rel);
        }
        for (from, list) in by_from {
            self.save_relations_from(&from, &list)?;
        }

        // ============================================================
        // 剧情：从场景出发
        // ============================================================

        let scenario_id = uuid::Uuid::new_v4().to_string();
        let scenario = Scenario {
            id: scenario_id.clone(),
            name: "失踪的学徒".into(),
            description: Some("格蕾塔在深铁矿洞失踪了。从铁匠铺的黄昏开始，到破晓结束。".into()),
            entry_node: Some(scene_smithy_id.clone()),
            node_ids: vec![
                scene_smithy_id.clone(),
                scene_tavern_id.clone(),
                scene_mine_id.clone(),
                scene_dawn_id.clone(),
            ],
            edge_kinds: vec!["located_in".into(), "knows".into()],
            node_positions: {
                let mut m = BTreeMap::new();
                m.insert(scene_smithy_id.clone(), [0.0, -160.0]);
                m.insert(scene_tavern_id.clone(), [260.0, 0.0]);
                m.insert(scene_mine_id.clone(), [0.0, 200.0]);
                m.insert(scene_dawn_id.clone(), [-260.0, 0.0]);
                m
            },
            variables: vec![
                VariableDef {
                    key: "visited_tavern".into(),
                    label: "已去过酒馆".into(),
                    ty: FieldType::Bool,
                    default: Some(serde_json::json!(false)),
                },
                VariableDef {
                    key: "gold".into(),
                    label: "金币".into(),
                    ty: FieldType::Number,
                    default: Some(serde_json::json!(20)),
                },
                VariableDef {
                    key: "trusts_brokkr".into(),
                    label: "布洛克的信任".into(),
                    ty: FieldType::Bool,
                    default: Some(serde_json::json!(false)),
                },
            ],
            created_at: now,
            updated_at: now,
        };
        self.save_scenario(&scenario)?;

        // 剧情边：场景 → 场景
        let scenario_rels: Vec<(String, String, &str, &str, &str, Vec<&str>)> = vec![
            (
                scene_smithy_id.clone(),
                scene_tavern_id.clone(),
                "located_in",
                "去酒馆打听",
                "gold >= 5",
                vec!["gold -= 5", "visited_tavern = true"],
            ),
            (
                scene_tavern_id.clone(),
                scene_mine_id.clone(),
                "located_in",
                "追查矿洞",
                "visited_tavern == true",
                vec!["trusts_brokkr = true"],
            ),
            (
                scene_mine_id.clone(),
                scene_dawn_id.clone(),
                "located_in",
                "带着消息返回",
                "trusts_brokkr == true",
                vec![],
            ),
            (
                scene_mine_id.clone(),
                scene_dawn_id.clone(),
                "located_in",
                "独自返回",
                "",
                vec!["trusts_brokkr = false"],
            ),
        ];

        let mut by_from_s: BTreeMap<String, Vec<Relation>> = BTreeMap::new();
        for (from, to, kind, label, condition, effects) in scenario_rels {
            let mut meta = BTreeMap::new();
            meta.insert(
                "scenario_id".to_string(),
                serde_json::json!(scenario_id.clone()),
            );
            meta.insert("condition".to_string(), serde_json::json!(condition));
            meta.insert("effects".to_string(), serde_json::json!(effects));

            let rel = Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: from.clone(),
                to,
                kind: kind.into(),
                label: Some(label.into()),
                meta,
                created_at: now,
            };
            by_from_s.entry(from).or_default().push(rel);
        }

        for (from, list) in by_from_s {
            let mut existing = self.load_relations_from(&from)?;
            existing.extend(list);
            self.save_relations_from(&from, &existing)?;
        }

        // ============================================================
        // 棋盘
        // ============================================================

        let board_id = uuid::Uuid::new_v4().to_string();
        let board = Board {
            id: board_id.clone(),
            name: "铁砧堡广场".into(),
            width: 1200.0,
            height: 800.0,
            grid: GridConfig {
                size: 50.0,
                offset_x: 0.0,
                offset_y: 0.0,
                visible: true,
                snap: true,
            },
            background: None,
            tokens: vec![
                Token {
                    id: uuid::Uuid::new_v4().to_string(),
                    card_id: Some(brokkr_id.clone()),
                    name_override: None,
                    value_overrides: BTreeMap::new(),
                    x: 150.0,
                    y: 150.0,
                    w: Some(140.0),
                    h: Some(205.0),
                    rotation: 0.0,
                    layer: 0,
                    visible: true,
                },
                Token {
                    id: uuid::Uuid::new_v4().to_string(),
                    card_id: Some(gretta_id.clone()),
                    name_override: None,
                    value_overrides: BTreeMap::new(),
                    x: 350.0,
                    y: 200.0,
                    w: Some(140.0),
                    h: Some(205.0),
                    rotation: 0.0,
                    layer: 1,
                    visible: true,
                },
                Token {
                    id: uuid::Uuid::new_v4().to_string(),
                    card_id: Some(dori_id.clone()),
                    name_override: None,
                    value_overrides: BTreeMap::new(),
                    x: 550.0,
                    y: 150.0,
                    w: Some(140.0),
                    h: Some(205.0),
                    rotation: 0.0,
                    layer: 2,
                    visible: true,
                },
            ],
            created_at: now,
            updated_at: now,
        };
        self.save_board(&board)?;

        // ============================================================
        // 会话
        // ============================================================

        let session_id = uuid::Uuid::new_v4().to_string();

        let session_tokens: Vec<Token> = board
            .tokens
            .iter()
            .map(|t| {
                let mut nt = t.clone();
                nt.id = uuid::Uuid::new_v4().to_string();
                nt
            })
            .collect();

        let session = Session {
            id: session_id.clone(),
            name: "炉边夜话".into(),
            board_id: Some(board_id.clone()),
            state: {
                let mut m = BTreeMap::new();
                m.insert("visited_tavern".into(), serde_json::json!(true));
                m.insert("gold".into(), serde_json::json!(20));
                m
            },
            tokens: session_tokens,
            created_at: now,
            updated_at: now,
        };
        self.save_session(&session)?;

        let messages: Vec<(&str, serde_json::Value)> = vec![
            (
                "chat.narration",
                serde_json::json!({
                    "content": "炉火在中央熔炉里噼啪作响。铁砧堡的夜晚，是铁锈与麦酒的味道。"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "坐吧，旅人。你说你想听点真东西？"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "我认识一个矮人，他能从一块铁里看出三百年的天气。他说，今年冬天会很冷——因为铁在炉里哭了。"
                }),
            ),
            (
                "chat.ooc",
                serde_json::json!({
                    "author_card_id": gretta_id.clone(),
                    "author_name": "格蕾塔",
                    "content": "师傅，那只是矿石里的水汽……"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "闭嘴，丫头。你没听见铁哭，是因为你还不够老。"
                }),
            ),
            (
                "chat.roll",
                serde_json::json!({
                    "author_card_id": gretta_id.clone(),
                    "author_name": "格蕾塔",
                    "content": "洞察",
                    "roll": { "expr": "1d20", "result": 17, "detail": [17] }
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": gretta_id.clone(),
                    "author_name": "格蕾塔",
                    "content": "我洞察到……师傅你只是不想承认你也冷。"
                }),
            ),
            (
                "chat.action",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "举起锤子，作势要敲，但停住了。"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "哼。这丫头的嘴，比精灵的弓还快。"
                }),
            ),
            (
                "chat.narration",
                serde_json::json!({
                    "content": "打嗝山羊酒馆传来喧哗，有人在唱一首关于金子、胡子和啤酒的老歌。"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": dori_id.clone(),
                    "author_name": "多林",
                    "content": "（远处喊）布洛克！再不来，酒就凉了！凉了的酒，是对祖先的侮辱！"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "听见了吗？这才是真正的矮人笑话——酒会凉。"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": gretta_id.clone(),
                    "author_name": "格蕾塔",
                    "content": "师傅，矮人笑话都这么冷吗？"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "冷？你听这个。三个矮人进酒馆，出来的时候是四个。多出来的那个是账单。"
                }),
            ),
            (
                "chat.roll",
                serde_json::json!({
                    "author_card_id": gretta_id.clone(),
                    "author_name": "格蕾塔",
                    "content": "敏捷闪避",
                    "roll": { "expr": "1d20+2", "result": 15, "detail": [13] }
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": gretta_id.clone(),
                    "author_name": "格蕾塔",
                    "content": "我躲开了他的锤子。也躲开了笑话的余波。"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "下次你躲不开。矮人的誓言像他的锤子一样重——问题是，锤子常常砸到自己脚上。"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": gretta_id.clone(),
                    "author_name": "格蕾塔",
                    "content": "那师傅你脚上的伤，是誓言砸的还是自己砸的？"
                }),
            ),
            (
                "chat.action",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "沉默。炉火噼啪响了一声。"
                }),
            ),
            (
                "chat.say",
                serde_json::json!({
                    "author_card_id": brokkr_id.clone(),
                    "author_name": "布洛克",
                    "content": "……丫头，明天开始你负责扫炉灰。"
                }),
            ),
            (
                "chat.narration",
                serde_json::json!({
                    "content": "门外风雪渐起，深铁矿洞的方向传来一声低沉的轰响。"
                }),
            ),
            (
                "chat.narration",
                serde_json::json!({
                    "content": "那不是雷声。"
                }),
            ),
            ("session.end", serde_json::json!({})),
        ];

        for (kind, payload) in messages {
            let ev = Event {
                seq: 0,
                at: now,
                kind: kind.into(),
                payload,
                note: None,
            };
            self.append_event(&session_id, ev)?;
        }

        Ok(())
    }
}
