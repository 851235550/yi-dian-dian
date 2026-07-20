import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>译点点</h1>
      <p className={styles.subtitle}>划词翻译 · 解释</p>
      <p className={styles.hint}>请先在设置页配置 API Key</p>
    </div>
  );
}
