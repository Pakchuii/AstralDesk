import { defineStore } from 'pinia';
import { 
  AppSettings, 
  AstrBotStatus, 
  EngineType, 
  ThemeType, 
  PortraitConfig, 
  CustomBackgroundConfig, 
  QuickPromptItem, 
  AvatarCropConfig,
  DialogueBoxStyle,
  FontSettings,
  TouchVoiceSettings,
  CustomTouchVoiceItem
} from '@/types';
import { AstrBotService, DEFAULT_ASTRBOT_KEY } from '@/services/astralBot';
import { soundFx } from '@/services/audioSynthesizer';
import { ttsService } from '@/services/ttsService';

const STORAGE_KEY = 'astral_desk_settings_v6';

const DEFAULT_PORTRAIT: PortraitConfig = {
  type: 'svg',
  url: '',
  actions: [],
  scale: 1.0,
  viewportScale: 1.0,
  viewportMode: 'full',
  offsetX: 0,
  offsetY: 0,
  opacity: 1.0,
  glowColor: '#38bdf8',
  glowIntensity: 0.35,
  enableBreathing: false,
};

const DEFAULT_BACKGROUND: CustomBackgroundConfig = {
  enabled: false,
  type: 'image',
  url: '',
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
  opacity: 1.0,
  blur: 0,
  fit: 'contain',
};

const DEFAULT_AVATAR: AvatarCropConfig = {
  url: '',
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
};

const DEFAULT_DIALOGUE_BOX: DialogueBoxStyle = {
  bgColor: '#0f172a',
  bgOpacity: 0.85,
  textColor: '#f8fafc',
  borderColor: '#38bdf8',
  borderGlow: 0.4,
  borderRadius: 16,
  blur: 12,
  fontSize: 14,
  showQuickPromptHint: true,
  width: 320,
  minHeight: 70,
  offsetY: 0,
  thinkingBgColor: '#1e1b4b',
  thinkingBorderColor: '#a855f7',
  thinkingTextColor: '#e9d5ff',
  accentColor: '#38bdf8',
};

const DEFAULT_CHAT_ROOM: ChatRoomStyle = {
  themeName: 'cyan',
  stageBgColor: '#020617',
  stageBgOpacity: 0.45,
  stageBlur: 12,
  sidebarBgColor: '#020617',
  sidebarBgOpacity: 0.70,
  topBarBgColor: '#020617',
  topBarBgOpacity: 0.80,
  borderColor: '#0284c7',
  accentColor: '#38bdf8',
  assistantBgColor: '#0f172a',
  assistantBgOpacity: 0.85,
  assistantTextColor: '#f8fafc',
  assistantBorderColor: '#38bdf8',
  assistantBorderGlow: 0.4,
  assistantBorderRadius: 16,
  assistantBlur: 12,
  assistantFontSize: 14,
  userBgColor: '#0284c7',
  userTextColor: '#ffffff',
  userBorderRadius: 16,
  thinkingBgColor: '#1e1b4b',
  thinkingBorderColor: '#a855f7',
  thinkingTextColor: '#e9d5ff',
  inputBgColor: '#0f172a',
  inputBorderColor: '#38bdf8',
};

const DEFAULT_FONT: FontSettings = {
  fontFamily: 'default',
  customFontName: '',
  customFontDataUrl: '',
  fontSizeScale: 1.0,
};

const DEFAULT_QUICK_PROMPTS: QuickPromptItem[] = [
  { id: 'p1', label: '🌸 摸摸头', text: '摸摸头，今天辛苦啦！' },
  { id: 'p2', label: '✨ 聊聊天', text: '今天有什么好玩的事情想和我聊聊吗？' },
  { id: 'p3', label: '💖 夸夸我', text: '我今天超努力的，快夸夸我~' },
  { id: 'p4', label: '🎵 讲个故事', text: '给我讲一个温馨有趣的小故事吧！' },
  { id: 'p5', label: '🌟 陪伴心语', text: '今天也一直陪在我身边哦~' },
];

const DEFAULT_TOUCH_VOICE: TouchVoiceSettings = {
  enabled: false,
  volume: 0.85,
  playMode: 'random',
  cooldownMs: 1200,
  showBubbleReaction: true,
  voices: [],
};

