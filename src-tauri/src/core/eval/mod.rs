use crate::core::model::scenario::{Scenario, VariableDef};
use crate::core::model::card_type::FieldType;
use evalexpr::{eval_boolean_with_context, ContextWithMutableVariables, HashMapContext, Value};
use std::collections::BTreeMap;

/// 从 scenario 的变量定义构造默认上下文。
pub fn default_context(scenario: &Scenario) -> anyhow::Result<HashMapContext> {
    let mut ctx = HashMapContext::new();
    for v in &scenario.variables {
        let value = default_value_of(v);
        ctx.set_value(v.key.clone(), value)?;
    }
    Ok(ctx)
}

/// 用外部传入的值覆盖上下文。
pub fn build_context(
    scenario: &Scenario,
    overrides: &BTreeMap<String, serde_json::Value>,
) -> anyhow::Result<HashMapContext> {
    let mut ctx = HashMapContext::new();
    for v in &scenario.variables {
        let v_override = overrides.get(&v.key);
        let value = match v_override {
            Some(j) => json_to_eval_value(j),
            None => default_value_of(v),
        };
        ctx.set_value(v.key.clone(), value)?;
    }
    Ok(ctx)
}

fn default_value_of(v: &VariableDef) -> Value {
    match &v.default {
        Some(j) => json_to_eval_value(j),
        None => match v.ty {
            FieldType::Bool => Value::Boolean(false),
            FieldType::Number => Value::Float(0.0),
            _ => Value::String(String::new()),
        },
    }
}

fn json_to_eval_value(j: &serde_json::Value) -> Value {
    match j {
        serde_json::Value::Bool(b) => Value::Boolean(*b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Value::Int(i)
            } else {
                Value::Float(n.as_f64().unwrap_or(0.0))
            }
        }
        serde_json::Value::String(s) => Value::String(s.clone()),
        serde_json::Value::Null => Value::Empty,
        other => Value::String(other.to_string()),
    }
}

/// 校验表达式能否解析。空字符串视为合法。
pub fn validate_condition(
    scenario: &Scenario,
    expr: &str,
) -> anyhow::Result<()> {
    if expr.trim().is_empty() {
        return Ok(());
    }
    let ctx = default_context(scenario)?;
    eval_boolean_with_context(expr, &ctx)
        .map(|_| ())
        .map_err(|e| anyhow::anyhow!("{}", e))
}

/// 用给定变量值求值。
pub fn eval_condition(
    scenario: &Scenario,
    expr: &str,
    overrides: &BTreeMap<String, serde_json::Value>,
) -> anyhow::Result<bool> {
    if expr.trim().is_empty() {
        return Ok(true); // 无条件视为通过
    }
    let ctx = build_context(scenario, overrides)?;
    let v = eval_boolean_with_context(expr, &ctx)
        .map_err(|e| anyhow::anyhow!("{}", e))?;
    Ok(v)
}