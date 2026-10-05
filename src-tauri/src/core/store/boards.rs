use super::project::Project;
use crate::core::model::board::Board;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn boards_dir(&self) -> PathBuf {
        self.root.join("boards")
    }

    pub fn board_path(&self, id: &str) -> PathBuf {
        self.boards_dir().join(format!("{id}.json"))
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
        let path = self.board_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }
}