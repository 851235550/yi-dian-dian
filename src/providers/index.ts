/**
 * providers/index.ts —— Provider 工厂函数
 *
 * 根据用户配置返回对应的 Provider 实例。
 * 新增厂商时只需在此注册，background/content 无需感知差异。
 */

import type { Provider, ProviderError } from "./types";
import type { ProviderName } from "@shared/types";

/**
 * 根据厂商名称创建对应的 Provider 实例
 * @param name 厂商名称
 * @returns Provider 实例；如果厂商尚未实现则返回 undefined
 */
export function createProvider(
  name: ProviderName,
): Provider | undefined {
  // 占位：后续引入各厂商的具体实现并在此注册
  // switch (name) {
  //   case "deepseek":
  //     return deepseekProvider;
  //   case "openai":
  //     return openaiProvider;
  //   case "anthropic":
  //     return anthropicProvider;
  // }
  console.warn(`[译点点] Provider "${name}" 尚未实现`);
  return undefined;
}

/**
 * 判断 ProviderError 的 code 对应的用户可读文案 key
 */
export function getErrorCodeKey(
  error: ProviderError,
): "INVALID_KEY" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN" {
  return error.code ?? "UNKNOWN";
}
