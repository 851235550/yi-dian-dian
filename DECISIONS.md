# DECISIONS.md

> 记录已经拍板的技术决策，防止 AI 在后续任务里"好心"把之前的选择改回它更熟悉的默认做法。
> 每条决策格式：背景 / 决定 / 理由 / 被否决的备选方案。
> 改动已有决策前，先在这里加一条新记录说明为什么要变，不要直接覆盖旧的。

---

## 001 — content script 悬浮框不使用 React

**背景**：搭建项目结构时讨论悬浮框 UI 技术选型。

**决定**：content script 内的悬浮框使用原生 DOM + Shadow DOM，不引入 React。

**理由**：

- 减小注入到每个网页的 JS 体积
- 悬浮框状态简单，不需要框架级状态管理
- Shadow DOM 隔离样式已经解决了主要痛点

**被否决的备选**：直接用 React 渲染进 Shadow Root（体积代价不划算，先不做）。

**复议条件**：如果悬浮框交互复杂度显著上升（多轮追问、历史列表等），可重新评估引入 Preact。

---

## 002 — Provider 层统一接口设计

**背景**：需要支持 OpenAI / DeepSeek / Anthropic 多厂商，避免上层代码里出现厂商判断分支。

**决定**：所有厂商实现同一个 `Provider` 接口（见 AGENTS.md），由 `providers/index.ts` 的工厂函数根据用户配置返回实例。

**理由**：新增厂商只需要新增一个文件 + 注册一行，不需要改动 background 或 content 的调用代码。

**被否决的备选**：在 background 里用 `switch(provider) { case 'openai': ... }` 直接处理每家的请求格式（会导致 background 文件越来越臃肿，且难以测试单个厂商）。

---

## 003 — API Key 只在 background 使用

**背景**：安全考虑，content script 运行在用户浏览的网页上下文里，风险面更大。

**决定**：API Key 只存于 `chrome.storage.local`，只在 `background` 读取和使用，content script 不接触 Key，所有翻译请求必须经过 background 转发。

**理由**：降低 API Key 泄漏风险面，符合 CONSTRAINTS.md 中的安全约束。

**被否决的备选**：content script 直接持有 Key 并直连大模型 API（减少一次消息传递，但安全风险不可接受）。

---

## 004 — 新增"解释"场景，与翻译共用同一套 provider 基础设施

**背景**：需要支持用户对选中的词/事件请求解释，而不只是翻译。

**决定**：不为"解释"单独开一套 provider 调用逻辑，而是把 `Provider` 接口设计为场景无关的
`streamComplete(messages, options, callbacks)`，翻译和解释都通过 `prompts/{scenario}.ts`
构建各自的 `ChatMessage[]`，复用同一个 provider 实现。

**理由**：provider 层只关心"怎么跟厂商 API 对话"，不应该知道业务场景是什么，这样新增场景（比如以后的"总结"）
不需要改动任何 provider 代码。

**被否决的备选**：给每个 provider 加 `translate()` 和 `explain()` 两个独立方法（每加一个场景都要改一遍所有 provider 文件，不可扩展）。

---

## 005 — content ↔ background 的流式通信用长连接 Port，不用 sendMessage 轮询或一次性返回

**背景**：流式输出是硬需求（逐字显示模型生成过程），一次性 `chrome.runtime.sendMessage` 只能返回一个完整结果，不支持推送。

**决定**：翻译/解释请求用 `chrome.runtime.connect` 建立长连接 Port，background 通过 `port.postMessage`
持续推送 `STREAM_CHUNK`，直到 `STREAM_DONE` 或 `STREAM_ERROR`。用户取消时 content 调用 `port.disconnect()`，
background 监听 `onDisconnect` 中断底层请求。popup/options 的配置读写这类一次性场景继续用 `sendMessage`，两套通道并存。

**理由**：

- Port 是 Chrome 扩展里做双向持续通信的标准方式，不需要自己造轮询机制
- `onDisconnect` 天然提供了"取消请求"的信号来源，不需要额外设计取消协议

**被否决的备选**：

- 用短轮询（content 每隔 N ms 调用 `sendMessage` 问"有新内容吗"）—— 实现复杂、有延迟、白白消耗性能
- 一次性等待完整结果再返回（简单但放弃了流式体验，不满足需求）

**关联影响**：这个决定使 content script 的状态机变复杂（见 001 号决策的复议条件），
但评估后认为原生 DOM 状态机仍然能支撑，暂不引入框架。

---

## 006 — 版本号以 package.json 为唯一来源

**背景**：`manifest.config.ts` 与 `package.json` 各自维护一份 `version`（曾都是 `0.1.0`），
手动发版时容易改漏，导致 manifest 版本、git tag 与 Release 三者不一致。

**决定**：以 `package.json` 的 `version` 作为唯一来源，`manifest.config.ts` 通过
`import packageJson` 自动读取；发布工作流（`.github/workflows/create-tag.yml`）也读取
`package.json` 的版本号打 tag。发版时只改 `package.json` 一处。

**理由**：单一来源避免多处维护不一致；Chrome Web Store 上架读取的版本来自构建产物
`dist/manifest.json`，它由 `package.json` 生成，因此天然与 git tag、Release 保持一致。

**被否决的备选**：继续在 `manifest.config.ts` 中手写版本号（容易出现两处不同步，人工核对成本高）。

---

## 决策模板（复制这段填写新决策）

```
## 00X — 标题

**背景**：

**决定**：

**理由**：

**被否决的备选**：

**复议条件**（可选）：
```
