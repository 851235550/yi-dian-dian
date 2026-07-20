import { useState, useEffect } from "react";
import type { UserConfig } from "@shared/types";
import type { GetConfigRequest } from "@shared/message";
import { DEFAULT_CONFIG, POPUP_TEXT, COMMON_TEXT } from "@shared/constants";
import styles from "./App.module.css";

export default function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);

  // 读取当前配置（确认 API Key 是否已配置）
  useEffect(() => {
    const msg: GetConfigRequest = { type: "GET_CONFIG_REQUEST" };
    chrome.runtime.sendMessage(msg, (response) => {
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
      <h1 className={styles.title}>{POPUP_TEXT.title}</h1>
      <p className={styles.subtitle}>{POPUP_TEXT.subtitle}</p>

      {!config ? (
        <p className={styles.hint}>{COMMON_TEXT.loading}</p>
      ) : activeKey ? (
        <div className={styles.statusOk}>
          <p>
            ✅ {config?.activeProvider} {POPUP_TEXT.keyConfigured}
          </p>
          <p className={styles.usageHint}>{POPUP_TEXT.usageHint}</p>
        </div>
      ) : (
        <div className={styles.statusWarn}>
          <p>{POPUP_TEXT.keyNotConfigured}</p>
          <button className={styles.btn} onClick={openOptions}>
            {POPUP_TEXT.goToSettings}
          </button>
        </div>
      )}

      <button className={styles.settingsLink} onClick={openOptions}>
        {POPUP_TEXT.settings}
      </button>
    </div>
  );
}
