/**
 * providers/types.ts —— Provider 统一接口定义
 *
 * 所有厂商必须实现此接口，核心方法是 streamComplete（流式补全）。
 * 翻译和解释共用同一套 Provider 接口，业务场景通过 prompts 层区分。
 */

/** 通用聊天消息格式（厂商无关） */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 补全请求参数 */
export interface CompletionOptions {
  apiKey: string;
  model?: string;
}

/** 流式回调 */
export interface StreamCallbacks {
  /** 收到一个分片 */
  onChunk(delta: string): void;
  /** 流结束，返回完整文本 */
  onDone(fullText: string): void;
  /** 发生错误 */
  onError(error: ProviderError): void;
}

/** 归一化的错误信息 */
export interface ProviderError {
  message: string;
  code?: "INVALID_KEY" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN";
}

/** 返回一个 abort 函数 */
export type AbortFn = () => void;

/** Provider 统一接口 */
export interface Provider {
  /** 厂商名称，如 "deepseek" */
  readonly name: string;
  /**
   * 流式补全
   * @returns 返回一个 abort 函数，调用后可中断请求
   */
  streamComplete(
    messages: ChatMessage[],
    options: CompletionOptions,
    callbacks: StreamCallbacks,
  ): AbortFn;
}
