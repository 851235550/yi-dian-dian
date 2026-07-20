/**
 * background/index.ts —— Service Worker 入口
 *
 * 职责：消息路由 + API 调用编排，是整个插件的"协调者"。
 * 本文件为脚手架占位，后续任务会加入 Port 连接处理、provider 调度等逻辑。
 */

// Service Worker 激活日志，确认 background 已正确注册
console.log("[译点点] background service worker 已启动");

// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log("[译点点] 插件已安装/更新");
});

// 占位：后续在此处理来自 popup/options 的 sendMessage 和来自 content 的 Port 连接
export {};
