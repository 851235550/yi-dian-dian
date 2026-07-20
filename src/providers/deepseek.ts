/**
 * providers/deepseek.ts —— DeepSeek Provider 实现
 *
 * 实现 Provider 接口的 streamComplete 方法，处理 DeepSeek API 的 SSE 流式响应。
 *
 * DeepSeek API 文档：https://platform.deepseek.com/api-docs
 * 接口与 OpenAI Chat Completions 兼容，stream 模式下返回 SSE 事件流。
 */

import type { Provider } from "./types";

/** DeepSeek API 基础 URL */
const BASE_URL = "https://api.deepseek.com/chat/completions";

/** DeepSeek SSE 响应中每个 chunk 的 data 结构 */
interface DeepSeekChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export const deepseekProvider: Provider = {
  name: "deepseek",

  streamComplete(messages, options, callbacks) {
    const controller = new AbortController();

    fetch(BASE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? "deepseek-chat",
        messages,
        stream: true,
      }),
    })
      .then(async (response) => {
        // HTTP 错误（如 401 无效 Key、429 限流）
        if (!response.ok) {
          const code =
            response.status === 401
              ? "INVALID_KEY"
              : response.status === 429
                ? "RATE_LIMIT"
                : "UNKNOWN";
          callbacks.onError({
            message: `HTTP ${response.status}`,
            code,
          });
          return;
        }

        if (!response.body) {
          callbacks.onError({
            message: "响应体为空",
            code: "UNKNOWN",
          });
          return;
        }

        // 逐行读取 SSE 流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        // SSE 行缓冲区：处理跨 chunk 的不完整行
        let lineBuffer = "";

        try {
          let isReading = true;
          while (isReading) {
            const { done, value } = await reader.read();
            if (done) {
              isReading = false;
              continue;
            }

            const chunk = decoder.decode(value, { stream: true });
            lineBuffer += chunk;

            // 按 \n 拆分行
            const lines = lineBuffer.split("\n");
            // 最后一行可能不完整，保留到下次循环
            lineBuffer = lines.pop() ?? "";

            for (const line of lines) {
              // SSE data 行格式："data: <json>"
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              // 流结束标记
              if (jsonStr === "[DONE]") {
                callbacks.onDone(fullText);
                return;
              }

              try {
                const parsed = JSON.parse(jsonStr) as DeepSeekChunk;
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  callbacks.onChunk(delta);
                }
              } catch {
                // 跳过无法解析的行（非 JSON 的 data 行）
              }
            }
          }
        } catch (err) {
          // 读取过程中出错（可能被 abort 中断）
          if (err instanceof Error && err.name === "AbortError") {
            return; // 用户主动取消，不算错误
          }
          callbacks.onError({
            message: err instanceof Error ? err.message : "流读取失败",
            code: "NETWORK",
          });
          return;
        }

        // 流结束但未收到 [DONE]（部分 API 实现可能不发 [DONE]）
        callbacks.onDone(fullText);
      })
      .catch((err) => {
        // fetch 本身被 abort 或网络错误
        if (err instanceof Error && err.name === "AbortError") {
          return; // 用户主动取消，不算错误
        }
        callbacks.onError({
          message: err instanceof Error ? err.message : "请求失败",
          code: "NETWORK",
        });
      });

    // 返回 abort 函数，调用后中断 fetch 和 SSE 流读取
    return () => controller.abort();
  },
};
