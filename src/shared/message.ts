/**
 * shared/message.ts —— 跨 context 消息类型定义 + 发送辅助函数
 *
 * content ↔ background ↔ popup/options 之间的所有消息必须在此定义类型。
 * 禁止裸 chrome.runtime.sendMessage({...}) 不带类型。
 *
 * 首版为脚手架占位，后续逐步加入 STREAM_REQUEST / STREAM_CHUNK 等类型。
 */

// 占位：后续实现消息类型定义与辅助函数
export {};
