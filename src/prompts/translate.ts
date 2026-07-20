/**
 * prompts/translate.ts —— 翻译场景 prompt 模板
 *
 * 根据用户选中的文本和目标语言，构建发送给大模型的 ChatMessage[]。
 * 单个单词的翻译会额外输出音标、词性、用法和例句。
 */

import type { ChatMessage } from "../providers/types";

export interface TranslateInput {
  /** 用户选中的原文 */
  text: string;
  /** 翻译目标语言，如 "中文"、"English" */
  targetLang: string;
}

export function buildTranslateMessages(input: TranslateInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        `你是一个专业的翻译助手。请根据用户输入的内容类型，采用不同的翻译格式。`,
        ``,
        `## 如果是单个单词`,
        `请按以下格式输出（每项一行）：`,
        `音标：[IPA 音标]`,
        `词性：名词/动词/形容词/副词等`,
        `释义：中文释义（可包含多个义项，用分号分隔）`,
        `用法：一句话说明常见用法或搭配`,
        `例句：原文例句 —— 中文翻译`,
        ``,
        `## 如果是短语或句子`,
        `直接输出流畅的${input.targetLang}译文即可，无需音标和词性。`,
        ``,
        `## 通用要求`,
        `1. 纯文本输出，不要使用 Markdown 格式（不要用 **、#、- 等标记）`,
        `2. 音标使用标准 IPA（国际音标）`,
        `3. 保持原文的语气和风格`,
      ].join("\n"),
    },
    {
      role: "user",
      content: input.text,
    },
  ];
}
