/**
 * content/index.ts —— Content Script 入口
 *
 * 职责：监听划词事件，先展示小悬浮球，用户点击球后再展开完整面板。
 * 同一时间只允许一个悬浮元素（球或面板）存在。
 */

import { FloatingPanel } from "./floating-panel";
import { FloatingBall, calcBallPosition } from "./floating-ball";

console.log("[译点点] content script 已注入:", window.location.href);

// ========== 全局状态 ==========

/** 当前活跃的悬浮球 */
let activeBall: FloatingBall | null = null;
/** 当前活跃的翻译面板 */
let activePanel: FloatingPanel | null = null;
/** 关闭面板的外部点击监听器 */
let outsideClickListener: ((e: MouseEvent) => void) | null = null;

// ========== 划词检测 ==========

function isValidSelection(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return false;

  const text = selection.toString().trim();
  if (text.length === 0) return false;
  if (/^[\s\p{P}]+$/u.test(text)) return false;

  const activeEl = document.activeElement;
  if (
    activeEl &&
    (activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA" ||
      (activeEl as HTMLElement).isContentEditable)
  ) {
    return false;
  }

  return true;
}

// ========== 悬浮框生命周期 ==========

/** 销毁面板 */
function destroyPanel(): void {
  if (activePanel) {
    activePanel.destroy();
    activePanel = null;
  }
  removeOutsideClickListener();
}

/** 销毁小球 */
function destroyBall(): void {
  if (activeBall) {
    activeBall.destroy();
    activeBall = null;
  }
}

/** 创建并显示翻译面板 */
function showPanel(): void {
  const selection = window.getSelection();
  if (!selection) return;

  const range = selection.getRangeAt(0);

  // 计算面板位置（居中于选中文字）
  const rect = range.getBoundingClientRect();
  const panelWidth = 360;
  const panelMaxHeight = 360;
  const gap = 8;
  let x = rect.left + rect.width / 2 - panelWidth / 2;
  x = Math.max(8, Math.min(x, window.innerWidth - panelWidth - 8));
  let y = rect.bottom + gap;
  if (rect.bottom + gap + panelMaxHeight > window.innerHeight) {
    y = rect.top - gap - panelMaxHeight;
    if (y < 8) y = 8;
  }

  destroyPanel(); // 确保没有旧面板
  destroyBall();  // 展开面板时隐藏小球

  activePanel = new FloatingPanel(destroyPanel);
  activePanel.setPosition(x, y);
  activePanel.startStream();
  addOutsideClickListener();
}

/** 创建并显示小悬浮球 */
function showBall(): void {
  const selection = window.getSelection();
  if (!selection) return;

  const range = selection.getRangeAt(0);
  const { x, y } = calcBallPosition(range);

  destroyBall(); // 确保没有旧球

  activeBall = new FloatingBall(() => {
    // 点击小球 → 展开面板
    showPanel();
  });
  activeBall.setPosition(x, y);
}

// ========== 外部点击关闭 ==========

function addOutsideClickListener(): void {
  setTimeout(() => {
    outsideClickListener = (e: MouseEvent) => {
      if (!activePanel) return;
      if (activePanel.hostElement.contains(e.target as Node)) return;
      destroyPanel();
    };
    document.addEventListener("mousedown", outsideClickListener, true);
  }, 0);
}

function removeOutsideClickListener(): void {
  if (outsideClickListener) {
    document.removeEventListener("mousedown", outsideClickListener, true);
    outsideClickListener = null;
  }
}

// ========== Esc 关闭 ==========

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    if (activePanel) {
      destroyPanel();
    } else if (activeBall) {
      destroyBall();
    }
  }
});

// ========== 页面点击时自动关闭小球（非选中区域点击） ==========

document.addEventListener(
  "mousedown",
  (e: MouseEvent) => {
    if (!activeBall) return;
    // 点击在小球内部，不关闭
    if (activeBall.hostElement.contains(e.target as Node)) return;
    // 延迟检查：如果这次点击导致了新的有效选中，mouseup 会创建新球
    setTimeout(() => {
      // 如果此时 activeBall 已经被新的 showBall 替换了，就不关
      if (activeBall && !window.getSelection()?.toString().trim()) {
        destroyBall();
      }
    }, 150);
  },
  true,
);

// ========== 划词监听 ==========

document.addEventListener("mouseup", (e: MouseEvent) => {
  // 点击在面板内部，忽略
  if (activePanel && activePanel.hostElement.contains(e.target as Node)) {
    return;
  }

  // 点击在小球内部，忽略（让球的 click 事件处理）
  if (activeBall && activeBall.hostElement.contains(e.target as Node)) {
    return;
  }

  setTimeout(() => {
    if (isValidSelection()) {
      showBall();
    } else {
      // 如果选中无效且当前有小球且用户没有点球，关闭小球
      if (activeBall && !window.getSelection()?.toString().trim()) {
        destroyBall();
      }
    }
  }, 10);
});


