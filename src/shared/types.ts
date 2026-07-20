/**
 * shared/types.ts —— 全局共享类型定义
 *
 * 包含 Storage Schema、Provider 接口、消息联合类型等。
 * 随着开发迭代逐步扩充。
 */

/** 用户可配置项 */
export interface UserConfig {
  /** 当前使用的厂商 */
  activeProvider: ProviderName;
  /** 各厂商 API Key */
  apiKeys: Partial<Record<ProviderName, string>>;
  /** 翻译目标语言，如 "中文"、"English" */
  targetLang: string;
  /** 是否启用快捷键（首版预留） */
  shortcutEnabled: boolean;
}

/** 支持的厂商名称 */
export type ProviderName = "openai" | "deepseek" | "anthropic";

/** 翻译历史条目 */
export interface HistoryItem {
  text: string;
  result: string;
  timestamp: number;
}
