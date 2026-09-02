<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSettingStore } from '@/stores/settingStore';
import { useChatStore } from '@/stores/chatStore';
import { ThemeType, QuickPromptItem } from '@/types';
import CharacterAvatar from '@/components/character/CharacterAvatar.vue';
import { 
  X, 
  Bot, 
  Zap, 
  Palette, 
  Volume2, 
  ShieldCheck, 
  RefreshCw, 
  Key, 
  Upload, 
  RotateCcw, 
  Sparkles, 
  FileCode, 
  Sliders, 
  Image as ImageIcon, 
  Video, 
  Monitor, 
  MessageSquareText, 
  Plus, 
  Trash2, 
  User, 
  Type, 
  MessageCircle, 
  Search, 
  Check, 
  Loader2,
  Play,
  Pause,
  Music,
  Mic
} from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';
import { AstrBotService } from '@/services/astralBot';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-studio'): void;
}>();

const settingStore = useSettingStore();
const chatStore = useChatStore();

const activeTab = ref<'prompts' | 'chatroom' | 'dialogue' | 'font' | 'voice' | 'astrbot' | 'background' | 'deepseek'>('chatroom');
const isTestingPing = ref(false);
const pingSuccess = ref(false);
const isCleaningAstrBot = ref(false);
const cleanAstrBotSuccess = ref(false);

const voiceAudioInputRef = ref<HTMLInputElement | null>(null);
const currentPlayingVoiceId = ref<string | null>(null);
let previewAudioPlayer: HTMLAudioElement | null = null;

const handleVoiceAudioUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  if (!settingStore.settings.touchVoice) {
    settingStore.settings.touchVoice = {
      enabled: true,
      volume: 0.85,
      playMode: 'random',
      cooldownMs: 1200,
      showBubbleReaction: true,
      voices: [],
    };
  }

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        settingStore.settings.touchVoice?.voices.push({
          id: 'voice_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: cleanName || '自定义语音',
          audioUrl: result,
          reactionText: cleanName.includes('摸') ? '(*/ω＼*) 摸摸头~' : '(*^▽^*) 戳戳~',
          triggerZone: cleanName.includes('摸') || cleanName.includes('头') ? 'head' : 'all',
        });
        settingStore.settings.touchVoice!.enabled = true;
        settingStore.save();
      }
    };
    reader.readAsDataURL(file);
  });

  soundFx.playCrystalChime();
  target.value = '';
};

const handlePreviewVoice = (item: CustomTouchVoiceItem) => {
  if (currentPlayingVoiceId.value === item.id) {
    if (previewAudioPlayer) {
      previewAudioPlayer.pause();
      previewAudioPlayer = null;
    }
    currentPlayingVoiceId.value = null;
    return;
  }

  if (previewAudioPlayer) {
    previewAudioPlayer.pause();
    previewAudioPlayer = null;
  }

  try {
    previewAudioPlayer = new Audio(item.audioUrl);
    previewAudioPlayer.volume = settingStore.settings.touchVoice?.volume ?? 0.85;
    currentPlayingVoiceId.value = item.id;
    previewAudioPlayer.onended = () => {
      currentPlayingVoiceId.value = null;
      previewAudioPlayer = null;
    };
    previewAudioPlayer.play().catch(() => {
      currentPlayingVoiceId.value = null;
    });
  } catch {
    currentPlayingVoiceId.value = null;
  }
};

const handleDeleteVoice = (id: string) => {
  if (settingStore.settings.touchVoice?.voices) {
    settingStore.settings.touchVoice.voices = settingStore.settings.touchVoice.voices.filter(v => v.id !== id);
    settingStore.save();
    soundFx.playTypewriterClick();
  }
};

const handleClearAllVoices = () => {
  if (confirm('确定要清空所有已导入的触摸自定义语音吗？')) {
    if (settingStore.settings.touchVoice) {
      settingStore.settings.touchVoice.voices = [];
      settingStore.save();
      soundFx.playTypewriterClick();
    }
  }
};

const handleCleanAstrBotBackend = async () => {
  isCleaningAstrBot.value = true;
  cleanAstrBotSuccess.value = false;
  try {
    const baseUrl = settingStore.settings.astrbot.baseUrl;
    const apiKey = settingStore.settings.astrbot.apiKey;
    
    // Clean all current sessions in AstrBot
    for (const sess of chatStore.sessions) {
      await AstrBotService.deleteSession(baseUrl, apiKey, sess.id);
    }
    // Also reset default sessions
    await AstrBotService.deleteSession(baseUrl, apiKey, 'default_session');
    await AstrBotService.deleteSession(baseUrl, apiKey, 'Commander');
    
    cleanAstrBotSuccess.value = true;
    soundFx.playCrystalChime();
    setTimeout(() => {
      cleanAstrBotSuccess.value = false;
    }, 3000);
  } catch (err) {
    console.error('Failed to clean AstrBot backend sessions', err);
  } finally {
    isCleaningAstrBot.value = false;
  }
};

const bgFileInputRef = ref<HTMLInputElement | null>(null);
const botAvatarInputRef = ref<HTMLInputElement | null>(null);
const userAvatarInputRef = ref<HTMLInputElement | null>(null);
const fontFileInputRef = ref<HTMLInputElement | null>(null);

// Local System Fonts
const systemFonts = ref<string[]>([]);
const isLoadingFonts = ref(false);
const fontSearch = ref('');
const fontFilterCategory = ref<'all' | 'chinese' | 'english'>('all');

const loadSystemFonts = async () => {
  if (systemFonts.value.length > 0) return;
  isLoadingFonts.value = true;
  try {
    if (window.electronAPI?.getSystemFonts) {
      const fonts = await window.electronAPI.getSystemFonts();
      if (fonts && fonts.length > 0) {
        systemFonts.value = fonts;
      }
    } else if (window.queryLocalFonts) {
      const list = await window.queryLocalFonts();
      const names = Array.from(new Set(list.map((f: any) => f.family))).sort();
      systemFonts.value = names;
    }
  } catch (e) {
    console.error('Failed to load local fonts', e);
  } finally {
    isLoadingFonts.value = false;
  }
};

onMounted(() => {
  loadSystemFonts();
});

watch(activeTab, (tab) => {
  if (tab === 'font') {
    loadSystemFonts();
  }
});

const filteredSystemFonts = computed(() => {
  let list = systemFonts.value;
  if (list.length === 0) return [];

  if (fontFilterCategory.value === 'chinese') {
    list = list.filter(f => /[\u4e00-\u9fa5]/.test(f) || /YaHei|SimSun|KaiTi|FangSong|Song|Ming|Hei|Yuan|Zhu|Kaiti|STSong|STKaiti/i.test(f));
  } else if (fontFilterCategory.value === 'english') {
    list = list.filter(f => !/[\u4e00-\u9fa5]/.test(f) && !/YaHei|SimSun|KaiTi|FangSong/i.test(f));
  }

  if (fontSearch.value.trim()) {
    const q = fontSearch.value.toLowerCase();
    list = list.filter(f => f.toLowerCase().includes(q));
  }
  return list;
});

const applyLocalFont = (fontFamily: string) => {
  settingStore.setFontFamily(fontFamily);
  soundFx.playTypewriterClick();
};

const handleFontFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const fontName = `UserFont_${Date.now()}`;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    settingStore.setCustomFont(fontName, dataUrl);
    soundFx.playCrystalChime();
  };
  reader.readAsDataURL(file);
};

const resetFont = () => {
  settingStore.setFontFamily('default');
  soundFx.playTypewriterClick();
};

const triggerBotAvatarUpload = () => {
  botAvatarInputRef.value?.click();
};

const triggerUserAvatarUpload = () => {
  userAvatarInputRef.value?.click();
};

const triggerFontFileUpload = () => {
  fontFileInputRef.value?.click();
};

// Interactive direct mouse drag for Bot Avatar
const isDraggingBot = ref(false);
let botDragStart = { x: 0, y: 0, ox: 0, oy: 0 };

const onBotMouseDown = (e: MouseEvent) => {
  if (!settingStore.settings.botAvatar?.url) return;
  isDraggingBot.value = true;
  botDragStart = {
    x: e.clientX,
    y: e.clientY,
    ox: settingStore.settings.botAvatar.offsetX || 0,
    oy: settingStore.settings.botAvatar.offsetY || 0,
  };
  window.addEventListener('mousemove', onBotMouseMove);
  window.addEventListener('mouseup', onBotMouseUp);
};

const onBotMouseMove = (e: MouseEvent) => {
  if (!isDraggingBot.value) return;
  const dx = e.clientX - botDragStart.x;
  const dy = e.clientY - botDragStart.y;
  settingStore.settings.botAvatar.offsetX = Math.round(botDragStart.ox + dx);
  settingStore.settings.botAvatar.offsetY = Math.round(botDragStart.oy + dy);
};

const onBotMouseUp = () => {
  isDraggingBot.value = false;
  window.removeEventListener('mousemove', onBotMouseMove);
  window.removeEventListener('mouseup', onBotMouseUp);
  settingStore.save();
};

const onBotWheel = (e: WheelEvent) => {
  if (!settingStore.settings.botAvatar?.url) return;
  const delta = e.deltaY < 0 ? 0.08 : -0.08;
  const next = Math.max(0.3, Math.min(5.0, (settingStore.settings.botAvatar.scale || 1.0) + delta));
  settingStore.settings.botAvatar.scale = parseFloat(next.toFixed(2));
  settingStore.save();
};

// Interactive direct mouse drag for User Avatar
const isDraggingUser = ref(false);
let userDragStart = { x: 0, y: 0, ox: 0, oy: 0 };

const onUserMouseDown = (e: MouseEvent) => {
  if (!settingStore.settings.userAvatar?.url) return;
  isDraggingUser.value = true;
  userDragStart = {
    x: e.clientX,
    y: e.clientY,
    ox: settingStore.settings.userAvatar.offsetX || 0,
    oy: settingStore.settings.userAvatar.offsetY || 0,
  };
  window.addEventListener('mousemove', onUserMouseMove);
  window.addEventListener('mouseup', onUserMouseUp);
};

const onUserMouseMove = (e: MouseEvent) => {
  if (!isDraggingUser.value) return;
  const dx = e.clientX - userDragStart.x;
  const dy = e.clientY - userDragStart.y;
  settingStore.settings.userAvatar.offsetX = Math.round(userDragStart.ox + dx);
  settingStore.settings.userAvatar.offsetY = Math.round(userDragStart.oy + dy);
};

const onUserMouseUp = () => {
  isDraggingUser.value = false;
  window.removeEventListener('mousemove', onUserMouseMove);
  window.removeEventListener('mouseup', onUserMouseUp);
  settingStore.save();
};

const onUserWheel = (e: WheelEvent) => {
  if (!settingStore.settings.userAvatar?.url) return;
  const delta = e.deltaY < 0 ? 0.08 : -0.08;
  const next = Math.max(0.3, Math.min(5.0, (settingStore.settings.userAvatar.scale || 1.0) + delta));
  settingStore.settings.userAvatar.scale = parseFloat(next.toFixed(2));
  settingStore.save();
};

