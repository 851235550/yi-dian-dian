/**
 * shared/storage.ts —— 类型安全的 chrome.storage 读写封装
 *
 * popup / options / background 通过此模块读写持久化数据，
 * 不直接调用 chrome.storage.local.get/set。
 */

import type { UserConfig } from "./types";
import { DEFAULT_CONFIG } from "./constants";

/** storage 中 config 的 key */
const CONFIG_KEY = "config";

/**
 * 读取用户配置。若尚未配置则返回默认值。
 * 可在 popup / options / background 中调用。
 */
export async function getConfig(): Promise<UserConfig> {
  try {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const stored = (result[CONFIG_KEY] ?? {}) as Partial<UserConfig>;
    // 合并时确保 apiKeys 始终是一个对象
    const merged = { ...DEFAULT_CONFIG, ...stored };
    if (!merged.apiKeys || typeof merged.apiKeys !== "object") {
      merged.apiKeys = {};
    }
    return merged as UserConfig;
  } catch {
    // storage 读取失败时降级为默认配置
    console.warn("[译点点] 读取配置失败，使用默认配置");
    return { ...DEFAULT_CONFIG, apiKeys: {} } as UserConfig;
  }
}

/**
 * 写入（部分）用户配置。使用 Object.assign 语义做浅合并。
 */
export async function setConfig(
  partial: Partial<UserConfig>,
): Promise<void> {
  const current = await getConfig();
  const merged: UserConfig = { ...current, ...partial };
  await chrome.storage.local.set({ [CONFIG_KEY]: merged });
}

export {};
