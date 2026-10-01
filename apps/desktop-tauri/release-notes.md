# YourBuddy 0.4.1

Bootstrap first launch now consumes the component signature format the desktop runtime expects, and packaging verifies the staged manifest with that same native verifier. Optional plugins can report an activation failure without holding the whole application on the loading screen. The center workbench now collapses only while the right sidebar is actually open, returns when it closes, and keeps its cards visible before the first Session exists.

Bootstrap 首次启动现在使用桌面 Runtime 实际所需的组件签名格式，打包过程也会用同一原生验证器检查暂存 Manifest。可选插件激活失败时会给出诊断，但不会让整个应用停留在加载界面。中间工作台只在右侧栏实际打开时收起，关闭后恢复，并会在首个 Session 创建前继续显示卡片。

Verification archive: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.1/docs/releases/yourbuddy-v0.4.1
