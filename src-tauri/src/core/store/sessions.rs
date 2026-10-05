use super::project::Project;
use crate::core::model::session::{Event, Session};
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

    pub fn session_path(&self, id: &str) -> PathBuf {
        self.session_dir(id).join("session.json")
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

    pub fn append_event(&self, session_id: &str, mut event: Event) -> anyhow::Result<()> {
        let dir = self.session_dir(session_id);
        std::fs::create_dir_all(&dir)?;

        let existing = self.load_events(session_id)?;
        let next_seq = existing.iter().map(|e| e.seq).max().unwrap_or(0) + 1;
        if event.seq == 0 {
            event.seq = next_seq;
        }

        let path = self.events_path(session_id);
        let mut f = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        let line = serde_json::to_string(&event)?;
        writeln!(f, "{line}")?;
        Ok(())
    }
}