# CONSTRAINTS.md

> 硬性约束。AI 在写代码前必须确认没有违反下列任何一条。
> 如果某个任务要求与本文件冲突，先在 TASK.md 里标注冲突，不要擅自违反后继续。

## Manifest V3 限制

- `background` 是 service worker，**没有持久 DOM/window**，不能用 `document`、`window.localStorage`。
- service worker **会被系统随时休眠**，不能依赖内存中的全局变量保存状态（比如"正在进行的翻译任务列表"），需要状态就存 `chrome.storage`。
- **流式请求期间**：background 用内存变量（Map）保存"port ↔ abort 函数"的映射是允许的，因为这个状态只在单次请求的生命周期内有意义，进程被杀直接意味着请求失败，用户重新触发即可，不需要持久化。但不要用同样的方式保存"需要跨会话保留的数据"（比如翻译历史）。
- 所有流式请求**必须**支持中断（`AbortController` + `port.onDisconnect`），不允许"请求发出去就没法取消"的实现，否则用户快速切换选中内容时会产生大量僵尸请求，浪费 API 配额。
- 不允许远程加载可执行代码（`eval`、远程 `<script src>`），Chrome Web Store 审核会拒绝。API 调用返回的必须是数据，不能是代码。
- `content_security_policy` 默认较严格，第三方库如需要 `unsafe-eval` 之类的能力，先在这里确认可行再引入。

## 权限最小化

- `manifest.json` 里的 `permissions` / `host_permissions` 只申请当前功能实际需要的，不要预先申请"以后可能用到"的权限（会影响用户安装转化率和审核速度）。
- 当前预期权限：`storage`、`contextMenus`、`activeTab`。如需新增权限，必须在 TASK.md 里说明理由。
- 不申请 `<all_urls>` 除非明确必要，优先用 `activeTab` + 用户主动触发的方式。

## 安全

- API Key 只存 `chrome.storage.local`，**禁止**：
  - 打包进代码（不能写死在 provider 文件里当默认值）
  - 出现在任何 `console.log`
  - 通过 `postMessage` 广播给页面 context（只在 extension 内部 context 间传递）
- 所有发往大模型 API 的请求必须走 `background`，content script 不直接持有或使用 API Key。
- 用户选中的文本可能包含敏感信息（密码框旁边的文字、私密聊天内容），不做任何形式的本地缓存落盘，除非用户在设置里显式开启"翻译历史"。

## 性能

- content script 注入代码体积是硬指标：初始注入的 JS **不超过 50KB（gzip 前）**，超出需要考虑动态 import 或换用更轻量方案。
- 悬浮框首次展示到用户看到"加载中"状态之间的延迟 **不超过 100ms**（网络请求另算，这里指 UI 渲染本身）。
- 不在 `mouseup` 事件里做重计算，选中检测逻辑要 debounce 或者足够轻量。
- 流式分片到达后，DOM 更新（追加文字）**不允许**每个字符触发一次布局重排；小批量分片直接 append 文本节点即可，不需要额外做 diff/虚拟 DOM。
- 悬浮框内容区域随流式内容增长时，**默认自动滚动到底部**，但用户手动向上滚动查看历史内容后应暂停自动滚动，避免抢夺用户的滚动位置（这是常见的流式 UI 体验坑，务必处理）。

## 兼容性

- 目标 Chrome 版本：最新稳定版及前 2 个大版本。
- 不考虑 Firefox / Safari 兼容（除非后续任务明确要求，跨浏览器需要 webextension-polyfill，目前不引入）。
- 悬浮框需要在常见网站上不错位：需处理页面滚动、页面自身有 `transform` 导致定位计算错误的情况。

## 依赖引入原则

- 新增 npm 依赖前先确认：包体积、最近维护时间、是否有已知安全漏洞。
- content script 相关依赖要格外谨慎（体积敏感），background/popup/options 相对宽松。
- 禁止引入带有远程遥测/分析上报功能的第三方库，除非明确经过审查。

## 已知会拒审 / 需要规避的红线

- 不做与"翻译"无关的用户行为追踪。
- 隐私政策链接、权限说明文案要在上架前补齐（这条不是代码任务，但列在这里防止遗漏）。
- 不做"修改用户浏览的网页内容"之外的注入行为（比如不能顺带植入广告、跟踪脚本）。
