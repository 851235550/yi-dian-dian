/**
 * content/floating-panel.ts —— 悬浮框核心类
 *
 * 使用原生 DOM + Shadow DOM 构建划词悬浮框。
 * 维护流式状态机：idle → streaming → done / error
 */

import type { Scenario, StreamMessage } from "@shared/message";
import { STREAM_PORT_NAME } from "@shared/message";
import { SCENARIO_LABELS, STATUS_TEXT, BUTTON_TEXT, ERROR_MESSAGE, PANEL_ERROR } from "@shared/constants";

// ========== 状态机 ==========

type PanelState = "idle" | "streaming" | "done" | "error";

// ========== 样式常量（注入 Shadow DOM） ==========

const PANEL_STYLES = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #1a1a1a;
}

.panel {
  width: 360px;
  max-height: 360px;
  /* Apple 风格玻璃效果 */
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 14px;
  /* 外阴影 + 内高光模拟玻璃厚度 */
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.4) inset,
    0 1px 4px rgba(0, 0, 0, 0.04),
    0 4px 20px rgba(0, 0, 0, 0.07),
    0 8px 40px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: opacity 0.15s ease;
}

/* ---- Tab 栏 ---- */

.tab-bar {
  display: flex;
  align-items: center;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
  padding: 0 10px;
  gap: 2px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.3);
}

.tab {
  padding: 8px 14px;
  font-size: 13px;
  color: #999;
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
  flex-shrink: 0;
}

.tab:hover {
  color: #666;
}

.tab.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
  font-weight: 500;
}

.tab-close {
  margin-left: auto;
  padding: 4px 8px;
  font-size: 16px;
  color: #bbb;
  cursor: pointer;
  border: none;
  background: none;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.tab-close:hover {
  color: #666;
}

/* ---- 内容区域 ---- */

.content-area {
  padding: 12px 14px;
  overflow-y: auto;
  flex: 1;
  min-height: 40px;
  max-height: 280px;
  word-break: break-word;
  white-space: pre-wrap;
}

.content-area.scroll-disable {
  /* 用户手动上滚后由 JS 控制滚动，不强制 snap */
}

.content-area.loading {
  color: #999;
  font-size: 13px;
}

.content-area.error {
  color: #e74c3c;
  font-size: 13px;
}

/* ---- 底部操作栏 ---- */

.action-bar {
  display: flex;
  align-items: center;
  padding: 6px 14px 10px;
  gap: 8px;
  flex-shrink: 0;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.25);
}

.action-bar.hidden {
  display: none;
}

.btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 0.5px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.55);
  color: #555;
  transition: all 0.2s ease;
}

.btn:hover {
  border-color: rgba(22, 119, 255, 0.25);
  color: #1677ff;
  background: rgba(22, 119, 255, 0.06);
}

.btn-primary {
  background: rgba(22, 119, 255, 0.8);
  color: #fff;
  border-color: transparent;
}

.btn-primary:hover {
  background: rgba(22, 119, 255, 0.92);
  border-color: transparent;
  color: #fff;
}

