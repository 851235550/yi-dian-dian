/**
 * shared/storage.ts —— 类型安全的 chrome.storage 读写封装
 *
 * popup / options / background 通过此模块读写持久化数据，
 * 不直接调用 chrome.storage.local.get/set。
 */

import type { UserConfig } from "./types";
import { DEFAULT_CONFIG } from "./constants";

/** storage key */
const CONFIG_KEY = "config";
const CACHE_KEY = "translationCache";

/** 缓存过期时间：15 天（毫秒） */
const CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000;

// ========== 缓存数据结构 ==========

interface CacheEntry {
  result: string;
  timestamp: number; // Date.now()
}

interface CacheStore {
  [cacheKey: string]: CacheEntry;
}

/** 构建缓存 key：scenario:targetLang:原始文本 */
export function buildCacheKey(
  scenario: string,
  targetLang: string,
  text: string,
): string {
  return `${scenario}:${targetLang}:${text}`;
}

/** 读取缓存。命中且未过期返回结果，否则返回 null。 */
export async function getCachedResult(
  cacheKey: string,
): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const store = (result[CACHE_KEY] ?? {}) as CacheStore;
    const entry = store[cacheKey];
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL_MS) {
      // 过期了，顺手删掉
      delete store[cacheKey];
      await chrome.storage.local.set({ [CACHE_KEY]: store });
      return null;
    }

    return entry.result;
  } catch {
    return null; // 读取失败视为未命中
  }
}

/** 写入缓存，同时清理所有已过期的条目。 */
export async function setCachedResult(
  cacheKey: string,
  result: string,
): Promise<void> {
  try {
    const raw = await chrome.storage.local.get(CACHE_KEY);
    const store = (raw[CACHE_KEY] ?? {}) as CacheStore;

    // 写入新条目
    store[cacheKey] = { result, timestamp: Date.now() };

    // 清理过期条目
    const now = Date.now();
    for (const key of Object.keys(store)) {
      const entry = store[key];
      if (entry && now - entry.timestamp > CACHE_TTL_MS) {
        delete store[key];
      }
    }

    await chrome.storage.local.set({ [CACHE_KEY]: store });
  } catch {
    // 写入失败静默忽略，不影响翻译主流程
  }
}

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