const DEFAULT_SETTINGS: AppSettings = {
  engine: 'astrbot',
  deepseek: {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-reasoner',
    temperature: 0.7,
    maxTokens: 4096,
  },
  astrbot: {
    baseUrl: 'http://127.0.0.1:6185',
    apiKey: DEFAULT_ASTRBOT_KEY,
    model: 'astrbot-agent',
    autoReconnect: true,
  },
  custom: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    model: 'deepseek-ai/DeepSeek-R1',
  },
  theme: 'cyan',
  background: DEFAULT_BACKGROUND,
  dialogueBox: DEFAULT_DIALOGUE_BOX,
  chatRoom: DEFAULT_CHAT_ROOM,
  font: DEFAULT_FONT,
  soundEnabled: true,
  soundVolume: 0.6,
  ttsEnabled: false,
  ttsRate: 1.0,
  botDisplayName: 'AstrBot 智能伴侣',
  botAvatar: { ...DEFAULT_AVATAR },
  userAvatar: { ...DEFAULT_AVATAR },
  quickPrompts: DEFAULT_QUICK_PROMPTS,
  portrait: DEFAULT_PORTRAIT,
  touchVoice: DEFAULT_TOUCH_VOICE,
  windowMode: 'main',
  alwaysOnTop: false,
  acrylicBlur: true,
  autoLaunch: false,
  isWindowLocked: false,
};

let touchAudioPlayer: HTMLAudioElement | null = null;
let lastTouchVoicePlayTime = 0;
let touchVoiceSequenceIdx = 0;

