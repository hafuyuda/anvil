use serde::{Deserialize, Serialize};

/// 剧情元数据。流程拓扑不在其中——剧本本体是 `scenarios/<id>/*.md`（weave 语法）。
///
/// 变量表也不在其中：变量由剧本里的 `VAR` 行声明，类型推断归前端
/// `features/story/engine` 唯一实现（导出件用同一个 bundle）。
/// 曾经的 `VariableDef` 结构体已随之删除——它是第三份实现的载体。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    /// 入口 knot。为空时运行时取文件名字典序第一个文件的第一个 knot。
    #[serde(default)]
    pub entry_knot: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
