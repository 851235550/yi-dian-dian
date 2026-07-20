/**
 * shared/message.ts —— 跨 context 消息类型定义 + 发送辅助函数
 *
 * content ↔ background ↔ popup/options 之间的所有消息必须在此定义类型。
 * 禁止裸 chrome.runtime.sendMessage({...}) 不带类型。
 *
 * 两套通道并存，用途不同不要混用：
 *   1. Port（长连接）：流式场景（翻译/解释）
 *   2. sendMessage（一次性）：配置读写
 */

import type { UserConfig } from "./types";

// ========== 场景类型 ==========

/** 业务场景 */
export type Scenario = "translate" | "explain";

// ========== Port 流式消息（content ⟷ background） ==========

/** Port 连接的固定名称 */
export const STREAM_PORT_NAME = "ai-stream";

/** content → background：连接建立后发送的第一条消息，发起流式请求 */
export interface StreamRequest {
  type: "STREAM_REQUEST";
  payload: {
    scenario: Scenario;
    /** 用户选中的原始文本 */
    text: string;
    /** 翻译目标语言（翻译场景使用） */
    targetLang?: string;
  };
}

/** background → content：流式推送的联合类型 */
export type StreamMessage =
  | StreamChunk
  | StreamDone
  | StreamError;

/** 一个文本分片 */
export interface StreamChunk {
  type: "STREAM_CHUNK";
  payload: { delta: string };
}

/** 流正常结束 */
export interface StreamDone {
  type: "STREAM_DONE";
  payload: { fullText: string };
}

/** 流出错 */
export interface StreamError {
  type: "STREAM_ERROR";
  payload: {
    /** 归一化错误码，content 侧据此查 ERROR_MESSAGE 显示中文提示 */
    code: "INVALID_KEY" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN";
    /** 原始错误信息（仅 provider 层使用，作为后备展示） */
    message?: string;
  };
}

// ========== 一次性消息（popup/options ⟷ background） ==========

export type OneShotMessage =
  | GetConfigRequest
  | GetConfigResponse
  | SetConfigRequest
  | SetConfigResponse;

export interface GetConfigRequest {
  type: "GET_CONFIG_REQUEST";
}

export interface GetConfigResponse {
  type: "GET_CONFIG_RESPONSE";
  payload: UserConfig;
}

export interface SetConfigRequest {
  type: "SET_CONFIG_REQUEST";
  payload: Partial<UserConfig>;
}

export interface SetConfigResponse {
  type: "SET_CONFIG_RESPONSE";
  payload: { success: boolean };
}

// ========== 一次性消息（popup/options ⟷ background） ==========