/**
 * shared/constants.ts —— 全局常量与面向用户的文案
 *
 * 所有悬浮框文字、错误提示、默认配置等统一在此维护。
 * 禁止在组件或 content script 中硬编码文案。
 */

// ========== 默认配置 ==========

/** 默认用户配置 */
export const DEFAULT_CONFIG = {
  activeProvider: "deepseek" as const,
  apiKeys: {} as Partial<Record<string, string>>,
  targetLang: "中文",
  shortcutEnabled: true,
};

// ========== 悬浮框文案 ==========

/** 场景标签 */
export const SCENARIO_LABELS = {
  translate: "翻译",
  explain: "解释",
} as const;

/** 状态提示 */
export const STATUS_TEXT = {
  idle: "正在处理…",
  streaming: "",
  done: "",
  error: "请求失败，请重试",
} as const;

/** 按钮文案 */
export const BUTTON_TEXT = {
  retry: "重试",
  copy: "复制",
  close: "关闭",
} as const;

// ========== 错误提示 ==========

/** 错误码 → 中文文案映射，content script 在收到 STREAM_ERROR 时查表展示 */
export const ERROR_MESSAGE: Record<string, string> = {
  INVALID_KEY: "API Key 无效，请在设置中检查",
  RATE_LIMIT: "请求过于频繁，请稍后再试",
  NETWORK: "网络连接失败，请检查网络后重试",
  UNKNOWN: "请求失败，请稍后重试",
};
