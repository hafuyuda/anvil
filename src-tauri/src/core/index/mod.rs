use crate::core::model::card::Card;
use rusqlite::{params, Connection};
use std::collections::BTreeMap;
use std::path::Path;

pub fn open_or_create(db_path: &Path) -> anyhow::Result<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;
    init_schema(&conn)?;
    Ok(conn)
}

fn init_schema(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS cards (
            id          TEXT PRIMARY KEY,
            type_id     TEXT NOT NULL,
            name        TEXT NOT NULL,
            values_json TEXT NOT NULL,
            updated_at  INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
            id UNINDEXED,
            name,
            values_text,
            tokenize = 'trigram'
        );

        CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type_id);
        "#,
    )?;
    Ok(())
}

pub fn rebuild(conn: &mut Connection, cards: &[Card]) -> anyhow::Result<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM cards", [])?;
    tx.execute("DELETE FROM cards_fts", [])?;
    {
        let mut ins_card = tx.prepare(
            "INSERT INTO cards (id, type_id, name, values_json, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )?;
        let mut ins_fts = tx.prepare(
            "INSERT INTO cards_fts (id, name, values_text) VALUES (?1, ?2, ?3)",
        )?;
        for c in cards {
            let values_json = serde_json::to_string(&c.values)?;
            let values_text = collect_text(&c.values);
            ins_card.execute(params![c.id, c.type_id, c.name, values_json, c.updated_at])?;
            ins_fts.execute(params![c.id, c.name, values_text])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn upsert_card(conn: &Connection, card: &Card) -> anyhow::Result<()> {
    let values_json = serde_json::to_string(&card.values)?;
    let values_text = collect_text(&card.values);

    conn.execute(
        "INSERT INTO cards (id, type_id, name, values_json, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
             type_id = excluded.type_id,
             name = excluded.name,
             values_json = excluded.values_json,
             updated_at = excluded.updated_at",
        params![card.id, card.type_id, card.name, values_json, card.updated_at],
    )?;

    conn.execute("DELETE FROM cards_fts WHERE id = ?1", params![card.id])?;
    conn.execute(
        "INSERT INTO cards_fts (id, name, values_text) VALUES (?1, ?2, ?3)",
        params![card.id, card.name, values_text],
    )?;
    Ok(())
}

pub fn delete_card(conn: &Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM cards WHERE id = ?1", params![id])?;
    conn.execute("DELETE FROM cards_fts WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn search(conn: &Connection, query: &str, limit: usize) -> anyhow::Result<Vec<String>> {
    let q = sanitize_fts_query(query);
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let mut stmt = conn.prepare(
        "SELECT id FROM cards_fts WHERE cards_fts MATCH ?1 ORDER BY rank LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![q, limit as i64], |row| row.get::<_, String>(0))?;
    let mut ids = Vec::new();
    for r in rows {
        ids.push(r?);
    }
    Ok(ids)
}

fn sanitize_fts_query(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    // FTS5 的 MATCH 语法里特殊字符多，用双引号包成短语最稳
    let escaped = trimmed.replace('"', "\"\"");
    format!("\"{escaped}\"")
}

fn collect_text(values: &BTreeMap<String, serde_json::Value>) -> String {
    let mut out = String::new();
    for v in values.values() {
        append_text(v, &mut out);
    }
    out
}

fn append_text(v: &serde_json::Value, out: &mut String) {
    match v {
        serde_json::Value::String(s) => {
            out.push_str(s);
            out.push(' ');
        }
        serde_json::Value::Array(arr) => {
            for item in arr {
                append_text(item, out);
            }
        }
        serde_json::Value::Object(obj) => {
            for item in obj.values() {
                append_text(item, out);
            }
        }
        _ => {}
    }
}