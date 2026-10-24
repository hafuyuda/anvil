use super::project::Project;
use crate::core::model::board::{Board, BoardExport};
use crate::core::model::session::Event;
use crate::core::store::atomic::write_atomic;
use std::collections::HashSet;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

impl Project {
    pub fn boards_dir(&self) -> PathBuf {
        self.root.join("boards")
    }

    pub fn board_path(&self, id: &str) -> PathBuf {
        self.boards_dir().join(format!("{id}.json"))
    }

    /// 棋盘事件目录。棋盘本体是 boards/<id>.json，
    /// 落子历史单独放在 boards/<id>/events.jsonl，与会话的事件目录结构一致。
    pub fn board_events_dir(&self, id: &str) -> PathBuf {
        self.boards_dir().join(id)
    }

    pub fn board_events_path(&self, id: &str) -> PathBuf {
        self.board_events_dir(id).join("events.jsonl")
    }

    pub fn load_boards(&self) -> anyhow::Result<Vec<Board>> {
        let dir = self.boards_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let bytes = std::fs::read(&path)?;
            match serde_json::from_slice::<Board>(&bytes) {
                Ok(b) => out.push(b),
                Err(e) => eprintln!("board {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_board(&self, board: &Board) -> anyhow::Result<()> {
        std::fs::create_dir_all(self.boards_dir())?;
        let path = self.board_path(&board.id);
        let json = serde_json::to_vec_pretty(board)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_board(&self, id: &str) -> anyhow::Result<()> {
        // 先解绑以它为战场的会话，否则会话会指向一个不存在的棋盘
        self.purge_board_refs(id)?;
        let path = self.board_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        // 落子历史跟着棋盘一起走，否则会留下读不到的孤儿事件文件
        let events_dir = self.board_events_dir(id);
        if events_dir.exists() {
            std::fs::remove_dir_all(&events_dir)?;
        }
        Ok(())
    }

    // ── 单个棋盘的导出 / 导入 ──

    /// 导出一个棋盘（含落子历史）到 JSON 文件。
    pub fn export_board(&self, id: &str, output_path: &Path) -> anyhow::Result<()> {
        let board = self
            .load_boards()?
            .into_iter()
            .find(|b| b.id == id)
            .ok_or_else(|| anyhow::anyhow!("棋盘 {id} 不存在"))?;

        let payload = BoardExport {
            kind: "anvil-board".into(),
            schema_version: crate::core::model::manifest::CURRENT_SCHEMA_VERSION.into(),
            exported_at: crate::core::util::now_ms(),
            board,
            events: self.load_board_events(id)?,
        };

        let json = serde_json::to_vec_pretty(&payload)?;
        write_atomic(output_path, &json)?;
        Ok(())
    }

    /// 从导出的 JSON 文件导入棋盘，返回落库后的棋盘（id 可能被重发）。
    ///
    /// id 撞车就换一个新的 —— 导入不该覆盖既有棋盘。
    pub fn import_board(&self, input_path: &Path) -> anyhow::Result<Board> {
        let bytes = std::fs::read(input_path)?;
        let payload: BoardExport = serde_json::from_slice(&bytes)
            .map_err(|_| anyhow::anyhow!("读不出棋盘数据，可能不是 Anvil 棋盘文件"))?;
        if payload.kind != "anvil-board" {
            return Err(anyhow::anyhow!("不是 Anvil 棋盘文件"));
        }
        if payload.schema_version != crate::core::model::manifest::CURRENT_SCHEMA_VERSION {
            return Err(anyhow::anyhow!(
                "棋盘文件版本 {} 不受支持，需 {} 格式",
                payload.schema_version,
                crate::core::model::manifest::CURRENT_SCHEMA_VERSION
            ));
        }

        let mut board = payload.board;
        let existing: HashSet<String> = self.load_boards()?.into_iter().map(|b| b.id).collect();
        if existing.contains(&board.id) {
            board.id = uuid::Uuid::new_v4().to_string();
        }

        let now = crate::core::util::now_ms();
        board.created_at = now;
        board.updated_at = now;
        self.save_board(&board)?;

        // 历史跟着一起进来，seq 重新分配
        for mut ev in payload.events {
            ev.seq = 0;
            let _ = self.append_board_event(&board.id, ev);
        }

        Ok(board)
    }

    // ── 落子历史（牌谱）──
    // 与会话事件同一套 JSONL 机制：只追加，尾行即最大 seq。
    // 复用 session::Event —— 事件形状本来就是通用的
    // （seq / at / kind / payload / note），为棋盘另建一个只会多一处要同步。

    pub fn load_board_events(&self, board_id: &str) -> anyhow::Result<Vec<Event>> {
        self.load_events_at(&self.board_events_path(board_id))
    }

    /// 按任意路径加载 events.jsonl（尾行损坏时全量扫描会用到）。
    fn load_events_at(&self, path: &std::path::Path) -> anyhow::Result<Vec<Event>> {
        if !path.exists() {
            return Ok(Vec::new());
        }
        let text = std::fs::read_to_string(path)?;
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

    fn last_byte_at(&self, path: &std::path::Path) -> anyhow::Result<Option<u8>> {
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

    /// 尾行那条事件的 seq。JSONL 只追加不改写，尾行即最大 seq。
    ///
    /// 与会话事件同款优化：算 seq 不读全文件。尾行解析不了（截断 / 损坏）
    /// 或 seq 为 0 时退回全量扫描 —— 正确性优先于速度。
    fn last_seq_at(&self, path: &std::path::Path) -> anyhow::Result<u64> {
        let Ok(meta) = std::fs::metadata(path) else {
            return Ok(0);
        };
        if meta.len() == 0 {
            return Ok(0);
        }

        const TAIL_WINDOW: u64 = 64 * 1024;
        let mut f = std::fs::File::open(path)?;
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
            .load_events_at(path)?
            .iter()
            .map(|e| e.seq)
            .max()
            .unwrap_or(0))
    }

    /// 追加一条落子事件，返回落库的那条（含分配到的 seq）。
    pub fn append_board_event(
        &self,
        board_id: &str,
        mut event: Event,
    ) -> anyhow::Result<Event> {
        let dir = self.board_events_dir(board_id);
        std::fs::create_dir_all(&dir)?;
        let path = self.board_events_path(board_id);
        let len = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);

        // 尾字节不是换行 → 上次写入崩了一半。先补一个换行，
        // 否则新事件会和那半行粘成同一行，两条都读不回来。
        if len > 0 && self.last_byte_at(&path)? != Some(b'\n') {
            let mut f = std::fs::OpenOptions::new().append(true).open(&path)?;
            writeln!(f)?;
        }

        let next_seq = self.last_seq_at(&path)? + 1;
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

    pub fn update_board_event(
        &self,
        board_id: &str,
        seq: u64,
        payload: serde_json::Value,
        note: Option<String>,
    ) -> anyhow::Result<()> {
        let mut events = self.load_board_events(board_id)?;
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
            return Err(anyhow::anyhow!("board event seq {seq} not found"));
        }
        self.save_board_events(board_id, &events)?;
        Ok(())
    }

    pub fn delete_board_event(&self, board_id: &str, seq: u64) -> anyhow::Result<()> {
        let mut events = self.load_board_events(board_id)?;
        let before = events.len();
        events.retain(|e| e.seq != seq);
        if events.len() == before {
            return Ok(());
        }
        self.save_board_events(board_id, &events)?;
        Ok(())
    }

    fn save_board_events(&self, board_id: &str, events: &[Event]) -> anyhow::Result<()> {
        let dir = self.board_events_dir(board_id);
        std::fs::create_dir_all(&dir)?;
        let path = self.board_events_path(board_id);
        let mut buf = String::new();
        for ev in events {
            buf.push_str(&serde_json::to_string(ev)?);
            buf.push('\n');
        }
        write_atomic(&path, buf.as_bytes())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_project() -> (Project, std::path::PathBuf) {
        let dir = std::env::temp_dir().join(format!("anvil_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let project = Project::open(&dir).expect("open temp project");
        (project, dir)
    }

    fn step(at: i64, summary: &str) -> Event {
        Event {
            seq: 0,
            at,
            kind: "board.move".into(),
            payload: serde_json::json!({ "summary": summary }),
            note: None,
        }
    }

    #[test]
    fn append_board_event_assigns_increasing_seq() {
        let (project, dir) = temp_project();

        let a = project.append_board_event("b1", step(1, "移动")).unwrap();
        let b = project.append_board_event("b1", step(2, "翻转")).unwrap();
        assert_eq!(a.seq, 1, "第一条从 1 开始");
        assert_eq!(b.seq, 2);
        assert_eq!(
            project.load_board_events("b1").unwrap().len(),
            2,
            "两条都要能读回来"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn each_board_gets_its_own_history_file() {
        let (project, dir) = temp_project();

        project.append_board_event("b1", step(1, "一")).unwrap();
        project.append_board_event("b2", step(2, "二")).unwrap();

        assert_eq!(project.load_board_events("b1").unwrap().len(), 1);
        assert_eq!(project.load_board_events("b2").unwrap().len(), 1);
        assert_eq!(
            project.load_board_events("b3").unwrap().len(),
            0,
            "没有历史的棋盘读回空列表，而不是报错"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn delete_board_takes_its_history_with_it() {
        let (project, dir) = temp_project();
        project.append_board_event("b1", step(1, "一")).unwrap();
        assert_eq!(project.load_board_events("b1").unwrap().len(), 1);

        project.delete_board("b1").unwrap();

        assert_eq!(
            project.load_board_events("b1").unwrap().len(),
            0,
            "删棋盘必须连落子历史一起清掉，否则留下读不到的孤儿事件"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn delete_one_board_event_leaves_the_rest() {
        let (project, dir) = temp_project();
        project.append_board_event("b1", step(1, "一")).unwrap();
        project.append_board_event("b1", step(2, "二")).unwrap();

        project.delete_board_event("b1", 1).unwrap();

        let left = project.load_board_events("b1").unwrap();
        assert_eq!(left.len(), 1);
        assert_eq!(left[0].seq, 2, "删掉的是 seq 1，留下的应是 2");

        let _ = std::fs::remove_dir_all(&dir);
    }

    fn sample_board() -> Board {
        Board {
            id: "b1".into(),
            name: "矿镇".into(),
            width: 1200.0,
            height: 800.0,
            grid: crate::core::model::board::GridConfig::default(),
            background: None,
            tokens: Vec::new(),
            show_relations: false,
            visible_relation_kinds: Vec::new(),
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn export_then_import_brings_board_and_history_back() {
        let (project, dir) = temp_project();
        project.save_board(&sample_board()).unwrap();
        project
            .append_board_event("b1", step(1, "移动"))
            .unwrap();
        project
            .append_board_event("b1", step(2, "翻转"))
            .unwrap();

        let file = dir.join("矿镇.board.json");
        project.export_board("b1", &file).unwrap();
        assert!(file.exists(), "导出文件要写出来");

        // 导回同一个项目：id 撞车，必须换新的而不是覆盖原棋盘
        let imported = project.import_board(&file).unwrap();
        assert_eq!(imported.name, "矿镇", "棋盘内容要跟过来");
        assert_ne!(imported.id, "b1", "id 撞车要重发，不能覆盖既有棋盘");

        let events = project.load_board_events(&imported.id).unwrap();
        assert_eq!(events.len(), 2, "落子历史要跟着一起进来");
        assert_eq!(events[0].seq, 1, "seq 重新分配");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn import_rejects_files_that_are_not_boards() {
        let (project, dir) = temp_project();
        let file = dir.join("junk.json");
        std::fs::write(&file, r#"{"kind":"something-else"}"#).unwrap();

        let err = project.import_board(&file).unwrap_err();
        assert!(
            err.to_string().contains("不是 Anvil 棋盘文件"),
            "错误信息要说清是什么问题：{err}"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }
}
