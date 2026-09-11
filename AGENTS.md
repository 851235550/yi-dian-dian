# AGENTS.md

> 本文件是给 AI coding agent（Claude Code / Cursor 等）看的项目说明。
> 每次开始任务前，请先完整阅读本文件、CONSTRAINTS.md、ARCHITECTURE.md。

## 项目是什么

一个 Chrome 插件：用户在网页上选中文字，弹出悬浮框，调用大模型 API（OpenAI / DeepSeek / Anthropic）
对选中内容进行翻译 / 解释 / 总结。

## 技术栈

- TypeScript（strict 模式）
- React 18（仅用于 popup / options 页面）
- CSS Modules（仅用于 popup / options 页面）
- Manifest V3
- 构建工具：Vite + @crxjs/vite-plugin
- 包管理：pnpm

**content script 悬浮框不使用 React**，使用原生 DOM + Shadow DOM，理由见 ARCHITECTURE.md。

## 目录结构

```
src/
├── popup/          # React + CSS Modules，插件工具栏弹窗
├── options/        # React + CSS Modules，设置页
├── content/         # 原生 DOM + Shadow DOM，划词悬浮框
├── background/      # service worker，消息路由 + API 调用编排
├── providers/        # 各大模型厂商的统一封装
├── prompts/          # 场景化 prompt 模板（翻译/解释/总结）
├── components/       # popup 与 options 共用的 UI 组件
└── shared/            # 类型定义、storage 封装、消息协议、常量
```

## 开发命令

```bash
pnpm install
pnpm dev        # 开发模式，加载 dist/ 到 chrome://extensions
pnpm build      # 生产构建
pnpm typecheck  # tsc --noEmit
pnpm lint       # eslint
pnpm test       # vitest
```

## 编码规范

### 通用

- 所有跨 context（popup/content/background）传递的消息必须在 `shared/message.ts` 中定义类型，禁止裸 `chrome.runtime.sendMessage({...})` 不带类型。
- 禁止 `any`，确需使用未知类型时用 `unknown` + 类型收窄。
- 异步函数必须处理错误，禁止裸 `await fetch(...)` 不 try/catch（API 调用会失败：网络错误、限流、Key 无效）。
- 所有面向用户的文案（悬浮框文字、错误提示）统一放在 `shared/constants.ts` 或未来的 i18n 文件中，禁止硬编码在组件里。
- 要有有意义的中文注释。
- 版本号以 `package.json` 为唯一来源，`manifest.config.ts` 自动读取。修改代码后若涉及功能/行为变更，需按 semver 更新 `package.json` 的 `version`，不要手动修改 manifest 中的版本号。

### Provider 层示例（新增厂商时严格照抄此模式）

**重要**：Provider 接口是**流式**的，不是"返回一整段 Promise<string>"。因为翻译和解释共用同一套 provider，
且解释场景的流式体验是硬需求（见 DECISIONS.md 005），所有厂商必须实现 `streamComplete`。

```typescript
// providers/types.ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  apiKey: string;
  model?: string;
}

export interface StreamCallbacks {
  onChunk(delta: string): void;
  onDone(fullText: string): void;
  onError(error: ProviderError): void;
}

export interface ProviderError {
  message: string;
  code?: "INVALID_KEY" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN";
}

// 返回一个 abort 函数，调用后中断请求（用户关闭悬浮框/切换场景时调用）
export type AbortFn = () => void;

export interface Provider {
  name: string;
  streamComplete(
    messages: ChatMessage[],
    options: CompletionOptions,
    callbacks: StreamCallbacks,
  ): AbortFn;
}

// providers/deepseek.ts
export const deepseekProvider: Provider = {
  name: "deepseek",
  streamComplete(messages, options, callbacks) {
    const controller = new AbortController();

    fetch("https://api.deepseek.com/chat/completions", {
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
        if (!response.ok || !response.body) {
          callbacks.onError({
            message: `HTTP ${response.status}`,
            code: "UNKNOWN",
          });
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        // 解析 SSE 分片，逐块调用 onChunk，读完调用 onDone(fullText)
        // 具体 SSE 解析逻辑省略
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // 用户主动取消，不算错误
        callbacks.onError({ message: err.message, code: "NETWORK" });
      });

    return () => controller.abort();
  },
};
```

新增 provider 时：

1. 在 `providers/` 下新建文件，实现 `Provider` 接口（含 `streamComplete`）
2. 在 `providers/index.ts` 的工厂函数里注册
3. 不要在 `background/` 或 `content/` 里出现 `if (provider === 'xxx')` 这种分支判断
4. **必须**正确处理 `AbortError`（用户取消不算失败，不要调用 `onError`）
5. **必须**返回可用的 abort 函数，不能是空函数占位

### React 组件（popup / options）

- 函数组件 + hooks，不用 class 组件
- 每个组件一个文件，样式用同名 `.module.css`
- Props 必须有 TS interface，禁止 inline 匿名类型

### content script

- 所有 DOM 操作必须在 Shadow Root 内进行，禁止直接修改宿主页面的全局样式
- 悬浮框必须支持 `Esc` 关闭、点击外部关闭
- 必须处理 iframe 场景（至少不报错，可以先不支持功能）
- 悬浮框内容区域必须支持滚动 + 有最大高度限制（解释场景内容可能较长）
- 悬浮框状态机至少包含：`idle` → `streaming`（逐字追加）→ `done` / `error`，禁止用单一 `loading: boolean` 简化处理
- 悬浮框关闭、用户切换"翻译/解释"模式、用户在结果还没生成完时选中新文本，这三种情况都必须调用当前请求的 abort 函数，禁止让旧的流式请求在后台继续写入已经不存在的 UI

## 提交前自检清单

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm lint` 通过
- [ ] 新增的跨 context 消息已在 `shared/message.ts` 定义类型
- [ ] 新增/修改的 provider 已实现完整 `Provider` 接口
- [ ] API Key 等敏感信息未出现在 console.log 或代码注释里
- [ ] 没有引入未在 CONSTRAINTS.md 允许列表内的第三方依赖
- [ ] 新增/修改的 provider 实现了 `streamComplete`，abort 函数真实可用
- [ ] 流式请求在用户取消/关闭悬浮框时正确中断，没有内存泄漏或写入已卸载 DOM 的情况
- [ ] Port 断开（`port.onDisconnect`）已处理，background 侧对应 abort 了底层 fetch
- [ ] 本次改动涉及功能/行为变更时，`package.json` 的 `version` 已按 semver 更新

## 相关文档

- `CONSTRAINTS.md` —— 技术与产品硬约束，违反会导致插件被拒审或有安全问题
- `ARCHITECTURE.md` —— 模块职责与通信协议
- `TASK.md` —— 当前任务与验收标准
- `DECISIONS.md` —— 历史技术决策记录，改动前请先查阅是否已有定论
