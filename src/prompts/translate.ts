/**
 * prompts/translate.ts —— 翻译场景 prompt 模板
 *
 * 根据用户选中的文本和目标语言，构建发送给大模型的 ChatMessage[]。
 */

import type { ChatMessage } from "../providers/types";

export interface TranslateInput {
  /** 用户选中的原文 */
  text: string;
  /** 翻译目标语言，如 "中文"、"English" */
  targetLang: string;
}

/**
 * 构建翻译场景的消息列表
 */
export function buildTranslateMessages(input: TranslateInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        `你是一个专业的翻译助手。`,
        `请将用户提供的文本翻译成${input.targetLang}。`,
        `要求：`,
        `1. 只输出翻译结果，不要输出任何解释、注释或额外信息`,
        `2. 保持原文的语气和风格`,
        `3. 如果原文包含专业术语，请使用目标语言中对应的通用译法`,
        `4. 纯文本输出，不要使用 Markdown 格式`,
      ].join("\n"),
    },
    {
      role: "user",
      content: input.text,
    },
  ];
}
