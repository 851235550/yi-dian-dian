# TASK.md

> 每次给 AI 分配任务前，在这里写清楚任务范围和验收标准。
> 完成后把任务移到底部的"已完成"区块并保留验收记录，方便追溯。
> 一次只放 1 个正在进行的任务，避免 AI 在多个任务间来回横跳导致代码状态混乱。

## 使用方式

1. 在"当前任务"里填写目标、范围、验收标准
2. 明确标出"不要做的事"（防止 AI 顺手重构无关代码）
3. AI 完成后对照验收标准自查，全部满足才算完成
4. 人工 review 通过后移到"已完成任务"

---

## 当前任务

### 任务标题

项目脚手架搭建（Vite + @crxjs/vite-plugin + MV3 基础结构）

### 背景

全新仓库，尚无任何代码。需要先建立一个能 `pnpm dev` 加载进 Chrome、看到插件图标、
popup 能打开的最小骨架，后续所有任务都建立在这个骨架之上。

### 目标范围

- [ ] `package.json`：初始化，包管理用 pnpm；添加 vite、@crxjs/vite-plugin、react、typescript 等依赖
- [ ] `vite.config.ts`：接入 `@crxjs/vite-plugin`
- [ ] `tsconfig.json`：strict 模式开启，路径别名按 AGENTS.md 目录结构配置（如 `@shared/*`、`@providers/*`）
- [ ] `manifest.json`（或 `manifest.config.ts`，crxjs 支持用 TS 写 manifest）：
      MV3，`permissions` 先只加 `storage`、`contextMenus`、`activeTab`（按 CONSTRAINTS.md 权限最小化原则）
- [ ] 按 AGENTS.md 的目录结构，建立空目录 + 每个目录下放一个占位文件（`popup/`、`options/`、`content/`、
      `background/`、`providers/`、`prompts/`、`components/`、`shared/`）
- [ ] `popup/`：最小可用的 React 入口，打开插件图标能看到一个"Hello"页面即可，不做实际功能
- [ ] `background/index.ts`：最小 service worker，能在 `chrome://extensions` 里看到已注册、无报错
- [ ] `content/index.ts`：最小 content script，注入后 `console.log` 一行确认能跑（先不做选中检测）
- [ ] ESLint + Prettier 配置
- [ ] `.gitignore`（`node_modules`、`dist`、`.env` 等）
- [ ] `README.md`（面向人类的项目说明：怎么本地跑起来、怎么加载到 Chrome，跟 AGENTS.md 面向 AI 的定位不同，两者都要）
- [ ] 把 AGENTS.md / CONSTRAINTS.md / ARCHITECTURE.md / TASK.md / DECISIONS.md 放到仓库根目录

### 明确不要做的事

- 不实现任何实际的翻译/解释业务逻辑（包括 provider、prompts 的具体内容，本任务只搭骨架）
- 不接入真实的大模型 API 调用
- 不做 options 页面的具体表单内容，占位即可
- 不引入 CONSTRAINTS.md 未提及的额外权限

### 验收标准

- [ ] `pnpm install` 后 `pnpm dev` 能正常启动构建
- [ ] `dist/` 目录能作为"已解压的扩展程序"加载进 `chrome://extensions`，没有报错
- [ ] 点击插件图标，popup 能正常弹出显示内容
- [ ] `pnpm typecheck`、`pnpm lint` 均能跑通（哪怕代码内容很少）
- [ ] 目录结构与 AGENTS.md 描述的一致
- [ ] `manifest.json` 中的权限与 CONSTRAINTS.md 描述的一致，没有多余权限

### 参考资料

- AGENTS.md：目录结构、开发命令章节
- CONSTRAINTS.md：权限最小化章节

---

## 任务队列（按顺序排队，暂不启动）

### 队列任务 1：实现流式输出基础设施 + "解释"场景（第一版：DeepSeek provider）

（详细内容见下方"已归档的完整任务卡"，脚手架任务验收通过后启动这个任务，
启动前请重新确认 ARCHITECTURE.md 是否有过更新）

<details>
<summary>展开完整任务卡</summary>

#### 背景

产品决定支持"解释选中词/事件"功能，且流式输出（逐字显示）是硬需求。
详见 ARCHITECTURE.md「流式输出架构」章节、DECISIONS.md 004/005。

#### 目标范围

- [ ] `shared/message.ts`：新增 `StreamRequest` / `StreamMessage`（STREAM_CHUNK/DONE/ERROR）类型定义
- [ ] `providers/types.ts`：新增 `ChatMessage` / `CompletionOptions` / `StreamCallbacks` / `Provider`（含 `streamComplete`）类型
- [ ] `providers/deepseek.ts`：实现 `streamComplete`，含 SSE 分片解析、AbortController 支持
- [ ] `prompts/explain.ts`：新增，返回纯文本要求的 system prompt + 用户选中内容拼装的 messages
- [ ] `prompts/translate.ts`：改造为返回 `ChatMessage[]`，适配新的 provider 接口
- [ ] `background/`：新增 Port 连接处理（`chrome.runtime.onConnect`），维护 port ↔ abort 映射，处理 `onDisconnect`
- [ ] `content/`：悬浮框加"翻译/解释"切换入口；实现 `idle/streaming/done/error` 状态机；建立 Port、逐字追加渲染、发起 `disconnect`
- [ ] 悬浮框内容区域支持滚动 + 自动滚底（用户手动上滚后暂停自动滚动）

#### 明确不要做的事

- 不实现 OpenAI / Anthropic provider（本任务只做 DeepSeek，其他厂商后续任务跟进）
- 不做"根据选中内容自动判断翻译还是解释"的智能推荐，本版本用户手动选场景
- 不做流式中断后的自动重连机制
- 不引入 Markdown 渲染库，通过 prompt 要求纯文本输出规避

#### 验收标准

- [ ] `pnpm typecheck` / `pnpm lint` 通过
- [ ] 选中文字点击"翻译"，悬浮框逐字显示译文，最终状态为 done
- [ ] 选中文字点击"解释"，悬浮框逐字显示解释内容，能正常滚动
- [ ] 流式过程中关闭悬浮框，确认底层请求真的中断（不是继续跑完只是不展示）
- [ ] API Key 无效时，悬浮框展示可读错误信息，而不是卡在 loading 状态
- [ ] 快速连续选中多段文字，不出现"上一次的流式结果串到这次结果里"的错乱
- [ ] 符合 AGENTS.md 中 Provider 层与 content script 的编码规范

</details>

---

---

## 已完成任务

（完成后从上面移下来，保留一行摘要 + 完成日期，细节可以删掉）

- [x] 示例：项目脚手架搭建（Vite + @crxjs/vite-plugin） —— 2026-XX-XX
