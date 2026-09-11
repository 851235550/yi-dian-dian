/**
 * prompts/index.ts —— 场景化 prompt 模板统一入口
 */

export { buildTranslateMessages } from "./translate";
export type { TranslateInput } from "./translate";

export { buildExplainMessages } from "./explain";
export type { ExplainInput } from "./explain";

export { buildPronounceMessages } from "./pronounce";
export type { PronounceInput } from "./pronounce";