.spacer {
  flex: 1;
}
`;

/**
 * 悬浮框类。每个实例管理一个独立的 Shadow DOM 悬浮框。
 * 同一时间只允许一个实例存在（由 content/index.ts 保证）。
 */
export class FloatingPanel {
  // ---- DOM 引用 ----
  private shadowRoot: ShadowRoot;
  private panelEl: HTMLElement;
  private contentEl: HTMLElement;
  private actionBarEl: HTMLElement;
  private translateTabEl: HTMLElement;
  private explainTabEl: HTMLElement;

  // ---- 状态 ----
  private state: PanelState = "idle";
  private activeScenario: Scenario = "translate";
  private fullText = "";
  private userScrolledUp = false; // 用户是否手动上滚（暂停自动滚底）
  private destroyed = false; // 防止 destroy() 重入
  private intentionalAbort = false; // 标记是否为主动中断（切换 tab / 关闭面板），避免 onDisconnect 误报错误

  // ---- 流式连接 ----
  private port: chrome.runtime.Port | null = null;
  /** 当前活跃的 abort 函数（经由 Port 间接调用 background 侧的 abort） */
  private currentAbort: (() => void) | null = null;

  // ---- 回调 ----
  private onClose: () => void;

  constructor(onClose: () => void) {
    this.onClose = onClose;

    // 创建 Shadow DOM 宿主（样式隔离由 Shadow CSS 中的 :host 处理，不在此设 inline style）
    const host = document.createElement("div");
    this.shadowRoot = host.attachShadow({ mode: "closed" });

    // 注入样式
    const styleEl = document.createElement("style");
    styleEl.textContent = PANEL_STYLES;
    this.shadowRoot.appendChild(styleEl);

    // 构建 DOM 结构
    this.panelEl = this.buildPanel();
    this.shadowRoot.appendChild(this.panelEl);

    // 绑定 DOM 引用
    this.contentEl = this.panelEl.querySelector(".content-area")!;
    this.actionBarEl = this.panelEl.querySelector(".action-bar")!;
    this.translateTabEl = this.panelEl.querySelector('[data-scenario="translate"]')!;
    this.explainTabEl = this.panelEl.querySelector('[data-scenario="explain"]')!;

    // 挂载到页面
    document.body.appendChild(host);
  }

  // ========== DOM 构建 ==========

  private buildPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.innerHTML = `
      <div class="tab-bar">
        <button class="tab active" data-scenario="translate">${SCENARIO_LABELS.translate}</button>
        <button class="tab" data-scenario="explain">${SCENARIO_LABELS.explain}</button>
        <button class="tab-close" data-action="close">✕</button>
      </div>
      <div class="content-area loading">${STATUS_TEXT.idle}</div>
      <div class="action-bar hidden">
        <span class="spacer"></span>
        <button class="btn" data-action="copy">${BUTTON_TEXT.copy}</button>
        <button class="btn btn-primary" data-action="retry">${BUTTON_TEXT.retry}</button>
      </div>
    `;

    // 事件委托：tab 切换、关闭、复制、重试
    panel.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      const scenario = target.dataset.scenario as Scenario | undefined;

      if (action === "close") {
        this.destroy();
      } else if (action === "copy") {
        this.copyContent();
      } else if (action === "retry") {
        this.startStream();
      } else if (scenario) {
        this.switchScenario(scenario);
      }
    });

    // 内容区域滚动监听：用户手动上滚时暂停自动滚底
    const contentEl = panel.querySelector(".content-area")!;
    contentEl.addEventListener("scroll", () => {
      const { scrollTop, scrollHeight, clientHeight } = contentEl;
      // 距离底部超过 20px 认为用户手动上滚
      this.userScrolledUp = scrollHeight - scrollTop - clientHeight > 20;
    });

    return panel;
  }

  // ========== 公开方法 ==========

  /** 获取 Shadow DOM 宿主元素，用于挂载到页面和定位 */
  get hostElement(): HTMLElement {
    return this.shadowRoot.host as HTMLElement;
  }

  /** 当前是否处于 streaming 状态（用于判断是否需要 abort） */
  get isStreaming(): boolean {
    return this.state === "streaming";
  }

  /** 设置悬浮框在页面上的位置 */
  setPosition(x: number, y: number): void {
    this.hostElement.style.left = `${x}px`;
    this.hostElement.style.top = `${y}px`;
  }

  /**
   * 启动流式请求（从 idle 或 error 状态发起）
   * 首次显示悬浮框时由 index.ts 调用，Tab 切换和重试也走此方法。
   */
  startStream(): void {
    // 如果有正在进行的请求，先中断
    this.abortCurrent();

    this.setState("streaming");
    this.fullText = "";
    this.contentEl.textContent = "";
    this.contentEl.classList.add("loading");
    this.actionBarEl.classList.add("hidden");
    this.userScrolledUp = false;

    // 获取选中文本
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text) {
      this.showError(PANEL_ERROR.noSelection);
      return;
    }

    // 建立 Port 连接
    this.port = chrome.runtime.connect({ name: STREAM_PORT_NAME });

    // 注册当前连接的 abort 逻辑
    this.currentAbort = () => {
      this.port?.disconnect();
      this.port = null;
      this.currentAbort = null;
    };

    // 监听 Port 断开（background 侧主动断开也算）
    this.port.onDisconnect.addListener(() => {
      // 主动中断（切换 tab / 关闭面板）不展示错误
      if (this.intentionalAbort) {
        this.intentionalAbort = false;
        this.port = null;
        this.currentAbort = null;
        return;
      }
      // 如果还处于 streaming 状态却断开了，说明异常中断
      if (this.state === "streaming") {
        this.showError(PANEL_ERROR.connectionLost);
      }
      this.port = null;
      this.currentAbort = null;
    });

    // 监听流式消息
    this.port.onMessage.addListener((msg: StreamMessage) => {
      switch (msg.type) {
        case "STREAM_CHUNK":
          this.appendChunk(msg.payload.delta);
          break;
        case "STREAM_DONE":
          this.onDone(msg.payload.fullText);
          break;
        case "STREAM_ERROR":
          // 通过错误码查表展示中文提示，若查不到则回退到 message 字段
          this.showError(
            ERROR_MESSAGE[msg.payload.code] ?? msg.payload.message ?? STATUS_TEXT.error,
          );
          break;
      }
    });

    // 发送流式请求
    this.port.postMessage({
      type: "STREAM_REQUEST",
      payload: {
        scenario: this.activeScenario,
        text,
      },
    });
  }

  /** 销毁悬浮框：中断请求 + 移除 DOM + 调用关闭回调 */
  destroy(): void {
    if (this.destroyed) return; // 防止 destroyPanel → destroy → onClose → destroyPanel 死循环
    this.destroyed = true;
    this.abortCurrent();
    this.hostElement.remove();
    this.onClose();
  }

  // ========== 内部方法 ==========

  /** 切换场景 tab */
  private switchScenario(scenario: Scenario): void {
    if (scenario === this.activeScenario) return;

    this.activeScenario = scenario;

    // 更新 tab 高亮
    this.translateTabEl.classList.toggle(
      "active",
      scenario === "translate",
    );
    this.explainTabEl.classList.toggle("active", scenario === "explain");

    // 立即清空 + 发起新请求（根据 PRD0.md 的 Tab 切换交互规格）
    this.abortCurrent();
    this.startStream();
  }

  /** 中断当前请求（主动中断，非异常） */
  private abortCurrent(): void {
    if (this.currentAbort) {
      this.intentionalAbort = true;
      this.currentAbort();
      this.currentAbort = null;
      this.port = null;
    }
  }

  /** 追加流式分片 */
  private appendChunk(delta: string): void {
    this.fullText += delta;
    this.contentEl.textContent = this.fullText;
    this.contentEl.classList.remove("loading");

    // 自动滚底（除非用户手动上滚）
    if (!this.userScrolledUp) {
      this.contentEl.scrollTop = this.contentEl.scrollHeight;
    }
  }

  /** 流式完成 */
  private onDone(fullText: string): void {
    this.fullText = fullText;
    this.contentEl.textContent = fullText;
    this.contentEl.classList.remove("loading");
    this.setState("done");
    this.actionBarEl.classList.remove("hidden");
    this.port = null;
    this.currentAbort = null;
  }

  /** 显示错误 */
  private showError(message: string): void {
    this.contentEl.textContent = message || STATUS_TEXT.error;
    this.contentEl.classList.add("error");
    this.contentEl.classList.remove("loading");
    this.setState("error");
    this.actionBarEl.classList.remove("hidden");
    this.port = null;
    this.currentAbort = null;
  }

  /** 复制内容到剪贴板 */
  private async copyContent(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.fullText);
      // 简单反馈：短暂改变按钮文案
      const copyBtn = this.actionBarEl.querySelector(
        '[data-action="copy"]',
      ) as HTMLButtonElement | null;
      if (copyBtn) {
        const original = copyBtn.textContent;
        copyBtn.textContent = "已复制";
        setTimeout(() => {
          copyBtn.textContent = original;
        }, 1500);
      }
    } catch {
      // 剪贴板写入失败（如非 HTTPS 环境），静默失败
    }
  }

  /** 状态切换 */
  private setState(state: PanelState): void {
    this.state = state;
  }
}
