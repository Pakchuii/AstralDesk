export type EngineType = 'astrbot' | 'deepseek' | 'custom';

export type MoodType = 'normal' | 'happy' | 'thinking' | 'surprised' | 'shy' | 'pout';

export type ThemeType = 'cyan' | 'pink' | 'gold' | 'purple' | 'emerald';

export interface QuickPromptItem {
  id: string;
  label: string;
  text: string;
}

export interface InteractiveTouchAction {
  id: string;
  name: string;
  triggerZone: 'head' | 'body' | 'bottom' | 'all';
  assetUrl: string;
  assetType: 'webp' | 'video' | 'image';
  returnPolicy: 'auto' | 'stay';
  durationSec: number;
  autoReturnOnEnded?: boolean; // 视频播放完毕自动切回
  reactionText?: string; // 自定义互动台词
  soundEffect?: 'chime' | 'click' | 'magic' | 'none'; // 音效选择
  effectType?: 'hearts' | 'sparkles' | 'sakura' | 'bubbles' | 'none'; // 粒子特效选择
}

export interface PortraitConfig {
  type: 'svg' | 'webp' | 'video' | 'image';
  url: string;
  actions: InteractiveTouchAction[];
  scale: number; // 1. 立绘基准缩放 (0.2x ~ 3.5x)
  viewportScale: number; // 2. 视口取景缩放 (0.5x ~ 3.0x)
  viewportMode?: 'full' | 'half' | 'bust' | 'custom';
  viewportHeight?: number; // 3. 立绘在小窗占用的空间高度 (200px ~ 1600px)
  offsetX: number;
  offsetY: number;
  opacity: number;
  glowColor: string;
  glowIntensity: number; // 0.0 ~ 1.0 (发光强度)
  enableBreathing: boolean;
}

export interface CustomBackgroundConfig {
  enabled: boolean;
  type: 'image' | 'video';
  url: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  blur: number;
  fit?: 'cover' | 'contain' | 'fill' | 'original'; // 'contain'=完整显示绝不裁切, 'cover'=铺满, 'fill'=拉伸
}

export interface DialogueBoxStyle {
  bgColor: string; // 小窗气泡背景色 e.g. '#0f172a'
  bgOpacity: number; // 小窗背景不透明度 0.05 ~ 1.0
  textColor: string; // 小窗文字颜色
  borderColor: string; // 小窗边框颜色
  borderGlow: number; // 小窗边框光晕 0 ~ 1.0
  borderRadius: number; // 小窗圆角大小 4 ~ 32px
  blur: number; // 小窗毛玻璃模糊 0 ~ 30px
  fontSize?: number; // 小窗字体大小 12 ~ 28px
  showQuickPromptHint: boolean;
  width?: number; // 小窗聊天框宽度 (px)
  minHeight?: number; // 小窗聊天框最小高度 (px)
  offsetY?: number; // 小窗聊天框垂直偏移 (px)
  thinkingBgColor?: string; // 小窗思考框背景色
  thinkingBorderColor?: string; // 小窗思考框边框色
  thinkingTextColor?: string; // 小窗思考框文字色
  accentColor?: string; // 小窗高亮主色
}

export interface ChatRoomStyle {
  themeName?: string; // 'cyan' | 'pink' | 'white' | 'dark' | 'neon' | 'emerald' | 'custom'
  // 1. 聊天室舞台背景
  stageBgColor: string; // 聊天室主背景色 e.g. '#020617'
  stageBgOpacity: number; // 聊天室背景不透明度 (0.0 ~ 1.0)
  stageBlur: number; // 聊天室背景模糊度 (0 ~ 30px)
  // 2. 边栏与顶部栏
  sidebarBgColor: string; // 左/右侧边栏背景色
  sidebarBgOpacity: number; // 侧边栏不透明度
  topBarBgColor: string; // 顶部栏背景色
  topBarBgOpacity: number; // 顶部栏不透明度
  borderColor: string; // 边框与分割线颜色
  accentColor: string; // 主题主色 / 按钮发光色
  // 3. 伴侣消息气泡
  assistantBgColor: string; // 伴侣气泡背景色
  assistantBgOpacity: number; // 伴侣气泡不透明度
  assistantTextColor: string; // 伴侣气泡文字色
  assistantBorderColor: string; // 伴侣气泡边框色
  assistantBorderGlow: number; // 伴侣气泡发光
  assistantBorderRadius: number; // 伴侣气泡圆角
  assistantBlur: number; // 伴侣气泡毛玻璃
  assistantFontSize: number; // 伴侣气泡字号
  // 4. 我的消息气泡
  userBgColor: string; // 用户气泡背景色
  userTextColor: string; // 用户气泡文字色
  userBorderRadius: number; // 用户气泡圆角
  // 5. 思考卡片
  thinkingBgColor: string; // 思考卡片背景色
  thinkingBorderColor: string; // 思考卡片边框色
  thinkingTextColor: string; // 思考卡片文字色
  // 6. 输入框
  inputBgColor: string; // 输入框背景色
  inputBorderColor: string; // 输入框边框色
}

export interface FontSettings {
  fontFamily: string; // 'default' | 'Microsoft YaHei' | 'SimSun' | 'LXGW WenKai' | 'custom'
  customFontName?: string;
  customFontDataUrl?: string;
  fontSizeScale: number; // 0.8 ~ 1.4
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinkingContent?: string;
  thinkingTime?: number;
  isThinking?: boolean;
  timestamp: number;
  engineUsed?: EngineType;
  mood?: MoodType;
  modelName?: string;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface AstrBotStatus {
  online: boolean;
  latencyMs: number;
  url: string;
  version?: string;
  activePlugins: string[];
  activePersonas?: string[];
  lastChecked: number;
}

export interface AvatarCropConfig {
  url: string;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CustomTouchVoiceItem {
  id: string;
  name: string;
  audioUrl: string; // Base64 Data URL or file URL
  reactionText?: string; // 点击触发的台词气泡
  triggerZone: 'all' | 'head' | 'body' | 'bottom'; // 触发区域
}

export interface TouchVoiceSettings {
  enabled: boolean; // 是否启用小窗触摸自定义语音
  volume: number; // 音量 0.0 ~ 1.0
  playMode: 'random' | 'sequential'; // 播放顺序
  cooldownMs: number; // 防连续点击重叠冷却时间 (ms)
  showBubbleReaction: boolean; // 是否在小窗气泡中展示台词文字
  voices: CustomTouchVoiceItem[]; // 自定义导入的语音列表
}

export interface AppSettings {
  engine: EngineType;
  deepseek: {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  astrbot: {
    baseUrl: string;
    apiKey: string;
    model: string;
    autoReconnect: boolean;
  };
  custom: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
  theme: ThemeType;
  background: CustomBackgroundConfig;
  dialogueBox: DialogueBoxStyle;
  chatRoom: ChatRoomStyle;
  font: FontSettings;
  soundEnabled: boolean;
  soundVolume: number;
  ttsEnabled: boolean;
  ttsRate: number;
  botDisplayName: string;
  botAvatar: AvatarCropConfig;
  userAvatar: AvatarCropConfig;
  botAvatarUrl?: string; // backwards compatibility
  userAvatarUrl?: string;
  quickPrompts: QuickPromptItem[];
  portrait: PortraitConfig;
  touchVoice?: TouchVoiceSettings;
  windowMode: 'main' | 'mini';
  alwaysOnTop: boolean;
  acrylicBlur: boolean;
  autoLaunch: boolean;
  isWindowLocked?: boolean;
}
