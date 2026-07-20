# 译点点

> 划词翻译 Chrome 插件 —— 选中即译，选中即解。

在任意网页上选中文字，弹出悬浮框，调用大模型 API（DeepSeek / OpenAI / Anthropic）对选中内容进行**翻译**或**解释**。

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Chrome 最新稳定版

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm dev
```

### 加载到 Chrome

1. 打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目根目录下的 `dist/` 文件夹
5. 插件图标出现在工具栏，即可使用

### 配置 API Key

插件首次使用前需要在设置页（右键插件图标 → 选项）或 popup 中配置至少一个厂商的 API Key。

## 可用脚本

| 命令             | 说明                                   |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | 开发模式，启动 Vite 构建并监听文件变化 |
| `pnpm build`     | 生产构建（先 tsc 检查再 vite build）   |
| `pnpm typecheck` | TypeScript 类型检查（不输出文件）      |
| `pnpm lint`      | ESLint 代码检查                        |
| `pnpm test`      | 运行 Vitest 测试                       |

## 功能

- ✅ 划词翻译（选中文字 → 悬浮框流式输出译文）
- ✅ 划词解释（选中术语/人名/事件 → 流式输出中文解释）
- 🚧 总结（规划中）
- 🚧 右键菜单触发（规划中）
- 🚧 快捷键触发（规划中）

## 技术栈

- TypeScript（strict）
- React 18（popup / options 页面）
- CSS Modules
- Vite + @crxjs/vite-plugin
- Manifest V3

## 隐私

本插件不收集任何用户数据。API Key 仅存储在用户本地的 Chrome 存储中，所有 API 请求直接从用户浏览器发往对应厂商，不经过任何中间服务器。

## 许可证

MIT
