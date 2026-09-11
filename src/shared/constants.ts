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
  pronounce: "发音",
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

// ========== 通用文案 ==========

export const COMMON_TEXT = {
  loading: "加载中…",
} as const;

// ========== Popup 文案 ==========

export const POPUP_TEXT = {
  title: "译点点",
  subtitle: "划词翻译 · 解释",
  keyConfigured: "API Key 已配置",
  usageHint: "在任意网页上选中文字，悬浮框会自动弹出并翻译。",
  keyNotConfigured: "⚠️ 尚未配置 API Key",
  goToSettings: "前往设置",
  settings: "⚙ 设置",
} as const;

// ========== Options 文案 ==========

export const OPTIONS_TEXT = {
  title: "译点点 设置",
  providerLabel: "大模型厂商",
  comingSoon: "（即将支持）",
  apiKeyLabel: "API Key",
  apiKeyPlaceholder: "请输入 API Key",
  apiKeyPlaceholderDisabled: "暂不支持",
  apiKeyHint: "API Key 仅存储在本地浏览器中，不会上传到任何服务器。",
  targetLangLabel: "翻译目标语言",
  targetLangPlaceholder: "如：中文、English、日本語",
  saveButton: "保存",
  saving: "保存中…",
  saved: "✅ 已保存",
  saveError: "❌ 保存失败，请重试",
} as const;

// ========== 悬浮框本地错误文案 ==========

export const PANEL_ERROR = {
  noSelection: "未选中文本",
  connectionLost: "连接中断",
  pronounceWordOnly: "发音仅支持单个单词，请选中一个单词后重试",
} as const;

// ========== 悬浮球文案 ==========

export const BALL_TEXT = "译";
