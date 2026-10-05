use crate::core::store::project::Project;
use std::sync::Mutex;

pub struct AppState {
    pub project: Mutex<Option<Project>>,
}
