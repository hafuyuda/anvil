use crate::core::model::card::Card;
use crate::core::model::card_type::{CardType, FieldDef, FieldType};
use crate::core::store::atomic::write_atomic;
use std::collections::BTreeMap;
use std::path::PathBuf;

pub struct Project {
    pub root: PathBuf,
}

impl Project {
    pub fn open(root: impl Into<PathBuf>) -> std::io::Result<Self> {
        let root = root.into();
        std::fs::create_dir_all(root.join("cards"))?;
        std::fs::create_dir_all(root.join(".anvil"))?;
        std::fs::create_dir_all(root.join("types"))?;
        Ok(Self { root })
    }

    pub fn card_path(&self, id: &str) -> PathBuf {
        let prefix = &id[..2.min(id.len())];
        self.root
            .join("cards")
            .join(prefix)
            .join(format!("{id}.json"))
    }

    pub fn save_card(&self, card: &Card) -> anyhow::Result<()> {
        let path = self.card_path(&card.id);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_vec_pretty(card)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn load_card(&self, id: &str) -> anyhow::Result<Card> {
        let path = self.card_path(id);
        let bytes = std::fs::read(&path)?;
        let card: Card = serde_json::from_slice(&bytes)?;
        Ok(card)
    }

    pub fn list_card_ids(&self) -> anyhow::Result<Vec<String>> {
        let cards_dir = self.root.join("cards");
        let mut ids = Vec::new();
        if !cards_dir.exists() {
            return Ok(ids);
        }
        for prefix in std::fs::read_dir(&cards_dir)? {
            let prefix = prefix?;
            if !prefix.file_type()?.is_dir() {
                continue;
            }
            for entry in std::fs::read_dir(prefix.path())? {
                let entry = entry?;
                if let Some(stem) = entry.path().file_stem().and_then(|s| s.to_str()) {
                    ids.push(stem.to_string());
                }
            }
        }
        Ok(ids)
    }

    pub fn load_all_cards(&self) -> anyhow::Result<Vec<Card>> {
        let mut cards = Vec::new();
        for id in self.list_card_ids()? {
            match self.load_card(&id) {
                Ok(c) => cards.push(c),
                Err(e) => eprintln!("load card {id} failed: {e}"),
            }
        }
        Ok(cards)
    }

    pub fn card_types_path(&self) -> PathBuf {
        self.root.join("types").join("card_types.json")
    }

    pub fn load_card_types(&self) -> anyhow::Result<Vec<crate::core::model::card_type::CardType>> {
        let path = self.card_types_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let bytes = std::fs::read(&path)?;
        let types = serde_json::from_slice(&bytes)?;
        Ok(types)
    }

    pub fn save_card_types(
        &self,
        types: &[crate::core::model::card_type::CardType],
    ) -> anyhow::Result<()> {
        let path = self.card_types_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_vec_pretty(types)?;
        write_atomic(&path, &json)?;
        Ok(())
    }
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
                        "依山而建的矮人要塞，炉火终年不熄。城中最大的建筑是中央熔炉，铁匠们在那里日夜锻造。"
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
                    serde_json::json!("须发灰白，右臂上有灼伤旧痕，常穿沾满炉灰的皮革围裙。"),
                ),
                (
                    "personality",
                    serde_json::json!("沉默寡言，但对手艺极为自负。不喜欢讨价还价。"),
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
                    serde_json::json!("短发，手指常被烫出水泡，眼睛很亮。"),
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

        Ok(())
    }
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn fdef(key: &str, label: &str, ty: FieldType, order: i32, required: bool) -> FieldDef {
    FieldDef {
        key: key.into(),
        label: label.into(),
        ty,
        required,
        default: None,
        group: None,
        order,
        deprecated: false,
    }
}

fn values(pairs: &[(&str, serde_json::Value)]) -> BTreeMap<String, serde_json::Value> {
    pairs
        .iter()
        .map(|(k, v)| ((*k).to_string(), v.clone()))
        .collect()
}