const testPing = async () => {
  isTestingPing.value = true;
  soundFx.playTypewriterClick();
  await settingStore.checkAstrBotHealth();
  isTestingPing.value = false;
  pingSuccess.value = settingStore.astrBotStatus.online;
  if (pingSuccess.value) {
    soundFx.playCrystalChime();
  }
};

const handleBgUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const result = event.target?.result as string;
    if (result) {
      settingStore.settings.background.enabled = true;
      settingStore.settings.background.type = file.type.includes('video') ? 'video' : 'image';
      settingStore.settings.background.url = result;
      settingStore.save();
      soundFx.playCrystalChime();
    }
  };
  reader.readAsDataURL(file);
};

const handleBotAvatarUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const result = event.target?.result as string;
    if (result) {
      settingStore.settings.botAvatar = {
        url: result,
        scale: 1.5,
        offsetX: 0,
        offsetY: 0,
      };
      settingStore.settings.botAvatarUrl = result;
      settingStore.save();
      soundFx.playCrystalChime();
    }
  };
  reader.readAsDataURL(file);
};

const handleUserAvatarUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const result = event.target?.result as string;
    if (result) {
      settingStore.settings.userAvatar = {
        url: result,
        scale: 1.5,
        offsetX: 0,
        offsetY: 0,
      };
      settingStore.settings.userAvatarUrl = result;
      settingStore.save();
      soundFx.playCrystalChime();
    }
  };
  reader.readAsDataURL(file);
};


const resetBotAvatar = () => {
  settingStore.settings.botAvatar = { url: '', scale: 1.0, offsetX: 0, offsetY: 0 };
  settingStore.settings.botAvatarUrl = '';
  settingStore.save();
  soundFx.playTypewriterClick();
};

const resetUserAvatar = () => {
  settingStore.settings.userAvatar = { url: '', scale: 1.0, offsetX: 0, offsetY: 0 };
  settingStore.settings.userAvatarUrl = '';
  settingStore.save();
  soundFx.playTypewriterClick();
};

const addQuickPrompt = () => {
  const count = settingStore.settings.quickPrompts.length + 1;
  const newItem: QuickPromptItem = {
    id: 'p_' + Date.now(),
    label: `⚡ 快捷指令 ${count}`,
    text: '请帮我处理以下内容：\n',
  };
  settingStore.settings.quickPrompts.push(newItem);
  settingStore.save();
  soundFx.playTypewriterClick();
};

const removeQuickPrompt = (id: string) => {
  settingStore.settings.quickPrompts = settingStore.settings.quickPrompts.filter(p => p.id !== id);
  settingStore.save();
  soundFx.playTypewriterClick();
};

