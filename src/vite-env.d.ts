/// <reference types="vite/client" />

/** CSS Modules 类型声明，避免 TS 对 *.module.css 导入报错 */
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
