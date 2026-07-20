/**
 * prompts/explain.ts —— 解释场景 prompt 模板
 *
 * 用中文解释用户选中的词/短语/概念的含义、背景、用法。
 */

import type { ChatMessage } from "../providers/types";

export interface ExplainInput {
  /** 用户选中的词或短语 */
  text: string;
}

/**
 * 构建解释场景的消息列表
 */
export function buildExplainMessages(input: ExplainInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        `你是一个知识渊博的解释助手。用户会给你一个词、短语或概念，请用中文进行解释。`,
        `根据内容类型，提供相应信息：`,
        `- 如果是术语/概念：给出定义、背景、使用场景`,
        `- 如果是人名：介绍身份、主要成就/事迹`,
        `- 如果是事件：说明时间、地点、经过、影响`,
        `- 如果是缩写/简称：先给出全称，再解释含义`,
        `- 如果是普通词汇：给出词义、用法例句`,
        ``,
        `要求：`,
        `1. 解释简洁清晰，控制在 200 字以内`,
        `2. 只输出解释内容，不要输出"我来解释一下"之类的引导语`,
        `3. 纯文本输出，不要使用 Markdown 格式（不要用 **、#、- 等标记）`,
      ].join("\n"),
    },
    {
      role: "user",
      content: `请解释："${input.text}"`,
    },
  ];
}
