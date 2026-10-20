use super::project::Project;
use crate::core::model::session::{Event, Session, VIS_PUBLIC};
use crate::core::store::atomic::write_atomic;
use std::io::Write;
use std::path::PathBuf;

impl Project {
    pub fn sessions_dir(&self) -> PathBuf {
        self.root.join("sessions")
    }

    pub fn session_dir(&self, id: &str) -> PathBuf {
        self.sessions_dir().join(id)
    }

    pub fn events_path(&self, id: &str) -> PathBuf {
        self.session_dir(id).join("events.jsonl")
    }

    pub fn load_sessions(&self) -> anyhow::Result<Vec<Session>> {
        let dir = self.sessions_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }
            let path = entry.path().join("session.json");
            if !path.exists() {
                continue;
            }
            let bytes = std::fs::read(&path)?;
            match serde_json::from_slice::<Session>(&bytes) {
                Ok(s) => out.push(s),
                Err(e) => eprintln!("session {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_session(&self, session: &Session) -> anyhow::Result<()> {
        let dir = self.session_dir(&session.id);
        std::fs::create_dir_all(&dir)?;
        let path = dir.join("session.json");
        let json = serde_json::to_vec_pretty(session)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_session(&self, id: &str) -> anyhow::Result<()> {
        let dir = self.session_dir(id);
        if dir.exists() {
            std::fs::remove_dir_all(&dir)?;
        }
        Ok(())
    }

    pub fn load_events(&self, session_id: &str) -> anyhow::Result<Vec<Event>> {
        let path = self.events_path(session_id);
        if !path.exists() {
            return Ok(Vec::new());
        }
        let text = std::fs::read_to_string(&path)?;
        let mut out = Vec::new();
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if let Ok(ev) = serde_json::from_str::<Event>(line) {
                out.push(ev);
            }
        }
        Ok(out)
    }

    /// 文件的最后一个字节。文件不存在返回 None。
    fn last_byte(path: &std::path::Path) -> anyhow::Result<Option<u8>> {
        use std::io::{Read, Seek, SeekFrom};
        let Ok(mut f) = std::fs::File::open(path) else {
            return Ok(None);
        };
        let len = f.seek(SeekFrom::End(0))?;
        if len == 0 {
            return Ok(None);
        }
        f.seek(SeekFrom::Start(len - 1))?;
        let mut byte = [0u8; 1];
        f.read_exact(&mut byte)?;
        Ok(Some(byte[0]))
    }

    /// 流尾那条事件的 seq。JSONL 只追加不改写，尾行即最大 seq。
    ///
    /// 追加事件只需要这一个数。此前为了算它把整个文件读进来解析一遍 ——
    /// 长会话里每说一句话就是一次全量读 + 全量解析，累计 O(n²)。
    ///
    /// 尾行解析不了（截断 / 损坏 / 单行超过读取窗口）时退回全量扫描：
    /// 正确性优先于速度。另外 seq 为 0 也退回 —— 正常写入的行 seq 必 ≥ 1。
    fn last_seq(&self, session_id: &str) -> anyhow::Result<u64> {
        use std::io::{Read, Seek, SeekFrom};

        let path = self.events_path(session_id);
        let Ok(meta) = std::fs::metadata(&path) else {
            return Ok(0);
        };
        if meta.len() == 0 {
            return Ok(0);
        }

        // 事件行长度没有上限（payload 里可能嵌整段牌谱）。窗口给 64KB，
        // 正常事件行远小于它；真的超了就走下面的全量扫描。
        const TAIL_WINDOW: u64 = 64 * 1024;
        let mut f = std::fs::File::open(&path)?;
        let start = meta.len().saturating_sub(TAIL_WINDOW);
        f.seek(SeekFrom::Start(start))?;
        let mut buf = Vec::new();
        f.take(TAIL_WINDOW).read_to_end(&mut buf)?;

        // 从文件中段起读，第一行多半是半截的，只要最后一条
        let text = String::from_utf8_lossy(&buf);
        if let Some(line) = text
            .lines()
            .map(str::trim)
            .filter(|l| !l.is_empty())
            .next_back()
        {
            if let Ok(ev) = serde_json::from_str::<Event>(line) {
                if ev.seq > 0 {
                    return Ok(ev.seq);
                }
            }
        }

        Ok(self
            .load_events(session_id)?
            .iter()
            .map(|e| e.seq)
            .max()
            .unwrap_or(0))
    }

    /// 追加一条事件，返回落库的那条（含分配到的 seq）。
    ///
    /// 前端拿到返回值后本地追加即可，不必为了刷新而整表重读。
    pub fn append_event(&self, session_id: &str, mut event: Event) -> anyhow::Result<Event> {
        let dir = self.session_dir(session_id);
        std::fs::create_dir_all(&dir)?;

        let path = self.events_path(session_id);
        let len = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);

        // 尾字节不是换行 → 上次写入崩了一半。先补一个换行，
        // 否则新事件会和那半行粘成同一行，两条都读不回来。
        if len > 0 && Self::last_byte(&path)? != Some(b'\n') {
            let mut f = std::fs::OpenOptions::new().append(true).open(&path)?;
            writeln!(f)?;
        }

        let next_seq = self.last_seq(session_id)? + 1;
        if event.seq == 0 {
            event.seq = next_seq;
        }

        let mut f = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        let line = serde_json::to_string(&event)?;
        writeln!(f, "{line}")?;
        Ok(event)
    }

