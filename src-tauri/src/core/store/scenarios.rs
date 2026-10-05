use super::project::Project;
use crate::core::model::scenario::Scenario;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn scenarios_dir(&self) -> PathBuf {
        self.root.join("scenarios")
    }

    pub fn scenario_path(&self, id: &str) -> PathBuf {
        self.scenarios_dir().join(format!("{id}.json"))
    }

    pub fn load_scenarios(&self) -> anyhow::Result<Vec<Scenario>> {
        let dir = self.scenarios_dir();
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
            match serde_json::from_slice::<Scenario>(&bytes) {
                Ok(s) => out.push(s),
                Err(e) => eprintln!("scenario {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_scenario(&self, scenario: &Scenario) -> anyhow::Result<()> {
        std::fs::create_dir_all(self.scenarios_dir())?;
        let path = self.scenario_path(&scenario.id);
        let json = serde_json::to_vec_pretty(scenario)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_scenario(&self, id: &str) -> anyhow::Result<()> {
        let path = self.scenario_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }
}