export const useSettingStore = defineStore('settings', {
  state: (): {
    settings: AppSettings;
    astrBotStatus: AstrBotStatus;
    isCheckingAstrBot: boolean;
  } => {
    let saved: AppSettings = DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        saved = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Use defaults
    }

    if (saved.isWindowLocked === undefined) saved.isWindowLocked = false;
    if (!saved.portrait) saved.portrait = { ...DEFAULT_PORTRAIT };
    if (!saved.portrait.actions) saved.portrait.actions = [];
    if (saved.portrait.glowIntensity === undefined) saved.portrait.glowIntensity = 0.35;
    if (!saved.touchVoice) {
      saved.touchVoice = { ...DEFAULT_TOUCH_VOICE };
    } else {
      saved.touchVoice = { ...DEFAULT_TOUCH_VOICE, ...saved.touchVoice };
      if (!saved.touchVoice.voices) saved.touchVoice.voices = [];
    }
    if (!saved.background) saved.background = { ...DEFAULT_BACKGROUND };
    if (!saved.dialogueBox) {
      saved.dialogueBox = { ...DEFAULT_DIALOGUE_BOX };
    } else {
      saved.dialogueBox = { ...DEFAULT_DIALOGUE_BOX, ...saved.dialogueBox };
    }
    if (!saved.chatRoom) {
      saved.chatRoom = { ...DEFAULT_CHAT_ROOM };
    } else {
      saved.chatRoom = { ...DEFAULT_CHAT_ROOM, ...saved.chatRoom };
    }
    if (!saved.font) saved.font = { ...DEFAULT_FONT };
    if (!saved.botAvatar) saved.botAvatar = { ...DEFAULT_AVATAR, url: saved.botAvatarUrl || '' };
    if (!saved.userAvatar) saved.userAvatar = { ...DEFAULT_AVATAR, url: saved.userAvatarUrl || '' };
    if (!saved.quickPrompts || saved.quickPrompts.length === 0) {
      saved.quickPrompts = [...DEFAULT_QUICK_PROMPTS];
    }

    return {
      settings: saved,
      astrBotStatus: AstrBotService.getCachedStatus(),
      isCheckingAstrBot: false,
    };
  },

  actions: {
    applyGlobalFont() {
      const font = this.settings.font || DEFAULT_FONT;
      let styleEl = document.getElementById('app-dynamic-font-style') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'app-dynamic-font-style';
        document.head.appendChild(styleEl);
      }

      let fontCss = '';
      let fontFamilyRule = 'inherit';

      if (font.customFontDataUrl) {
        fontCss += `
          @font-face {
            font-family: 'CustomUploadedFont';
            src: url('${font.customFontDataUrl}');
          }
        `;
        fontFamilyRule = "'CustomUploadedFont', system-ui, sans-serif";
      } else if (font.fontFamily === 'pixel') {
        fontFamilyRule = "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', 'SimSun', monospace";
      } else if (font.fontFamily === 'yahei') {
        fontFamilyRule = "'Microsoft YaHei', '微软雅黑', sans-serif";
      } else if (font.fontFamily === 'lxgw') {
        fontFamilyRule = "'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif, sans-serif";
      } else if (font.fontFamily && font.fontFamily !== 'default') {
        fontFamilyRule = `"${font.fontFamily}", system-ui, sans-serif`;
      } else {
        fontFamilyRule = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      }

      fontCss += `
        :root {
          --app-font-family: ${fontFamilyRule};
          --app-font-scale: ${font.fontSizeScale || 1.0};
        }
        *, *::before, *::after, body, button, input, textarea, select, p, span, div {
          font-family: var(--app-font-family) !important;
        }
      `;

      styleEl.innerHTML = fontCss;
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.error('Failed to save settings to localStorage', e);
      }
      soundFx.setEnabled(this.settings.soundEnabled);
      soundFx.setVolume(this.settings.soundVolume);
      ttsService.setEnabled(this.settings.ttsEnabled);
      ttsService.setRate(this.settings.ttsRate);
      this.applyGlobalFont();

      if (window.electronAPI?.setAutoLaunch) {
        window.electronAPI.setAutoLaunch(this.settings.autoLaunch).catch(() => {});
      }
    },

    async migrateBase64AssetsToDisk() {
      if (typeof window === 'undefined' || !window.electronAPI?.saveMediaAsset) return;
      let changed = false;

      // 1. Portrait base url
      if (this.settings.portrait?.url?.startsWith('data:')) {
        this.settings.portrait.url = await window.electronAPI.saveMediaAsset('portrait_base.webp', this.settings.portrait.url);
        changed = true;
      }

      // 2. Portrait actions
      if (this.settings.portrait?.actions) {
        for (const act of this.settings.portrait.actions) {
          if (act.assetUrl?.startsWith('data:')) {
            act.assetUrl = await window.electronAPI.saveMediaAsset(`${act.id || 'act'}.webp`, act.assetUrl);
            changed = true;
          }
        }
      }

      // 3. Background
      if (this.settings.background?.url?.startsWith('data:')) {
        this.settings.background.url = await window.electronAPI.saveMediaAsset('background_media', this.settings.background.url);
        changed = true;
      }

      // 4. Bot Avatar
      if (this.settings.botAvatar?.url?.startsWith('data:')) {
        this.settings.botAvatar.url = await window.electronAPI.saveMediaAsset('bot_avatar.png', this.settings.botAvatar.url);
        this.settings.botAvatarUrl = this.settings.botAvatar.url;
        changed = true;
      }

      // 5. User Avatar
      if (this.settings.userAvatar?.url?.startsWith('data:')) {
        this.settings.userAvatar.url = await window.electronAPI.saveMediaAsset('user_avatar.png', this.settings.userAvatar.url);
        this.settings.userAvatarUrl = this.settings.userAvatar.url;
        changed = true;
      }

      // 6. Touch voices
      if (this.settings.touchVoice?.voices) {
        for (const v of this.settings.touchVoice.voices) {
          if (v.audioUrl?.startsWith('data:')) {
            v.audioUrl = await window.electronAPI.saveMediaAsset(`${v.id || 'voice'}.mp3`, v.audioUrl);
            changed = true;
          }
        }
      }

      if (changed) {
        this.save();
        console.log('[Memory Optimizer] Migrated large base64 media to disk assets successfully.');
      }
    },

    setEngine(engine: EngineType) {
      this.settings.engine = engine;
      this.save();
    },

    setTheme(theme: ThemeType) {
      this.settings.theme = theme;
      this.save();
    },

    setSound(enabled: boolean, volume?: number) {
      this.settings.soundEnabled = enabled;
      if (volume !== undefined) {
        this.settings.soundVolume = volume;
      }
      this.save();
    },

    async checkAstrBotHealth() {
      this.isCheckingAstrBot = true;
      try {
        const res = await AstrBotService.checkHealth(this.settings.astrbot.baseUrl);
        this.astrBotStatus = res;
      } finally {
        this.isCheckingAstrBot = false;
      }
    },

    resetDialogueBoxToDefault() {
      const currentColors = {
        bgColor: this.settings.dialogueBox?.bgColor || DEFAULT_DIALOGUE_BOX.bgColor,
        bgOpacity: this.settings.dialogueBox?.bgOpacity ?? DEFAULT_DIALOGUE_BOX.bgOpacity,
        textColor: this.settings.dialogueBox?.textColor || DEFAULT_DIALOGUE_BOX.textColor,
        borderColor: this.settings.dialogueBox?.borderColor || DEFAULT_DIALOGUE_BOX.borderColor,
        borderGlow: this.settings.dialogueBox?.borderGlow ?? DEFAULT_DIALOGUE_BOX.borderGlow,
        borderRadius: this.settings.dialogueBox?.borderRadius ?? DEFAULT_DIALOGUE_BOX.borderRadius,
        blur: this.settings.dialogueBox?.blur ?? DEFAULT_DIALOGUE_BOX.blur,
        thinkingBgColor: this.settings.dialogueBox?.thinkingBgColor || DEFAULT_DIALOGUE_BOX.thinkingBgColor,
        thinkingBorderColor: this.settings.dialogueBox?.thinkingBorderColor || DEFAULT_DIALOGUE_BOX.thinkingBorderColor,
        thinkingTextColor: this.settings.dialogueBox?.thinkingTextColor || DEFAULT_DIALOGUE_BOX.thinkingTextColor,
        accentColor: this.settings.dialogueBox?.accentColor || DEFAULT_DIALOGUE_BOX.accentColor,
      };

      this.settings.dialogueBox = {
        ...DEFAULT_DIALOGUE_BOX,
        ...currentColors,
        width: 320,
        minHeight: 70,
        offsetY: 0,
        fontSize: 14,
      };
      this.save();
      soundFx.playCrystalChime();
    },

    resetAllSettingsToDefault() {
      this.settings = { ...DEFAULT_SETTINGS };
      this.save();
      soundFx.playCrystalChime();
    },

    playTouchVoice(triggerZone: 'head' | 'body' | 'bottom' = 'body'): { voiceName?: string; reactionText?: string } | null {
      const cfg = this.settings.touchVoice;
      if (!cfg || !cfg.enabled || !cfg.voices || cfg.voices.length === 0) return null;

      const now = Date.now();
      const cooldown = cfg.cooldownMs ?? 1200;
      if (now - lastTouchVoicePlayTime < cooldown) return null;
      lastTouchVoicePlayTime = now;

      // Filter matching voices
      const matched = cfg.voices.filter(v => !v.triggerZone || v.triggerZone === 'all' || v.triggerZone === triggerZone);
      const pool = matched.length > 0 ? matched : cfg.voices;
      if (pool.length === 0) return null;

      let chosen: CustomTouchVoiceItem;
      if (cfg.playMode === 'sequential') {
        chosen = pool[touchVoiceSequenceIdx % pool.length];
        touchVoiceSequenceIdx++;
      } else {
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }

      if (chosen && chosen.audioUrl) {
        try {
          if (!touchAudioPlayer) {
            touchAudioPlayer = new Audio();
          }
          touchAudioPlayer.pause();
          touchAudioPlayer.currentTime = 0;
          touchAudioPlayer.src = chosen.audioUrl;
          touchAudioPlayer.volume = Math.max(0, Math.min(1, cfg.volume ?? 0.85));
          touchAudioPlayer.play().catch(() => {});
        } catch (e) {
          console.error('Failed to play touch voice audio', e);
        }
        return {
          voiceName: chosen.name,
          reactionText: chosen.reactionText
        };
      }
      return null;
    }
  }
});
