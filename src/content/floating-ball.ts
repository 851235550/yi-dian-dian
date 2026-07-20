/**
 * content/floating-ball.ts —— 选中文本后出现的小悬浮球
 *
 * 用户选中文字后，在选区末尾出现一个小圆球。
 * 点击球后展开为完整的翻译/解释面板。
 * 使用 Shadow DOM 隔离宿主页面样式。
 */

const BALL_SIZE = 36;

const BALL_STYLES = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483646;
}

.ball {
  width: ${BALL_SIZE}px;
  height: ${BALL_SIZE}px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(22, 119, 255, 0.35);
  font-size: 17px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  transform: scale(0);
}

.ball.show {
  transform: scale(1);
}

.ball:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 18px rgba(22, 119, 255, 0.45);
}

.ball:active {
  transform: scale(0.95);
}
`;

export class FloatingBall {
  private shadowRoot: ShadowRoot;
  private ballEl: HTMLElement;
  private onClick: () => void;
  private destroyed = false;

  constructor(onClick: () => void) {
    this.onClick = onClick;

    const host = document.createElement("div");
    document.body.appendChild(host);
    this.shadowRoot = host.attachShadow({ mode: "closed" });

    const styleEl = document.createElement("style");
    styleEl.textContent = BALL_STYLES;
    this.shadowRoot.appendChild(styleEl);

    this.ballEl = document.createElement("div");
    this.ballEl.className = "ball";
    this.ballEl.textContent = "译";
    this.ballEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onClick();
    });
    this.shadowRoot.appendChild(this.ballEl);

    // 延迟一帧后播放入场动画
    requestAnimationFrame(() => {
      if (!this.destroyed) {
        this.ballEl.classList.add("show");
      }
    });
  }

  /** Shadow DOM 宿主元素 */
  get hostElement(): HTMLElement {
    return this.shadowRoot.host as HTMLElement;
  }

  /** 设置球的位置（基于选区末尾的 Range 矩形） */
  setPosition(x: number, y: number): void {
    this.hostElement.style.left = `${x}px`;
    this.hostElement.style.top = `${y}px`;
  }

  /** 移除球并清理 */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ballEl.classList.remove("show");
    // 等动画结束后移除 DOM
    setTimeout(() => {
      this.hostElement.remove();
    }, 150);
  }
}

/**
 * 计算悬浮球应出现的位置。
 * 放在选区最后一行文字的末尾右下方。
 */
export function calcBallPosition(range: Range): { x: number; y: number } {
  const rects = range.getClientRects();
  // 取最后一个矩形作为定位参考；若 rects 为空，回退到整体的 bounding rect
  const lastRect: DOMRect = (() => {
    if (rects.length === 0) return range.getBoundingClientRect();
    const last = rects[rects.length - 1];
    return last ?? range.getBoundingClientRect();
  })();

  const gap = 6;
  let x = lastRect.right + gap;
  let y = lastRect.bottom - BALL_SIZE / 2 - lastRect.height / 2;

  // 边界检测：不超出视口
  if (x + BALL_SIZE > window.innerWidth - 8) {
    x = lastRect.left - BALL_SIZE - gap;
  }
  if (y < 8) y = 8;
  if (y + BALL_SIZE > window.innerHeight - 8) {
    y = window.innerHeight - BALL_SIZE - 8;
  }

  return { x, y };
}