    /// 揭示一条秘密事件。返回流尾追加的那条公开副本。
    ///
    /// 本体保持 secret 且打上 revealed 标记（KP 视角知道它何时发生过），
    /// 另外在流尾追加一条 public 的 `chat.reveal` 副本 —— 玩家视角只看到副本。
    /// 这样历史只追加不改写，回放时间线才是准确的。
    pub fn reveal_event(&self, session_id: &str, seq: u64) -> anyhow::Result<Event> {
        let mut events = self.load_events(session_id)?;

        let mut snapshot: Option<serde_json::Value> = None;
        let mut origin_at: Option<i64> = None;

        for ev in events.iter_mut() {
            if ev.seq != seq {
                continue;
            }
            if !ev.is_secret() {
                return Err(anyhow::anyhow!("event {seq} is not secret"));
            }
            ev.revealed = true;
            origin_at = Some(ev.at);
            // 副本里带上原始种类与序号，玩家看到的就是一条正常消息
            let mut copy = ev.payload.clone();
            if let Some(obj) = copy.as_object_mut() {
                obj.insert("revealed_kind".into(), serde_json::json!(ev.kind));
                obj.insert("revealed_seq".into(), serde_json::json!(seq));
                obj.insert("revealed_at".into(), serde_json::json!(ev.at));
            }
            snapshot = Some(copy);
            break;
        }

        let payload = snapshot.ok_or_else(|| anyhow::anyhow!("event seq {seq} not found"))?;

        self.save_events(session_id, &events)?;

        let marker = Event {
            seq: 0,
            at: origin_at.unwrap_or(0),
            kind: "chat.reveal".into(),
            payload,
            note: None,
            visibility: Some(VIS_PUBLIC.into()),
            revealed: false,
        };
        let appended = self.append_event(session_id, marker)?;
        Ok(appended)
    }

    pub fn update_event(
        &self,
        session_id: &str,
        seq: u64,
        payload: serde_json::Value,
        note: Option<String>,
    ) -> anyhow::Result<()> {
        let mut events = self.load_events(session_id)?;
        let mut found = false;
        for ev in events.iter_mut() {
            if ev.seq == seq {
                ev.payload = payload.clone();
                ev.note = note.clone();
                found = true;
                break;
            }
        }
        if !found {
            return Err(anyhow::anyhow!("event seq {seq} not found"));
        }
        self.save_events(session_id, &events)?;
        Ok(())
    }

    pub fn delete_event(&self, session_id: &str, seq: u64) -> anyhow::Result<()> {
        let mut events = self.load_events(session_id)?;
        let before = events.len();
        events.retain(|e| e.seq != seq);
        if events.len() == before {
            return Ok(());
        }
        self.save_events(session_id, &events)?;
        Ok(())
    }

