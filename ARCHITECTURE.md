# ARCHITECTURE.md

## 整体数据流（流式）

翻译和解释都是流式响应，content 与 background 之间用长连接 `Port`（`chrome.runtime.connect`），
不用一次性的 `sendMessage`。popup / options 读写配置这类"一问一答"场景仍然用 `sendMessage`，两种通道并存，用途不同不要混用。

```
用户选中文字 / 点击"翻译"或"解释" (content script)
        │
        ▼
content 建立 Port 连接 → background（携带 scenario: translate | explain）
        │
        ▼
background 读取 storage 中的用户配置(provider/apiKey/targetLang)
        │
        ▼
background 用 prompts/{scenario}.ts 构建通用 ChatMessage[]
        │
        ▼
background 调用 providers/{provider}.ts 的 streamComplete()
        │
        ├── onChunk(delta)  → background 通过 port.postMessage 转发每个分片 → content 逐字追加渲染
        ├── onDone(fullText) → background 发送 STREAM_DONE → content 切换到 done 状态
        └── onError(error)   → background 发送 STREAM_ERROR → content 展示错误 + 重试按钮

用户关闭悬浮框 / 切换场景 / 选中新文本
        │
        ▼
content 调用 port.disconnect()
        │
        ▼
background 的 port.onDisconnect 触发 → 调用 streamComplete 返回的 abort() → 中断底层 fetch
```

popup / options 与 background 之间是另一条独立的消息通道（`sendMessage`），只用于读写用户配置，不涉及流式数据。

## 为什么 content script 悬浮框不用 React

1. content script 会被注入到每一个匹配的网页里，React 运行时会增加每个页面的 JS 体积和解析耗时。
2. 悬浮框状态简单（loading / success / error 三态 + 文本内容），用原生 DOM 状态机完全够用，不需要引入框架开销。
3. Shadow DOM + 原生 DOM 操作在样式隔离上更直接可控。

如果后续悬浮框交互复杂度显著上升（比如要支持多轮追问、历史记录列表滚动），可以重新评估引入 Preact（体积远小于 React）。这个决策变更需要在 DECISIONS.md 里记录。

## 模块职责

### `content/`

- 监听 `mouseup`，判断是否有有效文本选中（排除输入框内选中、排除空白/纯符号选中）
- 计算悬浮框应该出现的位置（基于 `Range.getBoundingClientRect()`）
- 创建/管理 Shadow Root，挂载悬浮框 DOM
- 悬浮框提供"翻译"/"解释"两个入口（按钮或右键菜单触发），用户选择场景后建立 Port 连接
- 维护流式状态机（`idle` → `streaming` → `done`/`error`），接收 STREAM_CHUNK 逐字追加渲染
- 用户关闭悬浮框/切场景/新选中文本时主动 `port.disconnect()`
- 不直接调用任何大模型 API，不持有 API Key

### `background/`

- service worker，插件生命周期内的唯一"协调者"
- 监听来自 content 的 Port 连接（流式场景）和来自 popup / options 的一次性消息（配置读写）
- 根据 Port 连接携带的 `scenario` 字段，用 `prompts/{scenario}.ts` 构建消息，再调用对应 provider 的 `streamComplete`
- 把 provider 的 `onChunk`/`onDone`/`onError` 回调转发为 Port 消息发回 content
- 监听 `port.onDisconnect`，调用之前保存的 abort 函数中断请求，防止连接断开后请求还在后台跑
- 处理右键菜单（contextMenus）事件，菜单项区分"翻译选中内容"/"解释选中内容"
- 不做任何 DOM 操作（也做不了）

### `providers/`

- 每个厂商一个文件，实现统一的 `Provider` 接口（见 AGENTS.md），核心方法是 `streamComplete`
- 只负责"如何跟这家厂商的 API 打交道"（SSE 解析、鉴权头、错误码归一化），不关心是翻译还是解释
- `index.ts` 提供 `createProvider(config): Provider` 工厂函数

### `prompts/`

