use super::project::Project;
use crate::core::model::card::Card;
use crate::core::model::card_type::{CardType, FieldType};
use crate::core::model::helpers::{fdef, values};
use crate::core::model::relation::Relation;
use crate::core::model::relation_kind::RelationKind;
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

        let npc_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "角色".into(),
            icon: Some("user".into()),
            color: Some("#8b6f47".into()),
            description: Some("世界观中的 NPC 或人物".into()),
            fields: vec![
                fdef("race", "种族", FieldType::Text, 0, false),
                fdef("occupation", "职业", FieldType::Text, 1, false),
                fdef("appearance", "外貌", FieldType::RichText, 2, false),
                fdef("personality", "性格", FieldType::RichText, 3, false),
                fdef("alive", "存活", FieldType::Bool, 4, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: None,
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
                fdef("description", "描述", FieldType::RichText, 2, false),
                fdef("tags", "标签", FieldType::Tags, 3, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: Some(crate::core::model::card_type::CardFrameConfig {
                style: Some("yugioh".into()),
                title: None,
                subtitle: Some("material".into()),
                image: None,
                level: None,
                type_line: None,
                body: vec!["description".into(), "tags".into()],
                atk: Some("value".into()),
                def: None,
                hp: None,
            }),
            created_at: now,
            updated_at: now,
        };

        let npc_id = npc_type.id.clone();
        let location_id = location_type.id.clone();
        let item_id = item_type.id.clone();

        self.save_card_types(&[npc_type, location_type, item_type])?;

        let cards = vec![
            Card {
                id: uuid::Uuid::new_v4().to_string(),
                type_id: location_id.clone(),
                name: "铁砧堡".into(),
                values: values(&[
                    ("region", serde_json::json!("北境山脉")),
                    (
                        "description",
                        serde_json::json!(
                            "依山而建的矮人要塞，炉火终年不熄。城中最大的建筑是中央熔炉，铁匠们在那里日夜锻造。城中最热闹的建筑是酒馆，外来者天天在那里讲矮人笑话。"
                        ),
                    ),
                    ("danger", serde_json::json!("安全")),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: uuid::Uuid::new_v4().to_string(),
                type_id: npc_id.clone(),
                name: "铁匠布洛克".into(),
                values: values(&[
                    ("race", serde_json::json!("矮人")),
                    ("occupation", serde_json::json!("铁匠铺主人")),
                    (
                        "appearance",
                        serde_json::json!(
                            "须发灰白，右臂上有灼伤旧痕，常穿沾满炉灰的皮革围裙。"
                        ),
                    ),
                    (
                        "personality",
                        serde_json::json!("沉默寡言，但对手艺极为自负。不喜欢讨价还价。听到矮人故事会跳起来踢人膝盖。"),
                    ),
                    ("alive", serde_json::json!(true)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: uuid::Uuid::new_v4().to_string(),
                type_id: npc_id.clone(),
                name: "学徒格蕾塔".into(),
                values: values(&[
                    ("race", serde_json::json!("人类")),
                    ("occupation", serde_json::json!("布洛克的学徒")),
                    (
                        "appearance",
                        serde_json::json!("短发，手指常被烫出水泡，眼睛很亮。经常背着师父到酒馆讲矮人笑话。"),
                    ),
                    (
                        "personality",
                        serde_json::json!("好奇，话多，总想打听外来者的事。"),
                    ),
                    ("alive", serde_json::json!(true)),
                ]),
                created_at: now,
                updated_at: now,
            },
            Card {
                id: uuid::Uuid::new_v4().to_string(),
                type_id: item_id.clone(),
                name: "熔炉之锤".into(),
                values: values(&[
                    ("material", serde_json::json!("星铁 + 古橡木")),
                    ("value", serde_json::json!(1200)),
                    (
                        "description",
                        serde_json::json!(
                            "布洛克的传家宝，据说锤头的星铁来自坠落的陨石。锻造时锤面会泛起暗红微光。"
                        ),
                    ),
                    ("tags", serde_json::json!(["传家宝", "锻造", "稀有"])),
                ]),
                created_at: now,
                updated_at: now,
            },
        ];

        for c in &cards {
            self.save_card(c)?;
        }

        // 示例关系类型
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

        self.save_relation_kinds(&[located_in, apprentice_of, owns])?;

        // 示例关系
        let brokkr = cards.iter().find(|c| c.name == "铁匠布洛克").unwrap();
        let gretta = cards.iter().find(|c| c.name == "学徒格蕾塔").unwrap();
        let anvil = cards.iter().find(|c| c.name == "铁砧堡").unwrap();
        let hammer = cards.iter().find(|c| c.name == "熔炉之锤").unwrap();

        let rels = vec![
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: brokkr.id.clone(),
                to: anvil.id.clone(),
                kind: "located_in".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: gretta.id.clone(),
                to: anvil.id.clone(),
                kind: "located_in".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: gretta.id.clone(),
                to: brokkr.id.clone(),
                kind: "apprentice_of".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: brokkr.id.clone(),
                to: hammer.id.clone(),
                kind: "owns".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
        ];

        let mut by_from: BTreeMap<String, Vec<Relation>> = BTreeMap::new();
        for r in rels {
            by_from.entry(r.from.clone()).or_default().push(r);
        }
        for (from, list) in by_from {
            self.save_relations_from(&from, &list)?;
        }

        Ok(())
    }
}
