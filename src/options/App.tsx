import { useState, useEffect, useCallback } from "react";
import type { UserConfig, ProviderName } from "@shared/types";
import type { GetConfigRequest, SetConfigRequest } from "@shared/message";
import { DEFAULT_CONFIG, OPTIONS_TEXT, COMMON_TEXT } from "@shared/constants";
import styles from "./App.module.css";

/** 支持的厂商列表（后续扩展只需加条目） */
const PROVIDERS: { value: ProviderName; label: string; available: boolean }[] = [
  { value: "deepseek", label: "DeepSeek", available: true },
  { value: "openai", label: "OpenAI", available: false },
  { value: "anthropic", label: "Anthropic", available: false },
];

export default function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  // 页面加载时读取配置
  useEffect(() => {
    const getMsg: GetConfigRequest = { type: "GET_CONFIG_REQUEST" };
    chrome.runtime.sendMessage(getMsg, (response) => {
      const base = { ...DEFAULT_CONFIG };
      if (response?.type === "GET_CONFIG_RESPONSE" && response.payload) {
        // 合并配置并确保 apiKeys 始终是一个对象（防止 storage 中缺失此字段）
        const merged = { ...base, ...response.payload };
        if (!merged.apiKeys || typeof merged.apiKeys !== "object") {
          merged.apiKeys = {};
        }
        setConfig(merged as UserConfig);
      } else {
        // 降级为默认配置
        setConfig(base as UserConfig);
      }
    });
  }, []);

  // 保存配置
  const handleSave = useCallback(() => {
    if (!config) return;
    setSaveStatus("saving");
    const setMsg: SetConfigRequest = { type: "SET_CONFIG_REQUEST", payload: config };
    chrome.runtime.sendMessage(setMsg, (response) => {
      if (response?.type === "SET_CONFIG_RESPONSE" && response.payload?.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    });
  }, [config]);

  // 更新单个字段
  const updateField = useCallback(
    <K extends keyof UserConfig>(key: K, value: UserConfig[K]) => {
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSaveStatus("idle"); // 重置保存状态
    },
    [],
  );

  // 更新 API Key
  const updateApiKey = useCallback((provider: ProviderName, value: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        apiKeys: { ...prev.apiKeys, [provider]: value },
      };
    });
    setSaveStatus("idle");
  }, []);

  if (!config) {
    return (
      <div className={styles.container}>
        <p>{COMMON_TEXT.loading}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{OPTIONS_TEXT.title}</h1>

      {/* —— 厂商选择 —— */}
      <section className={styles.section}>
        <label className={styles.label}>{OPTIONS_TEXT.providerLabel}</label>
        <select
          className={styles.select}
          value={config.activeProvider}
          onChange={(e) => updateField("activeProvider", e.target.value as ProviderName)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value} disabled={!p.available}>
              {p.label}
              {p.available ? "" : OPTIONS_TEXT.comingSoon}
            </option>
          ))}
        </select>
      </section>

      {/* —— API Key —— */}
      <section className={styles.section}>
        <label className={styles.label}>{OPTIONS_TEXT.apiKeyLabel}</label>
        {PROVIDERS.map((p) => (
          <div key={p.value} className={styles.apiKeyRow}>
            <span className={styles.apiKeyLabel}>{p.label}</span>
            <input
              className={styles.input}
              type="password"
              placeholder={
                p.available
                  ? OPTIONS_TEXT.apiKeyPlaceholder
                  : OPTIONS_TEXT.apiKeyPlaceholderDisabled
              }
              disabled={!p.available}
              value={config.apiKeys[p.value] ?? ""}
              onChange={(e) => updateApiKey(p.value, e.target.value)}
            />
          </div>
        ))}
        <p className={styles.hint}>{OPTIONS_TEXT.apiKeyHint}</p>
      </section>

      {/* —— 目标语言 —— */}
      <section className={styles.section}>
        <label className={styles.label} htmlFor="targetLang">
          {OPTIONS_TEXT.targetLangLabel}
        </label>
        <input
          id="targetLang"
          className={styles.input}
          type="text"
          placeholder={OPTIONS_TEXT.targetLangPlaceholder}
          value={config.targetLang}
          onChange={(e) => updateField("targetLang", e.target.value)}
        />
      </section>

      {/* —— 保存 —— */}
      <div className={styles.saveRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving" ? OPTIONS_TEXT.saving : OPTIONS_TEXT.saveButton}
        </button>
        {saveStatus === "saved" && (
          <span className={styles.saveHint}>{OPTIONS_TEXT.saved}</span>
        )}
        {saveStatus === "error" && (
          <span className={styles.saveError}>{OPTIONS_TEXT.saveError}</span>
        )}
      </div>
    </div>
  );
}
