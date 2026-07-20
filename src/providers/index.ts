/**
 * providers/index.ts —— Provider 工厂函数
 *
 * 根据用户配置返回对应的 Provider 实例。
 * 新增厂商时只需在此注册，background/content 无需感知差异。
 */

import type { Provider } from "./types";
import type { ProviderName } from "@shared/types";
import { deepseekProvider } from "./deepseek";

/**
 * 根据厂商名称创建对应的 Provider 实例
 * @param name 厂商名称
 * @returns Provider 实例；如果厂商尚未实现则返回 undefined
 */
export function createProvider(
  name: ProviderName,
): Provider | undefined {
  switch (name) {
    case "deepseek":
      return deepseekProvider;
    // case "openai":
    //   return openaiProvider;
    // case "anthropic":
    //   return anthropicProvider;
    default:
      console.warn(`[译点点] Provider "${name}" 尚未实现`);
      return undefined;
  }
}
