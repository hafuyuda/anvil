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
      if (stream.match(/@(bg|bgm|sfx)\b/)) {
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