- 按场景（translate / explain / summarize）组织
- 每个文件导出一个函数：`buildMessages(input, options) → ChatMessage[]`，返回厂商无关的通用消息格式
- `explain.ts` 的 prompt 需要在 system 消息里明确要求"纯文本输出，不要 Markdown 格式"，
  避免 content script 需要额外引入 Markdown 渲染库（见 CONSTRAINTS.md 注入体积限制）
- 厂商特定的格式转换（比如是否需要单独的 system 字段）在 provider 内部做，不在这里做

### `popup/` `options/`

- 标准 React 应用，负责展示和写入用户配置
- 通过 `shared/storage.ts` 读写 `chrome.storage`，不直接调用 `chrome.storage.local.get/set`

### `shared/`

- `types.ts`：全局共享类型（StorageSchema、Message 联合类型等）
- `storage.ts`：类型安全的 storage 读写封装
- `message.ts`：content ↔ background ↔ popup 之间的消息类型定义 + 发送辅助函数
- `constants.ts`：文案、默认配置、枚举值

## 消息协议约定

两套通道，用途不同，不要混用：

### 1. 流式场景（translate / explain）—— 用 Port

content 用固定的 port name 建立连接：

```typescript
const port = chrome.runtime.connect({ name: "ai-stream" });
```

Port 上收发的消息类型（在 `shared/message.ts` 定义）：

```typescript
type Scenario = "translate" | "explain";

// content → background，连接建立后发送的第一条消息
type StreamRequest = {
  type: "STREAM_REQUEST";
  payload: { scenario: Scenario; text: string; targetLang?: string };
};

// background → content
type StreamMessage =
  | { type: "STREAM_CHUNK"; payload: { delta: string } }
  | { type: "STREAM_DONE"; payload: { fullText: string } }
  | { type: "STREAM_ERROR"; payload: { message: string; code?: string } };
```

规则：

- 一个 Port 连接只对应一次请求生命周期，请求结束（done/error）后 content 主动 `port.disconnect()`
- 用户中途取消，content 直接 `port.disconnect()`，不需要额外发消息告知 background，background 靠 `onDisconnect` 感知
- background 收到 `port.onDisconnect` 必须调用保存的 abort 函数，这是防止"僵尸请求"的唯一保障，不能省略

### 2. 一次性请求（配置读写等）—— 用 sendMessage

popup / options 与 background 之间读写配置这类场景，用普通的一次性消息：

```typescript
type OneShotMessage =
  | { type: "GET_CONFIG_REQUEST" }
  | { type: "GET_CONFIG_RESPONSE"; payload: UserConfig }
  | { type: "SET_CONFIG_REQUEST"; payload: Partial<UserConfig> }
  | { type: "SET_CONFIG_RESPONSE"; payload: { success: boolean } };
```

新增消息类型时，判断它是"一次性问答"还是"需要持续推送数据"，分别加到对应的联合类型里，
禁止把流式场景塞进 `sendMessage`（会导致要么假流式一次性返回，要么被迫轮询，两者都不符合体验要求）。

## Storage Schema（草案，随开发迭代更新）

```typescript
interface StorageSchema {
  config: {
    activeProvider: "openai" | "deepseek" | "anthropic";
    apiKeys: Partial<Record<Provider["name"], string>>;
    targetLang: string;
    shortcutEnabled: boolean;
  };
  // 翻译历史，默认不开启
  history?: Array<{ text: string; result: string; timestamp: number }>;
}
```

## 流式架构的已知风险

- **service worker 休眠**：MV3 的 background 是 service worker，理论上会被系统回收。实测中，
  有活跃的 Port 连接或未完成的 `fetch` 期间通常不会被回收，但这不是官方文档承诺的强保证。
  如果后续发现流式过程中 background 偶发被杀导致流中断，需要考虑：content 侧检测到 Port 异常断开时
  自动重连 + 提示用户"连接中断，正在重试"，而不是静默失败。这个方案先不预先实现，出现问题再加（YAGNI）。
- **多个并发流式请求**：用户快速切换选中文本可能导致上一个流还没结束又发起新请求。background 侧
  一个 Port 只处理一个请求，新连接不影响旧连接，但要注意如果同一个 content 页面允许多个悬浮框实例，
  需要在 content 侧自行保证同时只有一个活跃 Port（第一版按"同时只允许一个悬浮框"设计，简化状态管理）。
