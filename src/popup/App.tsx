import { useState, useEffect } from "react";
import type { UserConfig } from "@shared/types";
import { DEFAULT_CONFIG } from "@shared/constants";
import styles from "./App.module.css";

export default function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);

  // 读取当前配置（确认 API Key 是否已配置）
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_CONFIG_REQUEST" }, (response) => {
      if (response?.type === "GET_CONFIG_RESPONSE" && response.payload) {
        const merged = { ...DEFAULT_CONFIG, ...response.payload };
        if (!merged.apiKeys) merged.apiKeys = {};
        setConfig(merged as UserConfig);
      } else {
        setConfig({ ...DEFAULT_CONFIG, apiKeys: {} } as UserConfig);
      }
    });
  }, []);

  // 打开选项页
  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const activeKey = config?.apiKeys?.[config?.activeProvider ?? "deepseek"];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>译点点</h1>
      <p className={styles.subtitle}>划词翻译 · 解释</p>

      {!config ? (
        <p className={styles.hint}>加载中…</p>
      ) : activeKey ? (
        <div className={styles.statusOk}>
          <p>✅ DeepSeek API Key 已配置</p>
          <p className={styles.usageHint}>
            在任意网页上<b>选中文字</b>，悬浮框会自动弹出并翻译。
          </p>
        </div>
      ) : (
        <div className={styles.statusWarn}>
          <p>⚠️ 尚未配置 API Key</p>
          <button className={styles.btn} onClick={openOptions}>
            前往设置
          </button>
        </div>
      )}

      <button className={styles.settingsLink} onClick={openOptions}>
        ⚙ 设置
      </button>
    </div>
  );
}
