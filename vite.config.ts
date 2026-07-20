import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";

// 引入 manifest 配置（crxjs 支持从 TS 文件读取 manifest）
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
      "@providers": resolve(__dirname, "src/providers"),
      "@prompts": resolve(__dirname, "src/prompts"),
      "@components": resolve(__dirname, "src/components"),
    },
  },
});
