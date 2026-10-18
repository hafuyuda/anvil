import { StreamLanguage, type StreamParser } from "@codemirror/language";

interface State {
  inFrontmatter: boolean;
}

const parser: StreamParser<State> = {
  startState: () => ({ inFrontmatter: false }),
  token(stream, state) {
    // frontmatter 边界
    if (stream.sol() && stream.match("---")) {
      state.inFrontmatter = !state.inFrontmatter;
      return "meta";
    }
    if (state.inFrontmatter) {
      if (stream.match(/^[a-zA-Z_]\w*(?=\s*:)/)) return "propertyName";
      if (stream.match(":")) return "punctuation";
      stream.skipToEnd();
      return "string";
    }

    if (stream.sol()) {
      if (stream.match("===")) {
        stream.skipToEnd();
        return "keyword";
      }
      if (stream.match("VAR")) {
        stream.skipToEnd();
        return "keyword";
      }
      if (stream.match("<>")) return "atom";
      if (stream.match("->")) {
        stream.skipToEnd();
        return "keyword";
      }
      if (stream.match(">")) {
        stream.skipToEnd();
        return "heading";
      }
      if (stream.match("~")) {
        stream.skipToEnd();
        return "operator";
      }
      // gather：单独的 - 或 - 文本（-> 已在上面消费）
      if (stream.match(/-(\s|$)/)) {
        stream.skipToEnd();
        return "operator";
      }
      if (stream.match(/@(bg|bgm|sfx|scene|actor)\b/)) {
        stream.skipToEnd();
        return "meta";
      }
      if (stream.match("{")) {
        // 条件行：表达式到冒号或行尾，后接文本
        if (!stream.skipTo(":")) stream.skipToEnd();
        return "brace";
      }
      if (stream.match("**")) {
        // 对白：说话人
        stream.skipTo("**");
        stream.match("**");
        return "strong";
      }
      // choice：* 后带空白；action：*文本*
      if (stream.match(/\*\s/)) {
        stream.skipToEnd();
        return "strong";
      }
      if (stream.match("*")) {
        stream.skipToEnd();
        return "emphasis";
      }
    }
    stream.skipToEnd();
    return null;
  },
};

export const storyLanguage = StreamLanguage.define(parser);