    fn save_events(
        &self,
        session_id: &str,
        events: &[crate::core::model::session::Event],
    ) -> anyhow::Result<()> {
        let dir = self.session_dir(session_id);
        std::fs::create_dir_all(&dir)?;
        let path = self.events_path(session_id);
        let mut buf = String::new();
        for ev in events {
            buf.push_str(&serde_json::to_string(ev)?);
            buf.push('\n');
        }
        crate::core::store::atomic::write_atomic(&path, buf.as_bytes())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::model::session::VIS_SECRET;
    use std::collections::BTreeMap;

    fn temp_project() -> (Project, std::path::PathBuf) {
        let dir = std::env::temp_dir().join(format!("anvil_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let project = Project::open(&dir).expect("open temp project");
        (project, dir)
    }

    fn secret_event(at: i64, content: &str) -> Event {
        Event {
            seq: 0,
            at,
            kind: "chat.say".into(),
            payload: serde_json::json!({ "author_name": "KP", "content": content }),
            note: None,
            visibility: Some(VIS_SECRET.into()),
            revealed: false,
        }
    }

    #[test]
    fn reveal_keeps_original_secret_and_appends_public_copy() {
        let (project, dir) = temp_project();
        project.append_event("s1", secret_event(100, "密谋")).unwrap();
        let seq = project.load_events("s1").unwrap()[0].seq;

        project.reveal_event("s1", seq).unwrap();

        let after = project.load_events("s1").unwrap();
        assert_eq!(after.len(), 2, "揭示应追加一条公开副本，而不是改写原事件");

        let original = &after[0];
        assert!(
            original.is_secret(),
            "本体必须仍是秘密，否则玩家视图会同时看到原文和副本两条"
        );
        assert!(original.revealed, "本体应标记已揭示");

        let copy = &after[1];
        assert_eq!(copy.kind, "chat.reveal");
        assert!(!copy.is_secret(), "副本必须公开");
        assert_eq!(copy.payload["content"], "密谋");
        assert_eq!(copy.payload["revealed_seq"], seq);
        assert_eq!(copy.at, 100, "副本沿用原始时间戳，回放时时间线才对");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn reveal_rejects_public_and_missing_events() {
        let (project, dir) = temp_project();
        project
            .append_event(
                "s1",
                Event {
                    seq: 0,
                    at: 1,
                    kind: "chat.say".into(),
                    payload: serde_json::json!({ "content": "公开的话" }),
                    note: None,
                    visibility: Some(VIS_PUBLIC.into()),
                    revealed: false,
                },
            )
            .unwrap();
        let seq = project.load_events("s1").unwrap()[0].seq;

        assert!(
            project.reveal_event("s1", seq).is_err(),
            "公开事件不该能被揭示"
        );
        assert!(
            project.reveal_event("s1", 9999).is_err(),
            "不存在的事件应报错"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn legacy_event_without_visibility_is_public() {
        let (project, dir) = temp_project();
        let dir_path = project.session_dir("s1");
        std::fs::create_dir_all(&dir_path).unwrap();
        std::fs::write(
            dir_path.join("events.jsonl"),
            "{\"seq\":1,\"at\":1,\"kind\":\"chat.say\",\"payload\":{\"content\":\"旧消息\"}}\n",
        )
        .unwrap();

        let events = project.load_events("s1").unwrap();
        assert_eq!(events.len(), 1, "旧格式事件必须仍能读进来");
        assert!(
            !events[0].is_secret(),
            "旧数据没有 visibility 字段，应视为公开 —— 这是向后兼容的关键"
        );
        assert!(!events[0].revealed);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn session_tracker_and_rule_set_roundtrip() {
        use crate::core::model::session::{InitiativeEntry, InitiativeTracker};

        let (project, dir) = temp_project();
        let session = Session {
            id: "s1".into(),
            name: "矮人矿镇".into(),
            board_id: None,
            state: BTreeMap::new(),
            rule_set: Some("coc7".into()),
            tracker: Some(InitiativeTracker {
                round: 3,
                turn_index: 1,
                active: true,
                entries: vec![
                    InitiativeEntry {
                        token_id: Some("t1".into()),
                        card_id: Some("c1".into()),
                        name: "索林".into(),
                        value: 18,
                        is_pc: true,
                    },
                    InitiativeEntry {
                        token_id: Some("t2".into()),
                        card_id: None,
                        name: "哥布林".into(),
                        value: 9,
                        is_pc: false,
                    },
                ],
            }),
            tokens: Vec::new(),
            created_at: 0,
            updated_at: 0,
        };
        project.save_session(&session).unwrap();

        let loaded = project
            .load_sessions()
            .unwrap()
            .into_iter()
            .find(|s| s.id == "s1")
            .expect("会话应能读回");
        assert_eq!(loaded.rule_set.as_deref(), Some("coc7"));
        let tracker = loaded.tracker.expect("先攻追踪应能读回");
        assert_eq!(tracker.round, 3);
        assert_eq!(tracker.turn_index, 1);
        assert!(tracker.active);
        assert_eq!(tracker.entries.len(), 2);
        assert!(tracker.entries[0].is_pc);
        assert!(!tracker.entries[1].is_pc);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn legacy_session_without_new_fields_still_loads() {
        let (project, dir) = temp_project();
        let dir_path = project.session_dir("s1");
        std::fs::create_dir_all(&dir_path).unwrap();
        std::fs::write(
            dir_path.join("session.json"),
            serde_json::to_string(&serde_json::json!({
                "id": "s1",
                "name": "旧会话",
                "state": {},
                "tokens": [],
                "created_at": 0,
                "updated_at": 0
            }))
            .unwrap(),
        )
        .unwrap();

        let loaded = project
            .load_sessions()
            .unwrap()
            .into_iter()
            .find(|s| s.id == "s1")
            .expect("旧会话必须仍能打开");
        assert!(loaded.rule_set.is_none());
        assert!(loaded.tracker.is_none(), "旧会话没有先攻追踪");

        let _ = std::fs::remove_dir_all(&dir);
    }

    fn chat(at: i64, content: &str) -> Event {
        Event {
            seq: 0,
            at,
            kind: "chat.say".into(),
            payload: serde_json::json!({ "author_name": "KP", "content": content }),
            note: None,
            visibility: None,
            revealed: false,
        }
    }

    #[test]
    fn append_event_returns_the_event_with_its_seq() {
        let (project, dir) = temp_project();

        let first = project.append_event("s1", chat(1, "一")).unwrap();
        let second = project.append_event("s1", chat(2, "二")).unwrap();
        assert_eq!(first.seq, 1);
        assert_eq!(second.seq, 2);
        assert_eq!(first.payload["content"], "一", "返回值就是落库那条事件");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn append_seq_comes_from_the_tail_not_from_counting_lines() {
        let (project, dir) = temp_project();
        // 手工写一个「首行 seq 很大」的文件：按行数算会算错，
        // 按尾行算才对得上
        let dir_path = project.session_dir("s1");
        std::fs::create_dir_all(&dir_path).unwrap();
        std::fs::write(
            dir_path.join("events.jsonl"),
            "{\"seq\":7,\"at\":1,\"kind\":\"chat.say\",\"payload\":{}}\n\
             {\"seq\":1,\"at\":2,\"kind\":\"chat.say\",\"payload\":{}}\n",
        )
        .unwrap();

        let ev = project.append_event("s1", chat(3, "三")).unwrap();
        assert_eq!(ev.seq, 2, "尾行 seq 是 1，下一条必须是 2");
        assert_eq!(project.load_events("s1").unwrap().len(), 3);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn append_after_reveal_gets_max_plus_one() {
        let (project, dir) = temp_project();
        // 揭示会整表重写再追加，是最容易让 seq 算错的一条路径
        project.append_event("s1", secret_event(100, "密谋")).unwrap();
        let seq = project.load_events("s1").unwrap()[0].seq;
        let copy = project.reveal_event("s1", seq).unwrap();

        assert_eq!(copy.seq, seq + 1);
        let next = project.append_event("s1", chat(200, "之后")).unwrap();
        assert_eq!(next.seq, seq + 2);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn append_falls_back_to_full_scan_when_tail_line_is_corrupt() {
        let (project, dir) = temp_project();
        let dir_path = project.session_dir("s1");
        std::fs::create_dir_all(&dir_path).unwrap();
        std::fs::write(
            dir_path.join("events.jsonl"),
            "{\"seq\":1,\"at\":1,\"kind\":\"chat.say\",\"payload\":{}}\n\
             {\"seq\":2,\"at\":2,\"kind\":\"chat.say\",\"payload\":{}}\n\
             写崩了的一半",
        )
        .unwrap();

        let ev = project.append_event("s1", chat(3, "三")).unwrap();
        assert_eq!(ev.seq, 3, "尾行解析失败要退回全量扫描，取到最大值 2");
        // 崩掉的那行仍会被 load_events 跳过，不影响既有行为
        assert_eq!(project.load_events("s1").unwrap().len(), 3);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn append_into_empty_and_missing_files_starts_at_one() {
        let (project, dir) = temp_project();
        assert_eq!(
            project.append_event("s1", chat(1, "一")).unwrap().seq,
            1,
            "会话目录还不存在时从 1 开始"
        );

        let dir_path = project.session_dir("s1");
        std::fs::write(dir_path.join("events.jsonl"), "").unwrap();
        assert_eq!(
            project.append_event("s1", chat(2, "二")).unwrap().seq,
            1,
            "空文件同样从 1 开始"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }
}
