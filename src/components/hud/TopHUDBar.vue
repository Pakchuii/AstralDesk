<script setup lang="ts">
import { computed } from 'vue';
import { useSettingStore } from '@/stores/settingStore';
import { useChatStore } from '@/stores/chatStore';
import { 
  Bot, 
  Zap, 
  Volume2, 
  VolumeX, 
  Settings, 
  Minus, 
  Square, 
  X, 
  Sparkles, 
  RefreshCw,
  Layers,
  Palette,
  Minimize2
} from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';
import { ThemeType } from '@/types';

const props = defineProps<{
  showWindowControls?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-settings'): void;
  (e: 'open-portrait-studio'): void;
  (e: 'toggle-mode'): void;
}>();

const settingStore = useSettingStore();
const chatStore = useChatStore();

const isAstrBot = computed(() => settingStore.settings.engine === 'astrbot');
const isDeepSeek = computed(() => settingStore.settings.engine === 'deepseek');

const toggleEngine = (engine: 'astrbot' | 'deepseek') => {
  settingStore.setEngine(engine);
  soundFx.playTypewriterClick();
};

const toggleSound = () => {
  settingStore.setSound(!settingStore.settings.soundEnabled);
  if (settingStore.settings.soundEnabled) {
    soundFx.playCrystalChime([880]);
  }
};

const retryAstrBot = async () => {
  soundFx.playTypewriterClick();
  await settingStore.checkAstrBotHealth();
  if (settingStore.astrBotStatus.online) {
    soundFx.playCrystalChime();
  }
};

const cycleTheme = () => {
  const themes: ThemeType[] = ['cyan', 'pink', 'gold', 'purple'];
  const curIdx = themes.indexOf(settingStore.settings.theme);
  const nextTheme = themes[(curIdx + 1) % themes.length];
  settingStore.setTheme(nextTheme);
  soundFx.playCrystalChime();
};

const hexToRgb = (hex: string) => {
  let c = (hex || '').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length < 6) return '2, 6, 23';
  const num = parseInt(c.slice(0, 6), 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

const topBarStyle = computed(() => {
  const c = settingStore.settings.chatRoom;
  const bgRgb = hexToRgb(c?.topBarBgColor || '#020617');
  const opacity = c?.topBarBgOpacity ?? 0.80;
  const blur = c?.stageBlur ?? 12;
  return {
    backgroundColor: opacity > 0 ? `rgba(${bgRgb}, ${opacity})` : 'transparent',
    borderColor: `${c?.borderColor || '#0284c7'}30`,
    backdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
  };
});

// Window control helpers (when running inside Electron)
const minimizeWindow = () => {
  window.electronAPI?.minimize();
};

const maximizeWindow = () => {
  window.electronAPI?.maximize();
};

const closeWindow = () => {
  window.electronAPI?.close();
};
</script>

<template>
  <header 
    class="h-12 border-b flex items-center justify-between px-3 select-none z-30 [app-region:drag] transition-all"
    :style="topBarStyle"
  >
    <!-- Left: Brand & Status -->
    <div class="flex items-center gap-3 [app-region:no-drag]">
      <!-- Brand Logo -->
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.5)]">
          <Sparkles class="w-3.5 h-3.5 text-white" />
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold tracking-wider text-cyan-300 flex items-center gap-1 font-mono">
            ASTRAL DESK
            <span class="text-[9px] px-1 py-0.2 rounded bg-cyan-900/60 text-cyan-400 border border-cyan-500/30">伴侣</span>
          </span>
        </div>
      </div>

      <!-- Live Health Indicator -->
      <div 
        class="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono cursor-pointer transition-colors"
        :class="settingStore.astrBotStatus.online 
          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40' 
          : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-800'"
        title="点击检测伴侣连接状态"
        @click="retryAstrBot"
      >
        <span 
          class="w-2 h-2 rounded-full"
          :class="settingStore.astrBotStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'"
        ></span>
        <span class="text-[10px]">
          {{ settingStore.astrBotStatus.online ? `已连接 (${settingStore.astrBotStatus.latencyMs}ms)` : '离线模式' }}
        </span>
        <RefreshCw 
          class="w-3 h-3 text-slate-400"
          :class="settingStore.isCheckingAstrBot ? 'animate-spin' : ''"
        />
      </div>
    </div>

    <!-- Center: Engine Switcher Tabs -->
    <div class="flex items-center gap-1 p-0.5 rounded-xl bg-slate-900/90 border border-cyan-500/20 [app-region:no-drag]">
      <button 
        class="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
        :class="isAstrBot 
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]' 
          : 'text-slate-400 hover:text-slate-200'"
        @click="toggleEngine('astrbot')"
      >
        <Bot class="w-3.5 h-3.5 text-cyan-400" />
        <span>日常伴侣模式</span>
      </button>

      <button 
        class="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
        :class="isDeepSeek 
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]' 
          : 'text-slate-400 hover:text-slate-200'"
        @click="toggleEngine('deepseek')"
      >
        <Zap class="w-3.5 h-3.5 text-amber-400" />
        <span>深度畅聊模式</span>
      </button>
    </div>

    <!-- Right: Tools, Mini Switcher & Window Actions -->
    <div class="flex items-center gap-1.5 [app-region:no-drag]">
      <!-- Prominent Switch to Mini Window Button -->
      <button 
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-300 text-xs font-medium shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all"
        title="缩小为桌面透明立牌小窗口"
        @click="emit('toggle-mode')"
      >
        <Minimize2 class="w-3.5 h-3.5" />
        <span class="hidden md:inline">缩小为小窗</span>
      </button>

      <!-- Quick Theme Cycle Button -->
      <button 
        class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
        title="一键切换二次元主题皮肤 (冰蓝 / 樱花 / 星轨 / 赛博)"
        @click="cycleTheme"
      >
        <Palette class="w-4 h-4" />
      </button>

      <!-- Sound Toggle -->
      <button 
        class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
        :title="settingStore.settings.soundEnabled ? '音效开启' : '音效静音'"
        @click="toggleSound"
      >
        <Volume2 v-if="settingStore.settings.soundEnabled" class="w-4 h-4 text-cyan-400" />
        <VolumeX v-else class="w-4 h-4 text-slate-500" />
      </button>

      <!-- Settings Modal Trigger -->
      <button 
        class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
        title="设置与立绘设计"
        @click="emit('open-settings')"
      >
        <Settings class="w-4 h-4" />
      </button>

      <!-- Electron Window Controls -->
      <div v-if="showWindowControls" class="flex items-center ml-1 pl-1.5 border-l border-slate-700/50">
        <button 
          class="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
          @click="minimizeWindow"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <button 
          class="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
          @click="maximizeWindow"
        >
          <Square class="w-3 h-3" />
        </button>
        <button 
          class="p-1.5 hover:bg-rose-600/80 text-slate-400 hover:text-white rounded transition-colors"
          @click="closeWindow"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </header>
</template>
