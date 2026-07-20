import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "译点点",
  version: "0.1.0",
  description: "在任意网页选中文字，AI 即时翻译（含音标词性）与知识解释",

  // 权限最小化：只申请当前功能实际需要的（见 CONSTRAINTS.md）
  permissions: ["storage", "activeTab"],

  // 插件图标（先用占位说明，后续补充图标文件）
  // icons: {
  //   "16": "src/assets/icon16.png",
  //   "48": "src/assets/icon48.png",
  //   "128": "src/assets/icon128.png",
  // },

  action: {
    default_popup: "src/popup/index.html",
    // default_icon: "src/assets/icon48.png",
  },

  // options 页面
  options_page: "src/options/index.html",

  // service worker（background）
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  // content script：匹配所有 http/https 页面
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
});