const applyChatRoomPreset = (preset: 'cyan' | 'pink' | 'white' | 'dark' | 'neon' | 'emerald') => {
  if (preset === 'cyan') {
    settingStore.settings.chatRoom = {
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
  } else if (preset === 'pink') {
    settingStore.settings.chatRoom = {
      themeName: 'pink',
      stageBgColor: '#1a0b18',
      stageBgOpacity: 0.50,
      stageBlur: 14,
      sidebarBgColor: '#1a0b18',
      sidebarBgOpacity: 0.75,
      topBarBgColor: '#1a0b18',
      topBarBgOpacity: 0.85,
      borderColor: '#db2777',
      accentColor: '#ec4899',
      assistantBgColor: '#2a1127',
      assistantBgOpacity: 0.85,
      assistantTextColor: '#fdf2f8',
      assistantBorderColor: '#ec4899',
      assistantBorderGlow: 0.45,
      assistantBorderRadius: 18,
      assistantBlur: 14,
      assistantFontSize: 14,
      userBgColor: '#db2777',
      userTextColor: '#ffffff',
      userBorderRadius: 18,
      thinkingBgColor: '#3b0764',
      thinkingBorderColor: '#f43f5e',
      thinkingTextColor: '#fbcfe8',
      inputBgColor: '#2a1127',
      inputBorderColor: '#ec4899',
    };
  } else if (preset === 'white') {
    settingStore.settings.chatRoom = {
      themeName: 'white',
      stageBgColor: '#0f172a',
      stageBgOpacity: 0.20,
      stageBlur: 16,
      sidebarBgColor: '#0f172a',
      sidebarBgOpacity: 0.45,
      topBarBgColor: '#0f172a',
      topBarBgOpacity: 0.55,
      borderColor: '#ffffff',
      accentColor: '#38bdf8',
      assistantBgColor: '#ffffff',
      assistantBgOpacity: 0.22,
      assistantTextColor: '#ffffff',
      assistantBorderColor: '#ffffff',
      assistantBorderGlow: 0.3,
      assistantBorderRadius: 20,
      assistantBlur: 16,
      assistantFontSize: 14,
      userBgColor: '#38bdf8',
      userTextColor: '#ffffff',
      userBorderRadius: 20,
      thinkingBgColor: '#ffffff15',
      thinkingBorderColor: '#ffffff60',
      thinkingTextColor: '#ffffff',
      inputBgColor: '#ffffff20',
      inputBorderColor: '#ffffff60',
    };
  } else if (preset === 'dark') {
    settingStore.settings.chatRoom = {
      themeName: 'dark',
      stageBgColor: '#000000',
      stageBgOpacity: 0.70,
      stageBlur: 8,
      sidebarBgColor: '#000000',
      sidebarBgOpacity: 0.85,
      topBarBgColor: '#000000',
      topBarBgOpacity: 0.90,
      borderColor: '#475569',
      accentColor: '#60a5fa',
      assistantBgColor: '#0f172a',
      assistantBgOpacity: 0.95,
      assistantTextColor: '#f3f4f6',
      assistantBorderColor: '#475569',
      assistantBorderGlow: 0.1,
      assistantBorderRadius: 10,
      assistantBlur: 6,
      assistantFontSize: 14,
      userBgColor: '#2563eb',
      userTextColor: '#ffffff',
      userBorderRadius: 10,
      thinkingBgColor: '#111827',
      thinkingBorderColor: '#6b7280',
      thinkingTextColor: '#9ca3af',
      inputBgColor: '#0f172a',
      inputBorderColor: '#475569',
    };
  } else if (preset === 'neon') {
    settingStore.settings.chatRoom = {
      themeName: 'neon',
      stageBgColor: '#090514',
      stageBgOpacity: 0.60,
      stageBlur: 14,
      sidebarBgColor: '#090514',
      sidebarBgOpacity: 0.80,
      topBarBgColor: '#090514',
      topBarBgOpacity: 0.88,
      borderColor: '#a855f7',
      accentColor: '#c084fc',
      assistantBgColor: '#1a0b2e',
      assistantBgOpacity: 0.90,
      assistantTextColor: '#f5f3ff',
      assistantBorderColor: '#a855f7',
      assistantBorderGlow: 0.8,
      assistantBorderRadius: 12,
      assistantBlur: 12,
      assistantFontSize: 14,
      userBgColor: '#9333ea',
      userTextColor: '#ffffff',
      userBorderRadius: 12,
      thinkingBgColor: '#2e1065',
      thinkingBorderColor: '#c084fc',
      thinkingTextColor: '#f3e8ff',
      inputBgColor: '#1a0b2e',
      inputBorderColor: '#a855f7',
    };
  } else if (preset === 'emerald') {
    settingStore.settings.chatRoom = {
      themeName: 'emerald',
      stageBgColor: '#021a14',
      stageBgOpacity: 0.50,
      stageBlur: 14,
      sidebarBgColor: '#021a14',
      sidebarBgOpacity: 0.75,
      topBarBgColor: '#021a14',
      topBarBgOpacity: 0.85,
      borderColor: '#10b981',
      accentColor: '#34d399',
      assistantBgColor: '#062d23',
      assistantBgOpacity: 0.88,
      assistantTextColor: '#ecfdf5',
      assistantBorderColor: '#10b981',
      assistantBorderGlow: 0.5,
      assistantBorderRadius: 14,
      assistantBlur: 12,
      assistantFontSize: 14,
      userBgColor: '#059669',
      userTextColor: '#ffffff',
      userBorderRadius: 14,
      thinkingBgColor: '#064e3b',
      thinkingBorderColor: '#34d399',
      thinkingTextColor: '#d1fae5',
      inputBgColor: '#062d23',
      inputBorderColor: '#10b981',
    };
  }
  settingStore.save();
  soundFx.playTypewriterClick();
};

const applyMiniPreset = (preset: 'cyan' | 'pink' | 'white' | 'dark' | 'neon' | 'tactical') => {
  const current = settingStore.settings.dialogueBox;
  const base = {
    width: current?.width || 320,
    minHeight: current?.minHeight || 70,
    offsetY: current?.offsetY || 0,
    fontSize: current?.fontSize || 14,
    showQuickPromptHint: true,
  };

  if (preset === 'cyan') {
    settingStore.settings.dialogueBox = {
      ...base,
      bgColor: '#0f172a',
      bgOpacity: 0.85,
      textColor: '#f8fafc',
      borderColor: '#38bdf8',
      borderGlow: 0.45,
      borderRadius: 16,
      blur: 12,
      thinkingBgColor: '#1e1b4b',
      thinkingBorderColor: '#a855f7',
      thinkingTextColor: '#e9d5ff',
      accentColor: '#38bdf8',
    };
  } else if (preset === 'pink') {
    settingStore.settings.dialogueBox = {
      ...base,
      bgColor: '#1e1022',
      bgOpacity: 0.85,
      textColor: '#fdf2f8',
      borderColor: '#ec4899',
      borderGlow: 0.45,
      borderRadius: 18,
      blur: 14,
      thinkingBgColor: '#3b0764',
      thinkingBorderColor: '#f43f5e',
      thinkingTextColor: '#fbcfe8',
      accentColor: '#ec4899',
    };
  } else if (preset === 'white') {
    settingStore.settings.dialogueBox = {
      ...base,
      bgColor: '#ffffff',
      bgOpacity: 0.25,
      textColor: '#ffffff',
      borderColor: '#ffffff',
      borderGlow: 0.3,
      borderRadius: 20,
      blur: 16,
      thinkingBgColor: '#ffffff15',
      thinkingBorderColor: '#ffffff60',
      thinkingTextColor: '#ffffff',
      accentColor: '#38bdf8',
    };
  } else if (preset === 'dark') {
    settingStore.settings.dialogueBox = {
      ...base,
      bgColor: '#030712',
      bgOpacity: 0.95,
      textColor: '#f3f4f6',
      borderColor: '#475569',
      borderGlow: 0.1,
      borderRadius: 10,
      blur: 6,
      thinkingBgColor: '#111827',
      thinkingBorderColor: '#6b7280',
      thinkingTextColor: '#9ca3af',
      accentColor: '#60a5fa',
    };
  } else if (preset === 'neon') {
    settingStore.settings.dialogueBox = {
      ...base,
      bgColor: '#090514',
      bgOpacity: 0.90,
      textColor: '#f5f3ff',
      borderColor: '#a855f7',
      borderGlow: 0.8,
      borderRadius: 12,
      blur: 12,
      thinkingBgColor: '#2e1065',
      thinkingBorderColor: '#c084fc',
      thinkingTextColor: '#f3e8ff',
      accentColor: '#a855f7',
    };
  } else if (preset === 'tactical') {
    settingStore.settings.dialogueBox = {
      ...base,
      bgColor: '#021019',
      bgOpacity: 0.88,
      textColor: '#e0f2fe',
      borderColor: '#06b6d4',
      borderGlow: 0.6,
      borderRadius: 8,
      blur: 14,
      thinkingBgColor: '#082f49',
      thinkingBorderColor: '#22d3ee',
      thinkingTextColor: '#cffafe',
      accentColor: '#06b6d4',
    };
  }
  settingStore.save();
  soundFx.playTypewriterClick();
};

const resetBackground = () => {
  settingStore.settings.background = {
    enabled: false,
    type: 'image',
    url: '',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    opacity: 0.35,
    blur: 0,
  };
  settingStore.save();
  soundFx.playTypewriterClick();
};

const changeTheme = (t: ThemeType) => {
  settingStore.setTheme(t);
  soundFx.playTypewriterClick();
};

const handleSave = () => {
  settingStore.save();
  soundFx.playCrystalChime();
  emit('close');
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
    <div class="w-full max-w-3xl rounded-2xl glass-panel border border-cyan-500/30 overflow-hidden shadow-[0_0_35px_rgba(56,189,248,0.3)] flex flex-col max-h-[88vh]">
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/70">
        <div class="flex items-center gap-2 text-cyan-300 font-medium text-xs md:text-sm">
          <ShieldCheck class="w-4 h-4" />
          <span class="font-mono tracking-wider">控制中心与偏好设置 (SETTINGS CENTER)</span>
        </div>
        <button 
          class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Hidden inputs for file upload -->
      <input 
        ref="botAvatarInputRef" 
        type="file" 
        accept=".png,.jpg,.jpeg,.webp,.gif" 
        class="hidden"
        @change="handleBotAvatarUpload"
      />
      <input 
        ref="userAvatarInputRef" 
        type="file" 
        accept=".png,.jpg,.jpeg,.webp,.gif" 
        class="hidden"
        @change="handleUserAvatarUpload"
      />
      <input 
        ref="bgFileInputRef" 
        type="file" 
        accept=".mp4,.webm,.png,.jpg,.jpeg,.webp,.gif" 
        class="hidden" 
        @change="handleBgUpload"
      />
      <input 
        ref="fontFileInputRef" 
        type="file" 
        accept=".ttf,.woff2,.woff,.otf" 
        class="hidden" 
        @change="handleFontFileUpload"
      />
      <input 
        ref="voiceAudioInputRef" 
        type="file" 
        multiple
        accept=".mp3,.wav,.ogg,.flac,.m4a,.aac,.webm" 
        class="hidden" 
        @change="handleVoiceAudioUpload"
      />

      <!-- Main Layout: Left Tabs + Right Content -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar Navigation -->
        <div class="w-48 border-r border-cyan-500/15 p-2 space-y-1 bg-slate-950/40 text-xs flex-shrink-0">
          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'chatroom' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'chatroom'"
          >
            <Palette class="w-4 h-4 text-cyan-400" />
            <span>🎨 大窗口聊天室配色与主题</span>
          </button>

          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'dialogue' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'dialogue'"
          >
            <MessageCircle class="w-4 h-4 text-emerald-400" />
            <span>💭 桌面悬浮小窗气泡与微调</span>
          </button>

          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'voice' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'voice'"
          >
            <Volume2 class="w-4 h-4 text-purple-400" />
            <span>🎙️ 触摸立绘自定义语音</span>
          </button>

          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'background' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'background'"
          >
            <ImageIcon class="w-4 h-4 text-pink-400" />
            <span>🖼️ 自定义壁纸与背景氛围</span>
          </button>

          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'prompts' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'prompts'"
          >
            <MessageSquareText class="w-4 h-4 text-sky-400" />
            <span>💬 头像与快捷提示词</span>
          </button>

          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'font' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'font'"
          >
            <Type class="w-4 h-4 text-amber-400" />
            <span>🔤 电脑字体库选择</span>
          </button>

          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'astrbot' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'astrbot'"
          >
            <Bot class="w-4 h-4 text-blue-400" />
            <span>🤖 AstrBot Hub</span>
          </button>

          <button 
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-left"
            :class="activeTab === 'deepseek' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'"
            @click="activeTab = 'deepseek'"
          >
            <Zap class="w-4 h-4 text-yellow-400" />
            <span>⚡ DeepSeek 直连</span>
          </button>

          <div class="pt-3 border-t border-cyan-500/15">
            <button 
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50 transition-colors text-left"
              @click="emit('open-studio')"
            >
              <Sparkles class="w-4 h-4 text-cyan-400 animate-spin" />
              <span>🎭 打开立绘设计工坊</span>
            </button>
          </div>
        </div>

        <!-- Right Content Body -->
        <div class="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
          <!-- 1. Avatars & Quick Prompts Tab -->
          <div v-if="activeTab === 'prompts'" class="space-y-4">
            <!-- Bot Avatar Section with Interactive Drag & Crop -->
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Bot class="w-3.5 h-3.5 text-cyan-400" />
                  <span>Bot 专属头像 (支持圆圈内鼠标拖拽 / 滚轮缩放)</span>
                </span>
                <span class="text-[10px] text-cyan-400 font-mono">
                  {{ settingStore.settings.botAvatar?.url ? '已导入自定义头像' : '默认矢量头像' }}
                </span>
              </div>

              <!-- Top Row: Preview with Mouse Drag & Upload -->
              <div class="flex items-center gap-4">
                <div 
                  class="w-20 h-20 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] bg-slate-950 overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center group flex-shrink-0"
                  title="按住鼠标左键拖动图片位置，滑动滚轮缩放"
                  @mousedown="onBotMouseDown"
                  @wheel.prevent="onBotWheel"
                >
                  <img 
                    v-if="settingStore.settings.botAvatar?.url"
                    :src="settingStore.settings.botAvatar.url"
                    alt="Bot Avatar Preview"
                    class="absolute pointer-events-none transition-transform select-none"
                    :style="{
                      top: '50%',
                      left: '50%',
                      minWidth: '100%',
                      minHeight: '100%',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      transform: `translate(-50%, -50%) scale(${settingStore.settings.botAvatar.scale || 1}) translate(${settingStore.settings.botAvatar.offsetX || 0}px, ${settingStore.settings.botAvatar.offsetY || 0}px)`,
                      transformOrigin: 'center center'
                    }"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <CharacterAvatar size="md" :interactive="false" />
                  </div>

                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-cyan-300 font-mono pointer-events-none">
                    拖拽微调
                  </div>
                </div>

                <div class="flex-1 space-y-2">
                  <div class="flex gap-2">
                    <button 
                      class="flex-1 py-1.5 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                      @click="botAvatarInputRef?.click()"
                    >
                      <Upload class="w-3.5 h-3.5" />
                      <span>{{ settingStore.settings.botAvatar?.url ? '更换图片' : '上传头像图片' }}</span>
                    </button>

                    <button 
                      v-if="settingStore.settings.botAvatar?.url"
                      class="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors"
                      title="恢复默认"
                      @click="resetBotAvatar"
                    >
                      <RotateCcw class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p class="text-[10px] text-slate-400">💡 提示：在左侧圆圈内直接**按住鼠标拖拽**可平移面部，**滑动滚轮**可缩放大小！</p>
                </div>
              </div>

              <!-- Sliders for Bot Avatar Scale & Offset (in px) -->
              <div v-if="settingStore.settings.botAvatar?.url" class="pt-2 border-t border-slate-800 space-y-2">
                <div class="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>缩放倍率</span>
                      <input 
                        v-model.number="settingStore.settings.botAvatar.scale"
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="10.0"
                        class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.botAvatar.scale"
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.05"
                      class="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>水平 X 偏移</span>
                      <input 
                        v-model.number="settingStore.settings.botAvatar.offsetX"
                        type="number"
                        class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.botAvatar.offsetX"
                      type="range"
                      min="-1000"
                      max="1000"
                      step="2"
                      class="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>垂直 Y 偏移</span>
                      <input 
                        v-model.number="settingStore.settings.botAvatar.offsetY"
                        type="number"
                        class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.botAvatar.offsetY"
                      type="range"
                      min="-1000"
                      max="1000"
                      step="2"
                      class="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- User Avatar Section with Interactive Drag & Crop -->
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <User class="w-3.5 h-3.5 text-pink-400" />
                  <span>用户个人头像 (支持圆圈内鼠标拖拽 / 滚轮缩放)</span>
                </span>
                <span class="text-[10px] text-pink-400 font-mono">
                  {{ settingStore.settings.userAvatar?.url ? '已导入自定义头像' : '默认头像' }}
                </span>
              </div>

              <!-- Top Row: Preview with Mouse Drag & Upload -->
              <div class="flex items-center gap-4">
                <div 
                  class="w-20 h-20 rounded-full border-2 border-pink-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] bg-slate-950 overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center group flex-shrink-0"
                  title="按住鼠标左键拖动图片位置，滑动滚轮缩放"
                  @mousedown="onUserMouseDown"
                  @wheel.prevent="onUserWheel"
                >
                  <img 
                    v-if="settingStore.settings.userAvatar?.url"
                    :src="settingStore.settings.userAvatar.url"
                    alt="User Avatar Preview"
                    class="absolute pointer-events-none transition-transform select-none"
                    :style="{
                      top: '50%',
                      left: '50%',
                      minWidth: '100%',
                      minHeight: '100%',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      transform: `translate(-50%, -50%) scale(${settingStore.settings.userAvatar.scale || 1}) translate(${settingStore.settings.userAvatar.offsetX || 0}px, ${settingStore.settings.userAvatar.offsetY || 0}px)`,
                      transformOrigin: 'center center'
                    }"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <User class="w-8 h-8 text-pink-400" />
                  </div>

                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-pink-300 font-mono pointer-events-none">
                    拖拽微调
                  </div>
                </div>

                <div class="flex-1 space-y-2">
                  <div class="flex gap-2">
                    <button 
                      class="flex-1 py-1.5 px-3 rounded-lg bg-pink-950/60 hover:bg-pink-900/60 border border-pink-500/40 text-pink-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                      @click="userAvatarInputRef?.click()"
                    >
                      <Upload class="w-3.5 h-3.5" />
                      <span>{{ settingStore.settings.userAvatar?.url ? '更换图片' : '上传头像图片' }}</span>
                    </button>

                    <button 
                      v-if="settingStore.settings.userAvatar?.url"
                      class="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors"
                      title="恢复默认"
                      @click="resetUserAvatar"
                    >
                      <RotateCcw class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p class="text-[10px] text-slate-400">💡 提示：在左侧圆圈内直接**按住鼠标拖拽**可平移面部，**滑动滚轮**可缩放大小！</p>
                </div>
              </div>

              <!-- Sliders for User Avatar Scale & Offset (in px) -->
              <div v-if="settingStore.settings.userAvatar?.url" class="pt-2 border-t border-slate-800 space-y-2">
                <div class="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>缩放倍率</span>
                      <input 
                        v-model.number="settingStore.settings.userAvatar.scale"
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="10.0"
                        class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-pink-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.userAvatar.scale"
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.05"
                      class="w-full accent-pink-400"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>水平 X 偏移</span>
                      <input 
                        v-model.number="settingStore.settings.userAvatar.offsetX"
                        type="number"
                        class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-pink-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.userAvatar.offsetX"
                      type="range"
                      min="-1000"
                      max="1000"
                      step="2"
                      class="w-full accent-pink-400"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>垂直 Y 偏移</span>
                      <input 
                        v-model.number="settingStore.settings.userAvatar.offsetY"
                        type="number"
                        class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-pink-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.userAvatar.offsetY"
                      type="range"
                      min="-1000"
                      max="1000"
                      step="2"
                      class="w-full accent-pink-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Prompts List Manager -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Sparkles class="w-3.5 h-3.5 text-cyan-400" />
                  <span>底部快捷提问按钮管理 (可自由添加/修改)</span>
                </span>
                <button 
                  class="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-medium flex items-center gap-1 transition-all text-[11px]"
                  @click="addQuickPrompt"
                >
                  <Plus class="w-3 h-3" />
                  <span>添加按钮</span>
                </button>
              </div>

              <!-- Prompts Cards -->
              <div class="space-y-2 max-h-44 overflow-y-auto pr-1">
                <div 
                  v-for="(p, idx) in settingStore.settings.quickPrompts" 
                  :key="p.id"
                  class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 font-mono text-[10px] flex items-center justify-center flex-shrink-0">
                      {{ idx + 1 }}
                    </span>
                    <input 
                      v-model="p.label" 
                      type="text" 
                      class="w-36 px-2 py-1 rounded-lg bg-slate-950/90 border border-slate-700 focus:border-cyan-400 text-cyan-300 text-xs outline-none"
                      placeholder="按钮显示文本 (如: 🔍 调研)"
                    />
                    <input 
                      v-model="p.text" 
                      type="text" 
                      class="flex-1 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-700 focus:border-cyan-400 text-slate-200 text-xs outline-none"
                      placeholder="填入输入框的提示词内容..."
                    />
                    <button 
                      class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      @click="removeQuickPrompt(p.id)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Big Chat Room Appearance & Theme Customizer Tab -->
          <div v-if="activeTab === 'chatroom'" class="space-y-4">
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <MessageSquare class="w-3.5 h-3.5 text-cyan-400" />
                  <span>🏛️ 大窗口主聊天室全景配色与主题深度定制</span>
                </span>
                <span class="text-[10px] text-cyan-400 font-mono">大窗口独立生效</span>
              </div>

              <!-- Live Chat Room Stream Preview -->
              <div class="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>🎨 聊天室实时预览 (Chat Room Live Preview)</span>
                  <span class="font-mono text-cyan-300">主题：{{ settingStore.settings.chatRoom?.themeName || '自定义' }}</span>
                </div>

                <div 
                  class="p-3.5 rounded-2xl border transition-all shadow-xl space-y-3 overflow-hidden"
                  :style="{
                    backgroundColor: settingStore.settings.chatRoom?.stageBgColor ? `${settingStore.settings.chatRoom.stageBgColor}${Math.round((settingStore.settings.chatRoom.stageBgOpacity ?? 0.45) * 255).toString(16).padStart(2, '0')}` : 'rgba(2, 6, 23, 0.45)',
                    borderColor: `${settingStore.settings.chatRoom?.borderColor || '#0284c7'}80`,
                    backdropFilter: `blur(${settingStore.settings.chatRoom?.stageBlur ?? 12}px)`
                  }"
                >
                  <!-- 1. User Bubble Preview (Right aligned) -->
                  <div class="flex items-end justify-end gap-2">
                    <div 
                      class="px-3 py-1.5 text-xs rounded-2xl rounded-tr-sm shadow-md max-w-[75%]"
                      :style="{
                        backgroundColor: settingStore.settings.chatRoom?.userBgColor || settingStore.settings.chatRoom?.accentColor || '#0284c7',
                        color: settingStore.settings.chatRoom?.userTextColor || '#ffffff',
                        borderRadius: `${settingStore.settings.chatRoom?.userBorderRadius || 16}px`
                      }"
                    >
                      你好呀，今天想和你聊聊天~
                    </div>
                    <div class="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] text-white flex-shrink-0">
                      我
                    </div>
                  </div>

                  <!-- 2. Assistant Bubble Preview (Left aligned) -->
                  <div class="flex items-start justify-start gap-2">
                    <div class="w-5 h-5 rounded-full bg-slate-950 border flex items-center justify-center flex-shrink-0" :style="{ borderColor: settingStore.settings.chatRoom?.assistantBorderColor || '#38bdf8' }">
                      <Bot class="w-3 h-3" :style="{ color: settingStore.settings.chatRoom?.accentColor || '#38bdf8' }" />
                    </div>

                    <div 
                      class="p-3 border rounded-2xl rounded-tl-sm transition-all shadow-md space-y-2 max-w-[85%]"
                      :style="{
                        backgroundColor: settingStore.settings.chatRoom?.assistantBgColor || '#0f172a',
                        borderColor: settingStore.settings.chatRoom?.assistantBorderColor || '#38bdf8',
                        color: settingStore.settings.chatRoom?.assistantTextColor || '#f8fafc',
                        borderRadius: `${settingStore.settings.chatRoom?.assistantBorderRadius || 16}px`,
                        boxShadow: (settingStore.settings.chatRoom?.assistantBorderGlow || 0.4) > 0 ? `0 0 ${(settingStore.settings.chatRoom?.assistantBorderGlow || 0.4) * 15}px ${settingStore.settings.chatRoom?.assistantBorderColor || '#38bdf8'}` : 'none',
                        fontSize: `${settingStore.settings.chatRoom?.assistantFontSize || 14}px`
                      }"
                    >
                      <!-- Thinking Box Preview -->
                      <div 
                        class="rounded-xl p-2 border text-[10.5px] space-y-1"
                        :style="{
                          backgroundColor: settingStore.settings.chatRoom?.thinkingBgColor || '#1e1b4b',
                          borderColor: settingStore.settings.chatRoom?.thinkingBorderColor || '#a855f7',
                          color: settingStore.settings.chatRoom?.thinkingTextColor || '#e9d5ff'
                        }"
                      >
                        <div class="flex items-center justify-between font-semibold text-[10px]">
                          <div class="flex items-center gap-1">
                            <Brain class="w-3 h-3 animate-pulse" :style="{ color: settingStore.settings.chatRoom?.thinkingBorderColor || '#a855f7' }" />
                            <span>💭 正在认真思考中...</span>
                          </div>
                          <span class="px-1 rounded bg-purple-500/20 font-mono text-[9px]">42s</span>
                        </div>
                        <div class="opacity-80 text-[9.5px]">✨ 正在仔细想该对你说些什么...</div>
                      </div>

                      <!-- Typing Stream Preview -->
                      <div class="text-xs leading-relaxed flex items-center gap-1">
                        <span>很高兴陪在你身边！随时随地找我倾诉或者玩耍都可以哦~</span>
                        <span class="inline-block w-1.5 h-3.5 animate-pulse" :style="{ backgroundColor: settingStore.settings.chatRoom?.accentColor || '#38bdf8' }"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Presets Grid (6 Themes for Chat Room) -->
              <div class="space-y-1.5">
                <label class="block text-[11px] text-slate-400">大窗口专属一键设计预设主题</label>
                <div class="grid grid-cols-6 gap-1.5 text-[10px]">
                  <button 
                    class="py-1.5 px-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 font-medium text-center"
                    @click="applyChatRoomPreset('cyan')"
                  >
                    蔚蓝星轨
                  </button>
                  <button 
                    class="py-1.5 px-1 rounded-lg bg-pink-950/60 border border-pink-500/40 text-pink-300 hover:bg-pink-900/60 font-medium text-center"
                    @click="applyChatRoomPreset('pink')"
                  >
                    樱花绯红
                  </button>
                  <button 
                    class="py-1.5 px-1 rounded-lg bg-slate-800/80 border border-white/40 text-slate-100 hover:bg-slate-700/80 font-medium text-center"
                    @click="applyChatRoomPreset('white')"
                  >
                    纯白通透
                  </button>
                  <button 
                    class="py-1.5 px-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:bg-slate-900 font-medium text-center"
                    @click="applyChatRoomPreset('dark')"
                  >
                    极简黑曜
                  </button>
                  <button 
                    class="py-1.5 px-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 font-medium text-center"
                    @click="applyChatRoomPreset('neon')"
                  >
                    赛博霓虹
                  </button>
                  <button 
                    class="py-1.5 px-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 font-medium text-center"
                    @click="applyChatRoomPreset('emerald')"
                  >
                    翡翠清风
                  </button>
                </div>
              </div>

              <!-- Main Chat Room Customizer Controls -->
              <div class="pt-2 border-t border-slate-800 space-y-3 text-[11px]">
                <!-- 1. Stage Background & Theme Accent -->
                <span class="font-semibold text-slate-300 block">🎨 1. 聊天室舞台背景与全局色调</span>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-slate-400 mb-1 text-[10px]">舞台背景基色</label>
                    <div class="flex items-center gap-1.5">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.chatRoom.stageBgColor"
                        class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.chatRoom.stageBgColor"
                        class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[10px] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-slate-400 mb-1 text-[10px]">主题/发送高亮主色</label>
                    <div class="flex items-center gap-1.5">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.chatRoom.accentColor"
                        class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.chatRoom.accentColor"
                        class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-200 text-[10px] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-slate-400 mb-1 text-[10px]">边框分割线颜色</label>
                    <div class="flex items-center gap-1.5">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.chatRoom.borderColor"
                        class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.chatRoom.borderColor"
                        class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[10px] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 text-[10px]">
                      <span>舞台背景不透明度</span>
                      <span class="font-mono text-cyan-300">{{ Math.round((settingStore.settings.chatRoom.stageBgOpacity ?? 0.45) * 100) }}%</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.chatRoom.stageBgOpacity"
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      class="w-full accent-cyan-400 mt-1"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 text-[10px]">
                      <span>毛玻璃模糊度</span>
                      <span class="font-mono text-cyan-300">{{ settingStore.settings.chatRoom.stageBlur ?? 12 }}px</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.chatRoom.stageBlur"
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      class="w-full accent-cyan-400 mt-1"
                    />
                  </div>

                  <div>
                    <label class="block text-slate-400 mb-1 text-[10px]">边栏底色 (Sidebar)</label>
                    <div class="flex items-center gap-1.5">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.chatRoom.sidebarBgColor"
                        class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.chatRoom.sidebarBgColor"
                        class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[10px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                <!-- 2. Assistant Bubble Styling -->
                <div class="pt-2 border-t border-slate-800 space-y-2">
                  <span class="font-semibold text-slate-300 block">💬 2. 伴侣消息气泡外观</span>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-slate-400 mb-1">气泡背景色</label>
                      <div class="flex items-center gap-2">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.assistantBgColor"
                          class="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.assistantBgColor"
                          class="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1">气泡边框色</label>
                      <div class="flex items-center gap-2">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.assistantBorderColor"
                          class="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.assistantBorderColor"
                          class="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1">文字颜色</label>
                      <div class="flex items-center gap-2">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.assistantTextColor"
                          class="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.assistantTextColor"
                          class="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1">
                        <span>气泡不透明度</span>
                        <span class="font-mono text-cyan-300">{{ Math.round((settingStore.settings.chatRoom.assistantBgOpacity ?? 0.85) * 100) }}%</span>
                      </div>
                      <input 
                        v-model.number="settingStore.settings.chatRoom.assistantBgOpacity"
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1">
                        <span>圆角弧度</span>
                        <span class="font-mono text-cyan-300">{{ settingStore.settings.chatRoom.assistantBorderRadius ?? 16 }}px</span>
                      </div>
                      <input 
                        v-model.number="settingStore.settings.chatRoom.assistantBorderRadius"
                        type="range"
                        min="4"
                        max="32"
                        step="1"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1">
                        <span>边框发光</span>
                        <span class="font-mono text-cyan-300">{{ Math.round((settingStore.settings.chatRoom.assistantBorderGlow ?? 0.4) * 100) }}%</span>
                      </div>
                      <input 
                        v-model.number="settingStore.settings.chatRoom.assistantBorderGlow"
                        type="range"
                        min="0"
                        max="1.0"
                        step="0.05"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1">
                        <span>毛玻璃模糊度</span>
                        <span class="font-mono text-cyan-300">{{ settingStore.settings.chatRoom.assistantBlur ?? 12 }}px</span>
                      </div>
                      <input 
                        v-model.number="settingStore.settings.chatRoom.assistantBlur"
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1 items-center">
                        <span>文字大小</span>
                        <input 
                          v-model.number="settingStore.settings.chatRoom.assistantFontSize"
                          type="number"
                          class="w-14 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                        />
                      </div>
                      <input 
                        v-model.number="settingStore.settings.chatRoom.assistantFontSize"
                        type="range"
                        min="12"
                        max="28"
                        step="1"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <!-- 3. User Bubble Styling -->
                <div class="pt-2 border-t border-slate-800 space-y-2">
                  <span class="font-semibold text-blue-300 block flex items-center gap-1.5">
                    <User class="w-3.5 h-3.5 text-blue-400" />
                    <span>👤 3. 我的消息气泡外观</span>
                  </span>
                  <div class="grid grid-cols-3 gap-2.5">
                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">我的气泡背景色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.userBgColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.userBgColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-blue-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">我的文字颜色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.userTextColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.userTextColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-blue-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1 text-[10px]">
                        <span>圆角弧度</span>
                        <span class="font-mono text-cyan-300">{{ settingStore.settings.chatRoom.userBorderRadius ?? 16 }}px</span>
                      </div>
                      <input 
                        v-model.number="settingStore.settings.chatRoom.userBorderRadius"
                        type="range"
                        min="4"
                        max="32"
                        step="1"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <!-- 4. Thinking Box Color Pickers -->
                <div class="pt-2 border-t border-slate-800 space-y-2">
                  <span class="font-semibold text-purple-300 block flex items-center gap-1.5">
                    <Brain class="w-3.5 h-3.5 text-purple-400" />
                    <span>💭 4. 角色思考中卡片专属配色</span>
                  </span>
                  <div class="grid grid-cols-3 gap-2.5">
                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">思考卡片背景色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.thinkingBgColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.thinkingBgColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-purple-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">思考卡片边框色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.thinkingBorderColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.thinkingBorderColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-purple-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">思考卡片文字色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.thinkingTextColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.thinkingTextColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-purple-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 5. Input Box Styling -->
                <div class="pt-2 border-t border-slate-800 space-y-2">
                  <span class="font-semibold text-slate-300 block">⌨️ 5. 底部输入框配色</span>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">输入框背景色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.inputBgColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.inputBgColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">输入框边框色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.chatRoom.inputBorderColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.chatRoom.inputBorderColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Mini Window Dialogue Box Customizer Tab -->
          <div v-if="activeTab === 'dialogue'" class="space-y-4">
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <MessageCircle class="w-3.5 h-3.5 text-emerald-400" />
                    <span>💭 桌面透明悬浮小窗气泡与思考卡片独立定制</span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5">小窗专属独立生效，可随时拖拽或一键恢复默认</div>
                </div>

                <!-- One-click Reset Button -->
                <button 
                  class="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-medium flex items-center gap-1.5 shadow transition-all active:scale-95"
                  title="恢复小窗气泡默认宽度(320px)、高度(70px)与默认位置"
                  @click="settingStore.resetDialogueBoxToDefault()"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>🔄 恢复气泡默认尺寸与位置</span>
                </button>
              </div>

              <!-- Live Mini Window Preview Card inside Settings Modal -->
              <div class="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>实时预览效果 (Mini Preview)</span>
                  <span class="font-mono text-emerald-300">桌面悬浮立牌展示效果</span>
                </div>

                <div 
                  class="p-3 border relative rounded-2xl transition-all shadow-xl space-y-2 overflow-hidden"
                  :style="{
                    backgroundColor: settingStore.settings.dialogueBox.bgColor,
                    borderColor: settingStore.settings.dialogueBox.borderColor,
                    color: settingStore.settings.dialogueBox.textColor,
                    borderRadius: `${settingStore.settings.dialogueBox.borderRadius || 16}px`,
                    boxShadow: (settingStore.settings.dialogueBox.borderGlow || 0.4) > 0 ? `0 0 ${(settingStore.settings.dialogueBox.borderGlow || 0.4) * 20}px ${settingStore.settings.dialogueBox.borderColor}` : 'none'
                  }"
                >
                  <!-- Top Row -->
                  <div class="flex items-center justify-between opacity-90 text-xs">
                    <div class="flex items-center gap-1.5">
                      <div class="w-4 h-4 rounded-full bg-slate-950 border flex items-center justify-center" :style="{ borderColor: settingStore.settings.dialogueBox.borderColor }">
                        <Bot class="w-2.5 h-2.5 text-cyan-400" />
                      </div>
                      <span class="font-bold text-[11px]">{{ settingStore.settings.botDisplayName }}</span>
                    </div>
                    <span class="text-[9px] px-1 py-0.2 rounded bg-white/10 font-mono">小窗预览</span>
                  </div>

                  <!-- Thinking Box Preview -->
                  <div 
                    class="rounded-xl p-2 border text-[10.5px] space-y-1"
                    :style="{
                      backgroundColor: settingStore.settings.dialogueBox.thinkingBgColor || '#1e1b4b',
                      borderColor: settingStore.settings.dialogueBox.thinkingBorderColor || '#a855f7',
                      color: settingStore.settings.dialogueBox.thinkingTextColor || '#e9d5ff'
                    }"
                  >
                    <div class="flex items-center justify-between font-semibold text-[10px]">
                      <div class="flex items-center gap-1">
                        <Brain class="w-3 h-3 text-purple-400 animate-pulse" />
                        <span>💭 正在认真思考中...</span>
                      </div>
                      <span class="px-1 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px]">42s</span>
                    </div>
                    <div class="opacity-80 text-[9.5px]">✨ 正在仔细想该对你说些什么...</div>
                  </div>

                  <!-- Typing Stream Preview -->
                  <div class="text-[11px] leading-relaxed flex items-center gap-1">
                    <span>✍️ 正在输入中...</span>
                    <span class="inline-block w-1.5 h-3 bg-cyan-400 animate-pulse"></span>
                  </div>
                </div>
              </div>

              <!-- Presets Grid (6 Themes for Mini Overlay) -->
              <div class="space-y-1.5">
                <label class="block text-[11px] text-slate-400">小窗专属一键设计主题</label>
                <div class="grid grid-cols-6 gap-1.5 text-[10px]">
                  <button 
                    class="py-1.5 px-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 font-medium text-center"
                    @click="applyMiniPreset('cyan')"
                  >
                    蔚蓝科技
                  </button>
                  <button 
                    class="py-1.5 px-1.5 rounded-lg bg-pink-950/60 border border-pink-500/40 text-pink-300 hover:bg-pink-900/60 font-medium text-center"
                    @click="applyMiniPreset('pink')"
                  >
                    樱花物语
                  </button>
                  <button 
                    class="py-1.5 px-1.5 rounded-lg bg-slate-800/80 border border-white/40 text-slate-100 hover:bg-slate-700/80 font-medium text-center"
                    @click="applyMiniPreset('white')"
                  >
                    纯白通透
                  </button>
                  <button 
                    class="py-1.5 px-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:bg-slate-900 font-medium text-center"
                    @click="applyMiniPreset('dark')"
                  >
                    极简黑金
                  </button>
                  <button 
                    class="py-1.5 px-1.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 font-medium text-center"
                    @click="applyMiniPreset('neon')"
                  >
                    赛博霓虹
                  </button>
                  <button 
                    class="py-1.5 px-1.5 rounded-lg bg-sky-950/60 border border-cyan-400/50 text-cyan-300 hover:bg-sky-900/60 font-medium text-center"
                    @click="applyMiniPreset('tactical')"
                  >
                    清凉冰蓝
                  </button>
                </div>
              </div>

              <!-- Main Dialogue Box Customizer -->
              <div class="pt-2 border-t border-slate-800 space-y-3 text-[11px]">
                <span class="font-semibold text-slate-300 block">💬 1. 悬浮气泡主体配色与毛玻璃</span>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-slate-400 mb-1">气泡背景基色 (Background)</label>
                    <div class="flex items-center gap-2">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.dialogueBox.bgColor"
                        class="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.dialogueBox.bgColor"
                        class="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-slate-400 mb-1">边框颜色 (Border Color)</label>
                    <div class="flex items-center gap-2">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.dialogueBox.borderColor"
                        class="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.dialogueBox.borderColor"
                        class="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-slate-400 mb-1">正文文字颜色 (Text Color)</label>
                    <div class="flex items-center gap-2">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.dialogueBox.textColor"
                        class="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.dialogueBox.textColor"
                        class="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-slate-400 mb-1">高亮/主题主色 (Accent Color)</label>
                    <div class="flex items-center gap-2">
                      <input 
                        type="color" 
                        v-model="settingStore.settings.dialogueBox.accentColor"
                        class="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        v-model="settingStore.settings.dialogueBox.accentColor"
                        class="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1">
                      <span>背景不透明度 (Opacity)</span>
                      <span class="font-mono text-cyan-300">{{ Math.round((settingStore.settings.dialogueBox.bgOpacity ?? 0.85) * 100) }}%</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.dialogueBox.bgOpacity"
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      class="w-full accent-cyan-400 mt-1"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1">
                      <span>毛玻璃模糊度 (Backdrop Blur)</span>
                      <span class="font-mono text-cyan-300">{{ settingStore.settings.dialogueBox.blur ?? 12 }}px</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.dialogueBox.blur"
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      class="w-full accent-cyan-400 mt-1"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1">
                      <span>圆角弧度 (Radius)</span>
                      <span class="font-mono text-cyan-300">{{ settingStore.settings.dialogueBox.borderRadius ?? 16 }}px</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.dialogueBox.borderRadius"
                      type="range"
                      min="4"
                      max="32"
                      step="1"
                      class="w-full accent-cyan-400 mt-1"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1">
                      <span>边框外发光 (Glow)</span>
                      <span class="font-mono text-cyan-300">{{ Math.round((settingStore.settings.dialogueBox.borderGlow ?? 0.4) * 100) }}%</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.dialogueBox.borderGlow"
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.05"
                      class="w-full accent-cyan-400 mt-1"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>文字大小 (Font Size)</span>
                      <input 
                        v-model.number="settingStore.settings.dialogueBox.fontSize"
                        type="number"
                        class="w-14 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.dialogueBox.fontSize"
                      type="range"
                      min="12"
                      max="28"
                      step="1"
                      class="w-full accent-cyan-400 mt-1"
                    />
                  </div>
                </div>

                <!-- Thinking Box Color Pickers -->
                <div class="pt-2 border-t border-slate-800 space-y-2">
                  <span class="font-semibold text-purple-300 block flex items-center gap-1.5">
                    <Brain class="w-3.5 h-3.5 text-purple-400" />
                    <span>💭 2. 小窗角色思考中卡片专属配色</span>
                  </span>
                  <div class="grid grid-cols-3 gap-2.5">
                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">思考卡片背景色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.dialogueBox.thinkingBgColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.dialogueBox.thinkingBgColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-purple-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">思考卡片边框色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.dialogueBox.thinkingBorderColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.dialogueBox.thinkingBorderColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-purple-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-slate-400 mb-1 text-[10px]">思考卡片文字色</label>
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          v-model="settingStore.settings.dialogueBox.thinkingTextColor"
                          class="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          v-model="settingStore.settings.dialogueBox.thinkingTextColor"
                          class="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-purple-200 text-[10px] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Mini Window Layout Sliders -->
                <div class="pt-2 border-t border-slate-800 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-slate-300 block">📐 3. 悬浮小窗气泡尺寸与位置微调</span>
                    <button 
                      class="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                      @click="settingStore.resetDialogueBoxToDefault()"
                    >
                      <RotateCcw class="w-2.5 h-2.5" />
                      <span>恢复默认尺寸</span>
                    </button>
                  </div>
                  <div class="grid grid-cols-3 gap-2.5">
                    <div>
                      <div class="flex justify-between text-slate-400 mb-1 items-center">
                        <span>气泡宽度 (Width)</span>
                        <input 
                          v-model.number="settingStore.settings.dialogueBox.width"
                          type="number"
                          class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                        />
                      </div>
                      <input 
                        v-model.number="settingStore.settings.dialogueBox.width"
                        type="range"
                        min="200"
                        max="600"
                        step="5"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1 items-center">
                        <span>最小高度 (Height)</span>
                        <input 
                          v-model.number="settingStore.settings.dialogueBox.minHeight"
                          type="number"
                          class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                        />
                      </div>
                      <input 
                        v-model.number="settingStore.settings.dialogueBox.minHeight"
                        type="range"
                        min="50"
                        max="240"
                        step="5"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>

                    <div>
                      <div class="flex justify-between text-slate-400 mb-1 items-center">
                        <span>位置偏移 (Y Offset)</span>
                        <input 
                          v-model.number="settingStore.settings.dialogueBox.offsetY"
                          type="number"
                          class="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                        />
                      </div>
                      <input 
                        v-model.number="settingStore.settings.dialogueBox.offsetY"
                        type="range"
                        min="-100"
                        max="100"
                        step="2"
                        class="w-full accent-cyan-400 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Local Installed System Fonts Picker Tab -->
          <div v-if="activeTab === 'font'" class="space-y-4">
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Type class="w-3.5 h-3.5 text-amber-400" />
                  <span>电脑本地字体库 (直接挑选本机已安装字体)</span>
                </span>
                <span class="text-[10px] text-amber-400 font-mono">
                  已检测到 {{ systemFonts.length }} 款字体
                </span>
              </div>

              <!-- Current Selected Font Banner -->
              <div class="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div class="text-[10px] text-slate-400">当前正在使用的全局字体：</div>
                  <div class="font-bold text-sm text-amber-300 mt-0.5" :style="{ fontFamily: settingStore.settings.font.fontFamily }">
                    {{ settingStore.settings.font.fontFamily === 'default' ? '系统默认无衬线 (Inter / Default)' : settingStore.settings.font.fontFamily }}
                  </div>
                </div>
                <div class="text-right text-[10px] text-slate-400">
                  <div class="font-mono text-cyan-300" :style="{ fontFamily: settingStore.settings.font.fontFamily }">
                    星轨 AI 伴侣 · 预览 Sample
                  </div>
                </div>
              </div>

              <!-- Search and Category Filter -->
              <div class="flex items-center gap-2">
                <div class="relative flex-1">
                  <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input 
                    v-model="fontSearch"
                    type="text"
                    class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-400"
                    placeholder="输入字体名称搜索 (如: 微软雅黑, 楷体, Cascadia, Fira, 宋体, Segoe...)"
                  />
                </div>

                <div class="flex gap-1 text-[10px]">
                  <button 
                    class="px-2.5 py-1.5 rounded-lg border transition-colors"
                    :class="fontFilterCategory === 'all' ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'"
                    @click="fontFilterCategory = 'all'"
                  >
                    全部
                  </button>
                  <button 
                    class="px-2.5 py-1.5 rounded-lg border transition-colors"
                    :class="fontFilterCategory === 'chinese' ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'"
                    @click="fontFilterCategory = 'chinese'"
                  >
                    中文字体
                  </button>
                  <button 
                    class="px-2.5 py-1.5 rounded-lg border transition-colors"
                    :class="fontFilterCategory === 'english' ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'"
                    @click="fontFilterCategory = 'english'"
                  >
                    英文字体
                  </button>
                </div>
              </div>

              <!-- Loading State -->
              <div v-if="isLoadingFonts" class="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 class="w-5 h-5 text-amber-400 animate-spin" />
                <span class="text-xs">正在扫描电脑中的字体库...</span>
              </div>

              <!-- Local Fonts List -->
              <div v-else class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                <!-- Default Option -->
                <div 
                  class="p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  :class="settingStore.settings.font.fontFamily === 'default' ? 'bg-amber-950/40 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'"
                  @click="selectSystemFont('default')"
                >
                  <div>
                    <div class="font-medium text-xs">✨ 系统默认无衬线字体 (Default Modern Sans)</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                      星轨 AI 伴侣 · 界面清晰标准字体
                    </div>
                  </div>
                  <Check v-if="settingStore.settings.font.fontFamily === 'default'" class="w-4 h-4 text-amber-400" />
                </div>

                <!-- System Installed Fonts -->
                <div 
                  v-for="font in filteredSystemFonts" 
                  :key="font"
                  class="p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  :class="settingStore.settings.font.fontFamily === font ? 'bg-amber-950/40 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'"
                  @click="selectSystemFont(font)"
                >
                  <div class="flex-1 mr-2 truncate">
                    <div class="font-medium text-xs flex items-center gap-1.5">
                      <span>{{ font }}</span>
                    </div>
                    <!-- Live font preview string -->
                    <div 
                      class="text-[11px] text-slate-400 mt-1 truncate"
                      :style="{ fontFamily: font }"
                    >
                      “星轨流转，与你相伴。” (The quick brown fox 123)
                    </div>
                  </div>
                  <Check v-if="settingStore.settings.font.fontFamily === font" class="w-4 h-4 text-amber-400 flex-shrink-0" />
                </div>

                <div v-if="filteredSystemFonts.length === 0" class="py-6 text-center text-slate-500 text-xs">
                  没有找到包含 "{{ fontSearch }}" 的电脑字体
                </div>
              </div>

              <!-- Upload Local Font File Alternative -->
              <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span class="text-slate-400">没有安装字体？也可直接上传字体文件：</span>
                <button 
                  class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5"
                  @click="fontFileInputRef?.click()"
                >
                  <Upload class="w-3 h-3" />
                  <span>上传 .ttf/.woff2 文件</span>
                </button>
              </div>

              <!-- Font Size Scaling -->
              <div class="pt-2 border-t border-slate-800">
                <div class="flex justify-between text-slate-300 mb-1">
                  <span>界面全局文字大小缩放</span>
                  <span class="font-mono text-amber-300">{{ (settingStore.settings.font.fontSizeScale * 100).toFixed(0) }}%</span>
                </div>
                <input 
                  v-model.number="settingStore.settings.font.fontSizeScale"
                  type="range"
                  min="0.85"
                  max="1.35"
                  step="0.05"
                  class="w-full accent-amber-400"
                  @change="settingStore.save()"
                />
              </div>
            </div>
          </div>

          <!-- 3.5 Touch Voice Tab -->
          <div v-if="activeTab === 'voice'" class="space-y-4">
            <!-- Master Switch Card -->
            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                    <Volume2 class="w-4 h-4 text-purple-400" />
                    <span>小窗立绘触摸自定义语音 (Interactive Touch Voice)</span>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-0.5">
                    在桌面小窗模式下触摸/点击立绘不同部位时，触发你导入的专属语音台词
                  </div>
                </div>

                <!-- Toggle Switch -->
                <button 
                  class="w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 border"
                  :class="settingStore.settings.touchVoice?.enabled ? 'bg-purple-600 border-purple-400' : 'bg-slate-800 border-slate-700'"
                  @click="settingStore.settings.touchVoice!.enabled = !settingStore.settings.touchVoice?.enabled; settingStore.save();"
                >
                  <div 
                    class="w-5 h-5 rounded-full bg-white transition-transform transform shadow-md"
                    :class="settingStore.settings.touchVoice?.enabled ? 'translate-x-6' : 'translate-x-0'"
                  ></div>
                </button>
              </div>

              <!-- Parameter Settings Row -->
              <div v-if="settingStore.settings.touchVoice?.enabled" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <!-- Volume Slider -->
                <div>
                  <div class="flex justify-between text-slate-300 mb-1 text-[11px]">
                    <span>触摸语音音量 (Volume)</span>
                    <span class="font-mono text-purple-300">{{ Math.round((settingStore.settings.touchVoice?.volume ?? 0.85) * 100) }}%</span>
                  </div>
                  <input 
                    v-model.number="settingStore.settings.touchVoice!.volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    class="w-full accent-purple-400"
                    @change="settingStore.save()"
                  />
                </div>

                <!-- Playback Mode -->
                <div>
                  <div class="text-slate-300 mb-1 text-[11px]">播放顺序 (Play Mode)</div>
                  <div class="flex gap-2">
                    <button 
                      class="flex-1 py-1 px-2 rounded-lg border text-xs transition-colors"
                      :class="settingStore.settings.touchVoice?.playMode === 'random' ? 'bg-purple-950/60 border-purple-400 text-purple-200' : 'bg-slate-950 border-slate-700 text-slate-400'"
                      @click="settingStore.settings.touchVoice!.playMode = 'random'; settingStore.save();"
                    >
                      🎲 随机抽取播放
                    </button>
                    <button 
                      class="flex-1 py-1 px-2 rounded-lg border text-xs transition-colors"
                      :class="settingStore.settings.touchVoice?.playMode === 'sequential' ? 'bg-purple-950/60 border-purple-400 text-purple-200' : 'bg-slate-950 border-slate-700 text-slate-400'"
                      @click="settingStore.settings.touchVoice!.playMode = 'sequential'; settingStore.save();"
                    >
                      🔄 顺序循环播放
                    </button>
                  </div>
                </div>

                <!-- Cooldown Slider -->
                <div>
                  <div class="flex justify-between text-slate-300 mb-1 text-[11px]">
                    <span>防连击冷却间隔 (Cooldown)</span>
                    <span class="font-mono text-purple-300">{{ settingStore.settings.touchVoice?.cooldownMs ?? 1200 }}ms</span>
                  </div>
                  <input 
                    v-model.number="settingStore.settings.touchVoice!.cooldownMs"
                    type="range"
                    min="500"
                    max="3000"
                    step="100"
                    class="w-full accent-purple-400"
                    @change="settingStore.save()"
                  />
                </div>

                <!-- Bubble Reaction Toggle -->
                <div class="flex items-center justify-between pt-3">
                  <span class="text-slate-300 text-[11px]">气泡同步显示台词文字</span>
                  <input 
                    v-model="settingStore.settings.touchVoice!.showBubbleReaction"
                    type="checkbox"
                    class="accent-purple-400 w-4 h-4 rounded"
                    @change="settingStore.save()"
                  />
                </div>
              </div>
            </div>

            <!-- Upload Bar & Action Header -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <div class="font-medium text-slate-200 text-xs flex items-center gap-1.5">
                  <Music class="w-3.5 h-3.5 text-purple-400" />
                  <span>已导入语音列表 ({{ settingStore.settings.touchVoice?.voices.length || 0 }} 条)</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">支持批量导入 .mp3, .wav, .ogg, .flac, .m4a 格式语音包</div>
              </div>

              <div class="flex items-center gap-2">
                <button 
                  v-if="(settingStore.settings.touchVoice?.voices.length || 0) > 0"
                  class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 text-xs flex items-center gap-1 transition-colors"
                  @click="handleClearAllVoices"
                >
                  <Trash2 class="w-3 h-3" />
                  <span>清空全部</span>
                </button>

                <button 
                  class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all"
                  @click="voiceAudioInputRef?.click()"
                >
                  <Upload class="w-3.5 h-3.5" />
                  <span>批量导入语音文件...</span>
                </button>
              </div>
            </div>

            <!-- Voice Items List -->
            <div v-if="(settingStore.settings.touchVoice?.voices.length || 0) > 0" class="space-y-2 max-h-80 overflow-y-auto pr-1">
              <div 
                v-for="voice in settingStore.settings.touchVoice?.voices" 
                :key="voice.id"
                class="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 space-y-2.5 transition-all"
              >
                <div class="flex items-center justify-between gap-2">
                  <!-- Play / Stop Preview Button + Name Input -->
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <button 
                      class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
                      :class="currentPlayingVoiceId === voice.id ? 'bg-purple-500 text-white animate-pulse' : 'bg-purple-950/80 border border-purple-500/40 text-purple-300 hover:bg-purple-900/80'"
                      :title="currentPlayingVoiceId === voice.id ? '停止播放' : '试听语音'"
                      @click="handlePreviewVoice(voice)"
                    >
                      <Pause v-if="currentPlayingVoiceId === voice.id" class="w-3.5 h-3.5" />
                      <Play v-else class="w-3.5 h-3.5 ml-0.5" />
                    </button>

                    <input 
                      v-model="voice.name"
                      type="text"
                      class="flex-1 bg-slate-900 border border-slate-700/80 focus:border-purple-400 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none truncate"
                      placeholder="语音描述/名称"
                      @change="settingStore.save()"
                    />
                  </div>

                  <!-- Trigger Zone Selector -->
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <span class="text-[10px] text-slate-400">触发部位:</span>
                    <select 
                      v-model="voice.triggerZone"
                      class="bg-slate-900 border border-slate-700 text-purple-300 rounded-lg px-2 py-1 text-xs outline-none focus:border-purple-400"
                      @change="settingStore.save()"
                    >
                      <option value="all">✨ 全部区域</option>
                      <option value="head">👑 头部 (摸摸头)</option>
                      <option value="body">💖 身体 (戳戳)</option>
                      <option value="bottom">🐾 底部区域</option>
                    </select>
                  </div>

                  <!-- Delete Button -->
                  <button 
                    class="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors flex-shrink-0"
                    title="删除此语音"
                    @click="handleDeleteVoice(voice.id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Companion Speech Bubble Text Input -->
                <div class="flex items-center gap-2 pl-9">
                  <span class="text-[10px] text-slate-400 flex-shrink-0">💬 伴随台词:</span>
                  <input 
                    v-model="voice.reactionText"
                    type="text"
                    class="flex-1 bg-slate-900/80 border border-slate-800 focus:border-purple-400 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none placeholder:text-slate-600"
                    placeholder="触摸触发时在小窗气泡显示的台词 (如: (*/ω＼*) 摸摸头好舒服~)"
                    @change="settingStore.save()"
                  />
                </div>
              </div>
            </div>

            <!-- Empty State Guide -->
            <div v-else class="p-8 rounded-xl border border-dashed border-purple-500/30 flex flex-col items-center justify-center text-center space-y-3 bg-purple-950/10">
              <div class="w-12 h-12 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
                <Mic class="w-6 h-6" />
              </div>
              <div class="space-y-1">
                <div class="font-medium text-slate-200 text-xs">还没有导入任何自定义触摸语音</div>
                <div class="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                  点击上方「批量导入语音文件」按钮，导入你喜欢的二次元伴侣语音包（如摸头、戳戳、撒娇语音），即可在悬浮小窗触摸立绘时自动播放！
                </div>
              </div>
              <button 
                class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg transition-all"
                @click="voiceAudioInputRef?.click()"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>立即导入你的第一批伴侣语音</span>
              </button>
            </div>
          </div>

          <!-- 4. AstrBot Tab -->
          <div v-if="activeTab === 'astrbot'" class="space-y-4">
            <div class="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-emerald-300">本地 AstrBot 终端生态直连</span>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-mono"
                  :class="settingStore.astrBotStatus.online ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'"
                >
                  {{ settingStore.astrBotStatus.online ? `已连接 (${settingStore.astrBotStatus.latencyMs}ms)` : '未检测到服务' }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                本软件作为纯净的二次元 AI 桌面终端，直接复用你在 AstrBot 后台配置的角色人设、知识库 RAG 与插件工具。
              </p>
            </div>

            <div>
              <label class="block text-slate-300 mb-1 font-medium">Bot 界面显示名称</label>
              <input 
                v-model="settingStore.settings.botDisplayName" 
                type="text" 
                class="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 focus:border-cyan-400 text-slate-100 outline-none"
                placeholder="AstrBot 智能伴侣"
              />
            </div>

            <div>
              <label class="block text-slate-300 mb-1 font-medium">AstrBot 服务地址 (Base URL)</label>
              <div class="flex gap-2">
                <input 
                  v-model="settingStore.settings.astrbot.baseUrl" 
                  type="text" 
                  class="flex-1 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 focus:border-cyan-400 text-slate-100 outline-none font-mono"
                  placeholder="http://127.0.0.1:6185"
                />
                <button 
                  class="px-3 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors"
                  :disabled="isTestingPing"
                  @click="testPing"
                >
                  <RefreshCw class="w-3.5 h-3.5" :class="isTestingPing ? 'animate-spin' : ''" />
                  <span>测速</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-slate-300 mb-1 font-medium">AstrBot 客户端专属 API Key</label>
              <input 
                v-model="settingStore.settings.astrbot.apiKey" 
                type="password" 
                class="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 focus:border-cyan-400 text-slate-100 outline-none font-mono"
                placeholder="已自动配置免密直连凭证"
              />
            </div>

            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 pt-2">
              <div class="flex items-center justify-between">
                <span class="font-medium text-slate-200 text-xs">🧹 AstrBot 后端会话同步与深度清理</span>
                <button 
                  class="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                  :disabled="isCleaningAstrBot"
                  @click="handleCleanAstrBotBackend"
                >
                  <Trash2 class="w-3.5 h-3.5" :class="isCleaningAstrBot ? 'animate-spin' : ''" />
                  <span>{{ isCleaningAstrBot ? '正在清理中...' : cleanAstrBotSuccess ? '✨ 后端清理完毕' : '一键清理 AstrBot 孤儿会话' }}</span>
                </button>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                现在你在本软件中删除任意对话，均会同步在 AstrBot 后端数据库中彻底销毁。点击右侧按钮可立即一键重置并清理 AstrBot 历史上遗留的多余会话记录。
              </p>
            </div>
          </div>

          <!-- 5. DeepSeek Tab -->
          <div v-if="activeTab === 'deepseek'" class="space-y-4">
            <div>
              <label class="block text-slate-300 mb-1 font-medium">DeepSeek API Key</label>
              <div class="relative">
                <input 
                  v-model="settingStore.settings.deepseek.apiKey" 
                  type="password" 
                  class="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 focus:border-cyan-400 text-slate-100 outline-none font-mono"
                  placeholder="sk-..."
                />
                <Key class="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label class="block text-slate-300 mb-1 font-medium">默认模型 (Model)</label>
              <select 
                v-model="settingStore.settings.deepseek.model"
                class="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 focus:border-cyan-400 text-slate-100 outline-none"
              >
                <option value="deepseek-reasoner">deepseek-reasoner (R1 推理深度思考模型)</option>
                <option value="deepseek-chat">deepseek-chat (V3 通用极速模型)</option>
              </select>
            </div>
          </div>

          <!-- 3. Custom Background & Theme Tab -->
          <div v-if="activeTab === 'background'" class="space-y-4">
            <!-- Custom Wallpaper Box -->
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <label class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <ImageIcon class="w-4 h-4 text-cyan-400" />
                  <span>自定义动态背景壁纸 (视频 MP4 / 图片 WebP)</span>
                </label>
                <div class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    v-model="settingStore.settings.background.enabled" 
                    class="accent-cyan-400"
                  />
                  <span class="text-[11px] text-slate-400">启用背景</span>
                </div>
              </div>

              <!-- Upload & Clear Buttons -->
              <div class="flex gap-2">
                <button 
                  class="flex-1 py-2 px-3 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 font-medium flex items-center justify-center gap-1.5 transition-all text-xs"
                  @click="bgFileInputRef?.click()"
                >
                  <Upload class="w-3.5 h-3.5" />
                  <span>{{ settingStore.settings.background.url ? '更换自定义背景视频/图片' : '上传自定义背景视频/图片' }}</span>
                </button>

                <button 
                  v-if="settingStore.settings.background.url"
                  class="px-3 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors"
                  title="清除背景"
                  @click="resetBackground"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Fit Mode Selector (Prevent Cropping) -->
              <div v-if="settingStore.settings.background.enabled && settingStore.settings.background.url" class="space-y-1.5 pt-2 border-t border-slate-800">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-cyan-300">🖼️ 画面裁剪与填充模式 (防裁切设置)</span>
                  <span class="text-[10px] text-slate-400 font-mono">
                    {{ settingStore.settings.background.fit === 'cover' ? '铺满全屏 (可能裁切边缘)' : settingStore.settings.background.fit === 'fill' ? '拉伸填满' : settingStore.settings.background.fit === 'original' ? '1:1 原图' : '完整呈现 (绝不裁切)' }}
                  </span>
                </div>
                <div class="grid grid-cols-4 gap-1.5 text-[10.5px]">
                  <button 
                    class="py-1.5 px-2 rounded-lg border font-medium text-center transition-all"
                    :class="(settingStore.settings.background.fit || 'contain') === 'contain' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
                    @click="settingStore.settings.background.fit = 'contain'; settingStore.save()"
                  >
                    🖼️ 完整呈现 (不裁剪)
                  </button>
                  <button 
                    class="py-1.5 px-2 rounded-lg border font-medium text-center transition-all"
                    :class="settingStore.settings.background.fit === 'cover' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
                    @click="settingStore.settings.background.fit = 'cover'; settingStore.save()"
                  >
                    📐 铺满视口 (裁剪)
                  </button>
                  <button 
                    class="py-1.5 px-2 rounded-lg border font-medium text-center transition-all"
                    :class="settingStore.settings.background.fit === 'fill' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
                    @click="settingStore.settings.background.fit = 'fill'; settingStore.save()"
                  >
                    📏 充满拉伸
                  </button>
                  <button 
                    class="py-1.5 px-2 rounded-lg border font-medium text-center transition-all"
                    :class="settingStore.settings.background.fit === 'original' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
                    @click="settingStore.settings.background.fit = 'original'; settingStore.save()"
                  >
                    🔍 1:1 原图大小
                  </button>
                </div>
              </div>

              <!-- Background Adjustments (Scale, Offset, Opacity, Blur) -->
              <div v-if="settingStore.settings.background.enabled && settingStore.settings.background.url" class="space-y-2.5 pt-2 border-t border-slate-800">
                <div class="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>背景缩放 (Scale)</span>
                      <input 
                        v-model.number="settingStore.settings.background.scale"
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="10.0"
                        class="w-14 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.background.scale" 
                      type="range" 
                      min="0.1" 
                      max="3.0" 
                      step="0.02"
                      class="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1">
                      <span>壁纸不透明度 (Opacity)</span>
                      <span class="font-mono text-cyan-300">{{ Math.round(settingStore.settings.background.opacity * 100) }}%</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.background.opacity" 
                      type="range" 
                      min="0.05" 
                      max="1" 
                      step="0.05"
                      class="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>水平 X 偏移</span>
                      <input 
                        v-model.number="settingStore.settings.background.offsetX"
                        type="number"
                        class="w-14 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.background.offsetX" 
                      type="range" 
                      min="-800" 
                      max="800" 
                      step="5"
                      class="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div class="flex justify-between text-slate-400 mb-1 items-center">
                      <span>垂直 Y 偏移</span>
                      <input 
                        v-model.number="settingStore.settings.background.offsetY"
                        type="number"
                        class="w-14 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center outline-none text-[10px]"
                      />
                    </div>
                    <input 
                      v-model.number="settingStore.settings.background.offsetY" 
                      type="range" 
                      min="-800" 
                      max="800" 
                      step="5"
                      class="w-full accent-cyan-400"
                    />
                  </div>

                  <div class="col-span-2">
                    <div class="flex justify-between text-slate-400 mb-1">
                      <span>壁纸毛玻璃模糊 (Blur: 调至 0px 即彻底清晰)</span>
                      <span class="font-mono text-cyan-300">{{ settingStore.settings.background.blur }}px</span>
                    </div>
                    <input 
                      v-model.number="settingStore.settings.background.blur" 
                      type="range" 
                      min="0" 
                      max="30" 
                      step="1"
                      class="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Transparency & Stage Sync Box -->
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Layers class="w-4 h-4 text-emerald-400" />
                  <span>🏛️ 聊天室主舞台穿透与遮罩透明度联动调节</span>
                </span>
                <button 
                  class="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-400/50 text-emerald-300 text-[10.5px] font-medium transition-all"
                  @click="
                    if (settingStore.settings.chatRoom) {
                      settingStore.settings.chatRoom.stageBgOpacity = 0.0;
                      settingStore.settings.chatRoom.stageBlur = 0;
                      settingStore.settings.chatRoom.sidebarBgOpacity = 0.20;
                      settingStore.settings.background.blur = 0;
                      settingStore.settings.background.opacity = 1.0;
                      settingStore.settings.background.fit = 'contain';
                      settingStore.save();
                    }
                  "
                >
                  ✨ 一键全透纯净壁纸桌搭
                </button>
              </div>

              <div class="grid grid-cols-3 gap-3 text-[11px]">
                <div>
                  <div class="flex justify-between text-slate-400 mb-1">
                    <span>舞台遮罩不透明度</span>
                    <span class="font-mono text-cyan-300">{{ Math.round((settingStore.settings.chatRoom?.stageBgOpacity ?? 0.45) * 100) }}%</span>
                  </div>
                  <input 
                    v-if="settingStore.settings.chatRoom"
                    v-model.number="settingStore.settings.chatRoom.stageBgOpacity"
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    class="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div class="flex justify-between text-slate-400 mb-1">
                    <span>舞台毛玻璃模糊度</span>
                    <span class="font-mono text-cyan-300">{{ settingStore.settings.chatRoom?.stageBlur ?? 12 }}px</span>
                  </div>
                  <input 
                    v-if="settingStore.settings.chatRoom"
                    v-model.number="settingStore.settings.chatRoom.stageBlur"
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    class="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div class="flex justify-between text-slate-400 mb-1">
                    <span>左右边栏遮罩透明度</span>
                    <span class="font-mono text-cyan-300">{{ Math.round((settingStore.settings.chatRoom?.sidebarBgOpacity ?? 0.70) * 100) }}%</span>
                  </div>
                  <input 
                    v-if="settingStore.settings.chatRoom"
                    v-model.number="settingStore.settings.chatRoom.sidebarBgOpacity"
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    class="w-full accent-cyan-400"
                  />
                </div>
              </div>

              <div class="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
                <span class="text-slate-400">需要调整聊天气泡、文字或输入框具体颜色？</span>
                <button 
                  class="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 font-medium"
                  @click="activeTab = 'chatroom'"
                >
                  👉 前往【大窗口聊天室配色与主题】
                </button>
              </div>
            </div>

            <!-- ACG Themed Particles Selector -->
            <div>
              <label class="block text-slate-300 mb-2 font-medium">二次元氛围主题</label>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  class="p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left"
                  :class="settingStore.settings.theme === 'cyan' ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'"
                  @click="changeTheme('cyan')"
                >
                  <span class="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]"></span>
                  <div>
                    <div class="font-medium text-xs">蔚蓝档案 (SCHALE HUD)</div>
                    <div class="text-[10px] text-slate-400">冰蓝科技 · 菱形光环</div>
                  </div>
                </button>

                <button 
                  class="p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left"
                  :class="settingStore.settings.theme === 'pink' ? 'border-pink-400 bg-pink-950/40 text-pink-200' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'"
                  @click="changeTheme('pink')"
                >
                  <span class="w-4 h-4 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]"></span>
                  <div>
                    <div class="font-medium text-xs">樱花物语 (Sakura VN)</div>
                    <div class="text-[10px] text-slate-400">落樱花瓣 · 治愈粉紫</div>
                  </div>
                </button>

                <button 
                  class="p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left"
                  :class="settingStore.settings.theme === 'gold' ? 'border-amber-400 bg-amber-950/40 text-amber-200' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'"
                  @click="changeTheme('gold')"
                >
                  <span class="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
                  <div>
                    <div class="font-medium text-xs">星轨列车 (Astral Express)</div>
                    <div class="text-[10px] text-slate-400">璀璨星尘 · 罗盘黑金</div>
                  </div>
                </button>

                <button 
                  class="p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left"
                  :class="settingStore.settings.theme === 'purple' ? 'border-purple-400 bg-purple-950/40 text-purple-200' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'"
                  @click="changeTheme('purple')"
                >
                  <span class="w-4 h-4 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></span>
                  <div>
                    <div class="font-medium text-xs">赛博雨夜 (Cyber Bar)</div>
                    <div class="text-[10px] text-slate-400">像素雨滴 · 霓虹等宽</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Windows Auto Launch & TTS -->
            <div class="grid grid-cols-2 gap-2">
              <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-slate-300">开机自动启动</span>
                  <input 
                    type="checkbox" 
                    v-model="settingStore.settings.autoLaunch" 
                    class="accent-cyan-400"
                    @change="settingStore.save()"
                  />
                </div>
                <p class="text-[10px] text-slate-400">开机登录自动在托盘启动</p>
              </div>

              <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-slate-300">TTS 语音朗读</span>
                  <input 
                    type="checkbox" 
                    v-model="settingStore.settings.ttsEnabled" 
                    class="accent-cyan-400"
                    @change="settingStore.save()"
                  />
                </div>
                <p class="text-[10px] text-slate-400">回复完毕自动朗读文本</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-5 py-3 border-t border-cyan-500/20 bg-slate-950/80 flex justify-end gap-2">
        <button 
          class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          @click="emit('close')"
        >
          取消
        </button>
        <button 
          class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-medium shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all"
          @click="handleSave"
        >
          保存配置
        </button>
      </div>
    </div>
  </div>
</template>
