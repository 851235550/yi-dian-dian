/**
 * background/index.ts —— Service Worker 入口
 *
 * 职责：消息路由 + API 调用编排，是整个插件的"协调者"。
 *
 * 处理两类通信：
 *   1. Port 长连接（content 发起的流式翻译/解释请求）
 *   2. sendMessage 一次性消息（popup/options 的配置读写）
 */

import type { StreamRequest, StreamMessage } from "@shared/message";
import type { AbortFn } from "../providers/types";
import { STREAM_PORT_NAME } from "@shared/message";
import { getConfig, setConfig } from "@shared/storage";
import { createProvider } from "../providers";
import {
  buildTranslateMessages,
  buildExplainMessages,
} from "../prompts";

console.log("[译点点] background service worker 已启动");

// ========== Port ↔ Abort 映射 ==========
// 维护每个 Port 连接对应的 abort 函数，用于在连接断开时中断底层 fetch。
// 该状态仅在单次请求生命周期内有效，service worker 被回收后自动消失——符合预期，
// 因为进程被杀意味着请求已失败，用户重新触发即可。
const abortMap = new WeakMap<chrome.runtime.Port, AbortFn>();

// ========== Port 流式处理 ==========

chrome.runtime.onConnect.addListener((port) => {
  // 只处理流式通信的 Port，过滤掉其他可能的连接
  if (port.name !== STREAM_PORT_NAME) return;

  console.log("[译点点] 收到流式 Port 连接");

  // 一个 Port 只处理一条 STREAM_REQUEST
  port.onMessage.addListener(async (message: StreamRequest) => {
    if (message.type !== "STREAM_REQUEST") return;

    const { scenario, text, targetLang } = message.payload;
    console.log(`[译点点] 收到流式请求: scenario=${scenario}, text="${text.slice(0, 30)}..."`);

    try {
      // 1. 读取用户配置
      const config = await getConfig();

      // 2. 获取 API Key
      const apiKey = config.apiKeys[config.activeProvider];
      if (!apiKey) {
        const errorMsg: StreamMessage = {
          type: "STREAM_ERROR",
          payload: {
            message: "未配置 API Key",
            code: "INVALID_KEY",
          },
        };
        port.postMessage(errorMsg);
        port.disconnect();
        return;
      }

      // 3. 获取对应的 Provider 实例
      const provider = createProvider(config.activeProvider);
      if (!provider) {
        const errorMsg: StreamMessage = {
          type: "STREAM_ERROR",
          payload: {
            message: `不支持的厂商: ${config.activeProvider}`,
            code: "UNKNOWN",
          },
        };
        port.postMessage(errorMsg);
        port.disconnect();
        return;
      }

      // 4. 根据场景构建消息
      const messages =
        scenario === "explain"
          ? buildExplainMessages({ text })
          : buildTranslateMessages({
              text,
              targetLang: targetLang ?? config.targetLang,
            });

      // 5. 调用 provider 流式接口，保存 abort 函数
      const abort = provider.streamComplete(
        messages,
        { apiKey },
        {
          // 每个分片立即转发给 content
          onChunk(delta: string) {
            const msg: StreamMessage = {
              type: "STREAM_CHUNK",
              payload: { delta },
            };
            port.postMessage(msg);
          },
          // 流正常结束
          onDone(fullText: string) {
            const msg: StreamMessage = {
              type: "STREAM_DONE",
              payload: { fullText },
            };
            port.postMessage(msg);
            port.disconnect();
          },
          // 流出错
          onError(error) {
            const msg: StreamMessage = {
              type: "STREAM_ERROR",
              payload: {
                message: error.message,
                code: error.code,
              },
            };
            port.postMessage(msg);
            port.disconnect();
          },
        },
      );

      // 保存 abort 函数，供 onDisconnect 使用
      abortMap.set(port, abort);
    } catch (err) {
      // 配置读取等异常
      const errorMsg: StreamMessage = {
        type: "STREAM_ERROR",
        payload: {
          message: err instanceof Error ? err.message : "内部错误",
          code: "UNKNOWN",
        },
      };
      port.postMessage(errorMsg);
      port.disconnect();
    }
  });

  // Port 断开时中断底层请求（用户关闭悬浮框/切换场景/选中新文本）
  port.onDisconnect.addListener(() => {
    console.log("[译点点] Port 断开，中断底层请求");
    const abort = abortMap.get(port);
    if (abort) {
      abort();
      abortMap.delete(port);
    }
  });
});

// ========== 一次性消息处理（配置读写） ==========

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 处理 GET_CONFIG_REQUEST
  if (
    message &&
    typeof message === "object" &&
    "type" in message &&
    message.type === "GET_CONFIG_REQUEST"
  ) {
    getConfig()
      .then((config) => {
        sendResponse({ type: "GET_CONFIG_RESPONSE", payload: config });
      })
      .catch(() => {
        sendResponse({
          type: "GET_CONFIG_RESPONSE",
          payload: null,
        });
      });
    return true; // 保持 sendResponse 通道开放（异步响应）
  }

  // 处理 SET_CONFIG_REQUEST
  if (
    message &&
    typeof message === "object" &&
    "type" in message &&
    message.type === "SET_CONFIG_REQUEST"
  ) {
    setConfig(message.payload)
      .then(() => {
        sendResponse({
          type: "SET_CONFIG_RESPONSE",
          payload: { success: true },
        });
      })
      .catch(() => {
        sendResponse({
          type: "SET_CONFIG_RESPONSE",
          payload: { success: false },
        });
      });
    return true;
  }

  return false;
});

