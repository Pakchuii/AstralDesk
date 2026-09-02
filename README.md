<div align="center">

# 🌌 AstralDesk · 星轨 AI

### 跨次元·沉浸式二次元桌搭伴侣 & 智能 AI 桌面终端

<p align="center">
  <img src="https://img.shields.io/badge/Electron-34.x-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Vue.js-3.5-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue3" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/AstrBot-Native_Sync-FF69B4?style=for-the-badge" alt="AstrBot" />
  <img src="https://img.shields.io/badge/DeepSeek-R1%20%2F%20V3-00BFFF?style=for-the-badge" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

> **AstralDesk** 是一款专为二次元（ACG）、桌搭爱好者和游戏玩家打造的 **高颜值透明悬浮 AI 伴侣桌面终端**。
> 深度融合 **本地 AstrBot 智能 Agent 生态** 与 **DeepSeek R1/V3 推理大模型**，拥有 **纯净透明无黑边异形窗**、**游戏级鼠标穿透防误触**、**屏幕视觉实时感知**、**全天候主动推送** 与 **立绘工坊自适应表情系统**。

</div>

---

## ✨ 核心亮点功能

### 🪟 1. 桌面透明赛博立牌（Cyber Stand）& 主工作台双形态
- **透明无黑边悬浮立牌**：采用 Windows 原生透明异形渲染架构，支持**自由拖拽、右下角鼠标缩放拉伸、位置锁定**；
- **自适应防挤压气泡**：对话框与立绘分层独立渲染，支持自由调节气泡宽高、位置偏移、毛玻璃透明度与一键恢复默认；
- **沉浸式主工作台**：随时一键平滑展开为多功能工作台，支持 Markdown 富文本渲染、代码高亮、KaTeX 数学公式排版与多会话管理。

### 🎮 2. 游戏模式一键鼠标穿透（Click-Through）
- **任务栏托盘一键切换**：在 Windows 右下角托盘图标右键即可快速勾选/取消 **`🎯 鼠标穿透 (游戏防误触)`**；
- **全局极速快捷键**：支持 **`Ctrl + Alt + M`** 随时在“游戏穿透模式”和“正常互动模式”之间无感切换；
- 打游戏时鼠标完全穿透伴侣立绘，绝不干扰游戏点击与技能释放，同时伴侣实时在桌面陪伴看着你的屏幕。

### 👁️ 3. 屏幕实时感知与视觉交互（Live Screen Vision）
- 伴侣能感知并看懂你当前的电脑屏幕内容（游戏胜负、代码调试、网页浏览、番剧观赏）；
- 自主根据屏幕画面与场景产生互动吐槽、战术鼓励与温馨陪伴。

### 🔔 4. 全天候主动推送与 0% CPU 极速 SQLite 监听
- **原生文件系统驱动**：基于微秒级修改时间戳（`mtimeMs`）与文件监听，不依赖高频轮询，后台挂机**真正实现 0.0% CPU 占用**；
- **定时消息主动穿越**：即使客户端最小化在托盘，当 AstrBot 定时 Cron 触发时，伴侣也会在 **1~2 秒内自动弹出、播放清脆水晶音效与语音**；
- **内容指纹智能去重**：严格区分用户主动会话流与后台推送，杜绝消息重复刷屏。

### 🎨 5. 自由立绘工坊（Portrait Studio）
- **全方位视觉微调**：支持对角色立绘进行缩放（Scale）、水平平移（Offset X）、垂直平移（Offset Y）；
- **动态表情差分**：根据对话内容情感在多种心情间自适应流转；
- **立绘互动音效**：支持配置触摸立绘时的专属触发语音与 Web Audio 纯代码合成水晶和弦音。

### 🧠 6. DeepSeek R1 深度思维链解析流
- 严格隔离 `<think>` 思维链标签，正文与思考过程分离，小窗默认折叠卡片，彻底避免刷屏；
- 内置思考耗时计时器、战术脉冲光环与一键复制。

---

## ⌨️ 快捷键说明

| 快捷键 | 功能说明 | 适用场景 |
| :--- | :--- | :--- |
| **`Alt + Space`** | 全局快速唤起 / 隐藏主窗口 | 任意时刻快速召唤 AI |
| **`Ctrl + Alt + M`** | 切换游戏模式「鼠标穿透」 | 打游戏防误触 / 切换互动 |
| **`Enter`** | 发送消息 | 对话输入框 |
| **`Shift + Enter`** | 换行 | 多行文本编辑 |
| **`小窗右键`** | 呼出快捷菜单（立绘工坊/设置/锁定/最小化） | 桌面立牌模式 |

---

## 🛠️ 技术架构

```
AstralDesk/
├── electron/                  # Electron 主进程与底层系统调用
│   ├── main.ts                # 透明窗口管理、系统托盘、全局快捷键、IPC
│   ├── astrbot_query.py       # 原生 SQLite 极速免转义查询引擎
│   ├── preload.cjs            # CJS 安全通信桥接
│   └── preload.ts             # TS 预加载脚本
├── src/
│   ├── assets/                # 动态表情矢量库、主题样式与音效
│   ├── components/
│   │   ├── character/         # 角色立绘与动态表情差分组件
│   │   ├── chat/              # 聊天气泡、ThinkingPulse 思维链、Markdown 渲染
│   │   ├── hud/               # 战术顶栏、3D光环、粒子氛围系统
│   │   ├── settings/          # 设置面板 (AstrBot/DeepSeek/主题/音效/快捷键)
│   │   └── studio/            # 立绘工坊 (自由缩放/平移/触摸配置)
│   ├── services/
│   │   ├── astralBot.ts       # AstrBot 流式通信与痕迹过滤器
│   │   ├── deepseek.ts        # DeepSeek R1/V3 流式客户端
│   │   ├── audioSynthesizer.ts# Web Audio 纯代码合成音效 (水晶音/打字机)
│   │   ├── proactivePushService.ts # 主动推送与文本指纹去重管道
│   │   └── engineManager.ts   # 双引擎调度与情绪分析
│   ├── stores/                # Pinia 状态管理与 LocalStorage 持久化
│   └── views/
│       ├── WorkspaceView.vue  # 沉浸式主工作台
│       └── MiniOverlayView.vue# 桌面赛博立牌小窗
├── deploy_app.py              # 一键编译、打包 asar 并启动脚本
└── package.json
```

---

## 🚀 快速开始与本地开发

### 1. 克隆本仓库

```bash
git clone https://github.com/your-username/AstralDesk.git
cd AstralDesk
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式启动

```bash
npm run dev
```

### 4. 生产构建与打包

```bash
# 1. 编译前端与主进程
npm run build

# 2. 一键打包并部署启动 (Windows)
python deploy_app.py
```

---

## ⚙️ 配置指南

### 🤖 接入本地 AstrBot
1. 确保本地 AstrBot 正常启动（默认地址为 `http://127.0.0.1:6185`）；
2. 打开 AstralDesk，顶部状态栏会自动点亮绿色探活指示灯并显示实时延迟（如 `12ms`）；
3. 即可直接使用 AstrBot 的 Agent 工具链、主动推送与多端同步功能。

### ⚡ 接入 DeepSeek 云端直连
1. 点击右上角「设置」图标（⚙️） -> 选择「DeepSeek 云端」；
2. 输入你的 `API Key`（支持官方 DeepSeek API 或 SiliconFlow 等兼容服务商）；
3. 选择 `deepseek-reasoner (R1)` 或 `deepseek-chat (V3)` 即可体验深度推理流。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。欢迎 Star、Fork 与提交 Pull Request！✨
