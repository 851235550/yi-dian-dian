# 译点点

> 选中即译，选中即解 —— AI 驱动的划词翻译 Chrome 插件。

在任意网页上选中文字，选区末尾出现悬浮球，点击即可获得 AI 翻译或知识解释。

## 特性

- 🫧 **两步交互**：选中文字 → 悬浮球 → 点击展开面板，不打扰阅读
- 🌊 **流式输出**：翻译和解释结果逐字显示，所见即所得
- 📖 **单词详解**：英文单词翻译时输出音标（IPA）、词性、释义、用法、例句
- 🔊 **单词发音**：选中单个英文单词，输出 IPA 音标、近似中文读音、音节与重音，并区分 gonna 等口语缩略形式
- 💡 **知识解释**：选中术语、人名、事件，用中文解释背景和含义
- ⚡ **15 天缓存**：查过的词自动缓存，再次遇到秒出结果，不消耗 API 配额
- 🪟 **玻璃质感 UI**：Apple 风格的磨砂玻璃悬浮面板，低调融入页面
- 🔒 **隐私优先**：API Key 仅存本地，请求直连厂商，无中间服务器

## 安装

> **注意**：插件尚未上架 Chrome Web Store，安装时需要开启开发者模式。上架后将支持一键安装。

### 方式一：下载 Release（推荐）

1. 前往 [Releases](https://github.com/851235550/yi-dian-dian/releases) 页面
2. 下载最新版本的 `yi-dian-dian.zip`
3. 解压到任意文件夹
4. 打开 `chrome://extensions`，开启「开发者模式」
5. 点击「加载已解压的扩展程序」，选择解压后的文件夹
6. 右键插件图标 → 选项，填入 DeepSeek API Key，保存

### 方式二：本地构建

```bash
pnpm install && pnpm build
```

然后将 `dist/` 文件夹加载到 `chrome://extensions` 即可。

## 配置 API Key

1. 前往 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 获取 API Key
2. 右键插件图标 → 选项，填入 Key
3. 设置翻译目标语言（默认中文），保存

## 使用方式

1. 在任意网页上**选中一段文字**
2. 选区末尾出现蓝色小球「译」
3. 点击小球，展开翻译面板（默认显示翻译结果）
4. 点击面板顶部的「解释」tab 可切换为知识解释，「发音」tab 可查看单词发音
5. 按 `Esc` 或点击面板外部关闭

## 开发

### 环境要求

- Node.js >= 18 / pnpm >= 8 / Chrome 最新稳定版

### 本地运行

```bash
pnpm install    # 安装依赖
pnpm dev        # 启动开发模式，dist/ 加载到 chrome://extensions
```

### 可用脚本

| 命令             | 说明                      |
| ---------------- | ------------------------- |
| `pnpm dev`       | 开发模式，Vite 构建 + HMR |
| `pnpm build`     | 生产构建                  |
| `pnpm typecheck` | TypeScript 类型检查       |
| `pnpm lint`      | ESLint 代码检查           |
| `pnpm test`      | Vitest 测试               |

### 版本号约定

- `package.json` 的 `version` 是唯一版本来源，发版时只需修改这一处
- `manifest.config.ts` 会从 `package.json` 自动读取版本号，请勿手动修改
- 发布工作流会读取 `package.json` 的版本号自动创建 git tag 与 Release

## 支持的厂商

| 厂商      | 状态      |
| --------- | --------- |
| DeepSeek  | ✅ 已支持 |
| OpenAI    | 🚧 规划中 |
| Anthropic | 🚧 规划中 |

## 技术栈

- TypeScript（strict）
- React 18（popup / options）
- CSS Modules
- Shadow DOM + 原生 DOM（content script 悬浮框）
- Vite + @crxjs/vite-plugin
- Chrome Manifest V3

## 隐私

不收集任何用户数据。API Key 仅存在 `chrome.storage.local`，请求从浏览器直发厂商 API，不经过任何中间服务器。翻译缓存只存本地，15 天自动清理。

## 许可证

MIT
