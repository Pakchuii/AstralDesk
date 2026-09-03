<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useSettingStore } from '@/stores/settingStore';
import CharacterPortrait from '@/components/character/CharacterPortrait.vue';
import SettingsModal from '@/components/settings/SettingsModal.vue';
import PortraitDesignerModal from '@/components/character/PortraitDesignerModal.vue';
import { 
  Maximize2, 
  Send, 
  Settings, 
  Palette, 
  Sparkles, 
  Minus, 
  Bot, 
  Lock, 
  Unlock, 
  Brain, 
  ChevronDown, 
  User, 
  MessageCircle, 
  Zap,
  RotateCcw,
  ShieldAlert
} from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';

const emit = defineEmits<{
  (e: 'switch-to-workspace'): void;
}>();

const chatStore = useChatStore();
const settingStore = useSettingStore();

const isInputOpen = ref(false);
const showMiniSettings = ref(false);
const showMiniPortraitStudio = ref(false);
const showContextMenu = ref(false);
const isThinkingCollapsed = ref(true);
const contextMenuPos = ref({ x: 0, y: 0 });
const miniInput = ref('');

// Real-time Thinking Timer
const thinkingTimerSeconds = ref(0);
let thinkingInterval: any = null;

watch(() => chatStore.isGenerating, (generating) => {
  if (generating) {
    thinkingTimerSeconds.value = 0;
    if (thinkingInterval) clearInterval(thinkingInterval);
    thinkingInterval = setInterval(() => {
      thinkingTimerSeconds.value += 1;
    }, 1000);
  } else {
    if (thinkingInterval) {
      clearInterval(thinkingInterval);
      thinkingInterval = null;
    }
  }
});

import { cleanAgentTrace } from '@/services/astralBot';

const messageScrollContainerRef = ref<HTMLElement | null>(null);

// Latest messages for chat-like visual feedback
const currentSessionMessages = computed(() => {
  return chatStore.currentSession?.messages || [];
});

const latestAssistantMessage = computed(() => {
  const msgs = [...currentSessionMessages.value].reverse();
  return msgs.find(m => m.role === 'assistant');
});

const latestUserMessage = computed(() => {
  const msgs = [...currentSessionMessages.value].reverse();
  return msgs.find(m => m.role === 'user');
});

const cleanedMiniContent = computed(() => {
  const content = latestAssistantMessage.value?.content;
  if (!content) return '';
  return cleanAgentTrace(content);
});

watch(() => latestAssistantMessage.value?.content, async () => {
  if (chatStore.isGenerating) {
    await nextTick();
    if (messageScrollContainerRef.value) {
      messageScrollContainerRef.value.scrollTop = messageScrollContainerRef.value.scrollHeight;
    }
  }
});

const activeEngineDisplayName = computed(() => {
  if (settingStore.settings.engine === 'astrbot') {
    return 'AstrBot AI';
  } else if (settingStore.settings.engine === 'deepseek') {
    return 'DeepSeek R1';
  }
  return 'AI 伴侣';
});

const dialogueBoxStyleComputed = computed(() => {
  const s = settingStore.settings.dialogueBox || {
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

  const hexToRgb = (hex: string) => {
    const clean = (hex || '#0f172a').replace('#', '');
    const bigint = parseInt(clean, 16);
    if (clean.length === 3) {
      const r = (bigint >> 8) & 15;
      const g = (bigint >> 4) & 15;
      const b = bigint & 15;
      return `${r * 17}, ${g * 17}, ${b * 17}`;
    }
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r || 15}, ${g || 23}, ${b || 42}`;
  };

  const bgRgb = hexToRgb(s.bgColor || '#0f172a');
  const glowBlur = (s.borderGlow || 0.4) * 20;

  return {
    background: `rgba(${bgRgb}, ${s.bgOpacity ?? 0.85})`,
    color: s.textColor || '#f8fafc',
    borderColor: s.borderColor || '#38bdf8',
    borderRadius: `${s.borderRadius ?? 16}px`,
    backdropFilter: `blur(${s.blur ?? 12}px)`,
    boxShadow: (s.borderGlow ?? 0.4) > 0 ? `0 0 ${glowBlur}px ${s.borderColor || '#38bdf8'}` : '0 4px 20px rgba(0,0,0,0.5)',
    width: s.width ? `${s.width}px` : '100%',
    maxWidth: '100%',
    minHeight: s.minHeight ? `${Math.min(s.minHeight, 140)}px` : 'auto',
    maxHeight: '190px',
    display: 'flex',
    flexDirection: 'column',
    transform: s.offsetY ? `translateY(${s.offsetY}px)` : 'none',
    thinkingBackground: s.thinkingBgColor || '#1e1b4b',
    thinkingBorderColor: s.thinkingBorderColor || '#a855f7',
    thinkingTextColor: s.thinkingTextColor || '#e9d5ff',
    accentColor: s.accentColor || '#38bdf8',
  };
});

// Intelligent Click-through for Transparent Areas (RAF Throttled to 0% idle CPU)
let isMouseIgnored = false;
let rafPassThroughPending = false;
let lastClientX = 0;
let lastClientY = 0;

const processPassThrough = () => {
  rafPassThroughPending = false;
  if (showContextMenu.value || showMiniSettings.value || showMiniPortraitStudio.value || isDraggingWindow) {
    if (isMouseIgnored) {
      isMouseIgnored = false;
      window.electronAPI?.setIgnoreMouseEvents?.(false);
    }
    return;
  }

  const target = document.elementFromPoint(lastClientX, lastClientY) as HTMLElement | null;
  const isInteractive = !!(target && (
    target.closest('.interactive-zone') || 
    target.closest('button') || 
    target.closest('input') || 
    target.closest('textarea') ||
    target.closest('.resize-handle') ||
    target.closest('.modal-content')
  ));

  if (isInteractive) {
    if (isMouseIgnored) {
      isMouseIgnored = false;
      window.electronAPI?.setIgnoreMouseEvents?.(false);
    }
  } else {
    if (!isMouseIgnored) {
      isMouseIgnored = true;
      window.electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
    }
  }
};

const handleMouseMovePassThrough = (e: MouseEvent) => {
  if (isMouseThroughState.value) return;
  lastClientX = e.clientX;
  lastClientY = e.clientY;
  if (!rafPassThroughPending) {
    rafPassThroughPending = true;
    requestAnimationFrame(processPassThrough);
  }
};

// Smooth direct window dragging
let isDraggingWindow = false;
let windowDragStart = { x: 0, y: 0 };

const onWindowMouseDown = (e: MouseEvent) => {
  if (settingStore.settings.isWindowLocked) return;
  const target = e.target as HTMLElement;
  if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.resize-handle')) return;

  isDraggingWindow = true;
  windowDragStart = { x: e.screenX, y: e.screenY };

  const onMouseMove = (ev: MouseEvent) => {
    if (!isDraggingWindow || settingStore.settings.isWindowLocked) return;
    const dx = ev.screenX - windowDragStart.x;
    const dy = ev.screenY - windowDragStart.y;
    if (dx !== 0 || dy !== 0) {
      windowDragStart = { x: ev.screenX, y: ev.screenY };
      if (window.electronAPI?.moveWindowBy) {
        window.electronAPI.moveWindowBy(dx, dy);
      }
    }
  };

  const onMouseUp = () => {
    isDraggingWindow = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

// Interactive Corner Resize for Dialogue Box (Width & Height)
const onDialogueResizeMouseDown = (e: MouseEvent) => {
  if (settingStore.settings.isWindowLocked) return;
  e.stopPropagation();
  e.preventDefault();

  const startX = e.clientX;
  const startY = e.clientY;
  const initialWidth = settingStore.settings.dialogueBox?.width || 320;
  const initialMinHeight = settingStore.settings.dialogueBox?.minHeight || 70;

  const onMouseMove = (ev: MouseEvent) => {
    if (settingStore.settings.isWindowLocked) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const newW = Math.max(200, Math.min(550, initialWidth + dx));
    const newH = Math.max(50, Math.min(220, initialMinHeight + dy));
    settingStore.settings.dialogueBox.width = Math.round(newW);
    settingStore.settings.dialogueBox.minHeight = Math.round(newH);
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    settingStore.save();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

// Interactive Corner Resize for Whole Mini Window (Bottom-Right corner)
const onWindowResizeMouseDown = (e: MouseEvent) => {
  if (settingStore.settings.isWindowLocked) return;
  e.stopPropagation();
  e.preventDefault();

  let startScreenX = e.screenX;
  let startScreenY = e.screenY;

  const onMouseMove = (ev: MouseEvent) => {
    if (settingStore.settings.isWindowLocked) return;
    const dx = ev.screenX - startScreenX;
    const dy = ev.screenY - startScreenY;
    if (dx !== 0 || dy !== 0) {
      startScreenX = ev.screenX;
      startScreenY = ev.screenY;
      if (window.electronAPI?.resizeWindowBy) {
        window.electronAPI.resizeWindowBy(dx, dy);
      }
    }
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const toggleInput = (e: MouseEvent) => {
  e.stopPropagation();
  isInputOpen.value = !isInputOpen.value;
  soundFx.playTypewriterClick();
};

const handleMiniSend = async () => {
  const text = miniInput.value.trim();
  if (!text || chatStore.isGenerating) return;
  miniInput.value = '';
  isInputOpen.value = false;
  await chatStore.sendMessage(text);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleMiniSend();
  }
};

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  contextMenuPos.value = { x: Math.min(e.clientX, 200), y: Math.min(e.clientY, 400) };
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
};

const toggleWindowLock = () => {
  settingStore.settings.isWindowLocked = !settingStore.settings.isWindowLocked;
  settingStore.save();
  showContextMenu.value = false;
  soundFx.playTypewriterClick();
};

const minimizeToTray = () => {
  showContextMenu.value = false;
  if (window.electronAPI?.minimizeWindow) {
    window.electronAPI.minimizeWindow();
  }
};

const isMouseThroughState = ref(false);

const enableMouseThrough = () => {
  showContextMenu.value = false;
  soundFx.playCrystalChime([659.25, 880]);
  window.electronAPI?.setMouseThrough?.(true);
};

onMounted(async () => {
  window.addEventListener('mousemove', handleMouseMovePassThrough);
  if (window.electronAPI?.getMouseThrough) {
    isMouseThroughState.value = await window.electronAPI.getMouseThrough();
  }
  window.electronAPI?.onMouseThroughChange?.((enabled: boolean) => {
    isMouseThroughState.value = enabled;
  });
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMovePassThrough);
  window.electronAPI?.setIgnoreMouseEvents?.(false);
  if (thinkingInterval) clearInterval(thinkingInterval);
});
</script>

<template>
  <div 
    class="relative w-full h-full select-none bg-transparent overflow-hidden"
    :class="settingStore.settings.isWindowLocked ? 'cursor-default' : 'cursor-move'"
    @mousedown="onWindowMouseDown"
    @contextmenu="handleContextMenu"
    @click="closeContextMenu"
  >
    <!-- Base Layer: Solid Full-Framing Character Portrait (Anchored to bottom of Window, 100% immune to bubble resizing) -->
    <div 
      class="absolute inset-0 flex items-end justify-center bg-transparent overflow-visible pointer-events-none z-10"
    >
      <CharacterPortrait 
        :config="settingStore.settings.portrait"
        :mood="chatStore.currentMood"
        :is-generating="chatStore.isGenerating"
        :interactive="true"
        compact
        @poke="handlePoke"
      />
    </div>

    <!-- Overlay Layer: Floating Top Dialogue Bubble (Capped height, internally scrollable) -->
    <div class="relative z-30 w-full pt-2 px-2 flex flex-col items-center pointer-events-none">
      <div 
        class="interactive-zone p-3 border transition-all duration-200 relative group cursor-pointer shadow-xl pointer-events-auto"
        :style="dialogueBoxStyleComputed"
        @click.stop="toggleInput"
      >
        <!-- Top Row in Dialogue Bubble: Bot Custom Avatar + Bot Name + Fast Controls on Hover -->
        <div class="flex items-center justify-between opacity-90 mb-1.5 pointer-events-none">
          <div class="flex items-center gap-1.5">
            <!-- Custom Bot Avatar (Cropped circle) -->
            <div 
              class="w-5 h-5 rounded-full overflow-hidden border shadow-[0_0_6px_rgba(56,189,248,0.5)] relative flex-shrink-0 flex items-center justify-center bg-slate-950"
              :style="{ borderColor: dialogueBoxStyleComputed.borderColor }"
            >
              <img 
                v-if="settingStore.settings.botAvatar?.url"
                :src="settingStore.settings.botAvatar.url"
                alt="Bot Avatar"
                class="absolute pointer-events-none select-none"
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
              <Bot v-else class="w-3 h-3 text-cyan-400" />
            </div>

            <span class="font-bold text-xs tracking-wide">{{ settingStore.settings.botDisplayName }}</span>
          </div>

          <!-- Hover Fast Action Icons -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-auto">
            <button 
              class="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-colors"
              title="打开立绘工坊"
              @click.stop="showMiniPortraitStudio = true"
            >
              <Palette class="w-3.5 h-3.5" />
            </button>
            <button 
              class="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-colors"
              title="设置"
              @click.stop="showMiniSettings = true"
            >
              <Settings class="w-3.5 h-3.5" />
            </button>
            <button 
              class="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-colors"
              title="展开主工作台"
              @click.stop="emit('switch-to-workspace')"
            >
              <Maximize2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- 1. Dedicated Collapsible Thinking Card (When thinking) -->
        <div 
          v-if="chatStore.isGenerating && (latestAssistantMessage?.isThinking || latestAssistantMessage?.thinkingContent)"
          class="rounded-xl p-2.5 my-1.5 border transition-all text-xs select-text space-y-1.5 shadow-inner"
          :style="{
            backgroundColor: dialogueBoxStyleComputed.thinkingBackground,
            borderColor: dialogueBoxStyleComputed.thinkingBorderColor,
            color: dialogueBoxStyleComputed.thinkingTextColor
          }"
          @click.stop="isThinkingCollapsed = !isThinkingCollapsed"
        >
          <div class="flex items-center justify-between font-semibold">
            <div class="flex items-center gap-1.5">
              <div class="relative flex items-center justify-center">
                <Brain class="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping"></span>
              </div>
              <span class="text-[11px] font-bold">💭 正在认真思考中...</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 font-mono text-purple-300">
                {{ thinkingTimerSeconds }}s
              </span>
              <ChevronDown 
                class="w-3 h-3 transition-transform text-purple-300" 
                :class="isThinkingCollapsed ? '-rotate-90' : 'rotate-0'" 
              />
            </div>
          </div>

          <!-- Collapsible Reasoning Stream -->
          <div 
            v-show="!isThinkingCollapsed" 
            class="text-[10.5px] leading-relaxed max-h-32 overflow-y-auto pr-1 opacity-90 font-mono select-text whitespace-pre-wrap pt-1 border-t border-purple-500/20"
          >
            <div v-if="latestAssistantMessage?.thinkingContent">
              {{ latestAssistantMessage.thinkingContent }}
              <span class="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-0.5 align-middle"></span>
            </div>
            <div v-else class="flex items-center gap-1.5 text-purple-300/80 animate-pulse py-0.5">
              <Sparkles class="w-3 h-3 text-purple-400" />
              <span>正在悄悄想该怎么回复你...</span>
            </div>
          </div>
        </div>

        <!-- 2. Dialogue Message Content / Streaming Output (Clamped Height & Scrollable) -->
        <div 
          ref="messageScrollContainerRef"
          class="leading-relaxed select-text min-h-[24px] max-h-[110px] overflow-y-auto pr-1 select-text custom-scrollbar whitespace-pre-wrap break-words"
          :style="{ 
            fontSize: `${settingStore.settings.dialogueBox?.fontSize || 14}px`,
            lineHeight: '1.6',
            fontFamily: 'var(--app-font-family, inherit)'
          }"
        >
          <!-- Streaming Live Content -->
          <div v-if="chatStore.isGenerating">
            <span v-if="cleanedMiniContent">
              {{ cleanedMiniContent }}
              <span class="inline-block w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-middle"></span>
            </span>
            <!-- Waiting for first chunk: Typing Indicator (正在输入中...) -->
            <div v-else-if="!latestAssistantMessage?.thinkingContent" class="flex items-center gap-2 text-cyan-300 text-xs py-1 animate-pulse">
              <div class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style="animation-delay: 300ms"></span>
              </div>
              <span class="font-medium text-[11px]">✍️ 正在输入中...</span>
            </div>
            <div v-else class="flex items-center gap-1.5 text-cyan-400 text-xs py-0.5">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span class="text-[11px]">✍️ 正在执行并写回复...</span>
            </div>
          </div>

          <!-- Static Completed Message -->
          <div v-else>
            {{ cleanedMiniContent || '随时在桌面上呼唤我，按 Enter 就能聊天啦~' }}
          </div>
        </div>

        <!-- Quick Prompt Footer Hint -->
        <div 
          v-if="settingStore.settings.dialogueBox?.showQuickPromptHint !== false"
          class="mt-1.5 flex items-center justify-between text-[10px] opacity-70"
        >
          <span class="flex items-center gap-1">
            <Sparkles class="w-2.5 h-2.5" />
            <span>点击聊天 · 右键更多</span>
          </span>
          <span>{{ chatStore.currentMood }}</span>
        </div>

        <!-- Bubble Bottom Triangular Tail -->
        <div 
          class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 border-b border-r transform rotate-45 pointer-events-none"
          :style="{
            backgroundColor: dialogueBoxStyleComputed.background,
            borderColor: dialogueBoxStyleComputed.borderColor
          }"
        ></div>

        <!-- Interactive Corner Resize Grip for Dialogue Box (Hidden when locked) -->
        <div 
          v-if="!settingStore.settings.isWindowLocked"
          class="resize-handle absolute bottom-0.5 right-0.5 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity z-20"
          title="按住拖拽角落调整聊天框的长宽大小"
          @mousedown="onDialogueResizeMouseDown"
        >
          <div class="w-2 h-2 border-b-2 border-r-2" :style="{ borderColor: dialogueBoxStyleComputed.borderColor }"></div>
        </div>

        <!-- Floating Non-displacing Input Bar (Anchored smoothly right below dialogue bubble) -->
        <div 
          v-if="isInputOpen"
          class="interactive-zone absolute top-[calc(100%+8px)] left-0 right-0 p-1.5 rounded-xl bg-slate-950/95 border flex items-center gap-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-40 backdrop-blur-md pointer-events-auto"
          :style="{ borderColor: dialogueBoxStyleComputed.borderColor }"
          @click.stop
        >
          <input 
            v-model="miniInput"
            type="text"
            class="flex-1 bg-transparent px-2 py-1 text-xs text-white outline-none placeholder:text-slate-500"
            placeholder="想对我说点什么... (按 Enter 发送)"
            autofocus
            @keydown="handleKeyDown"
          />
          <button 
            class="p-1.5 rounded-lg text-white transition-opacity hover:opacity-90 flex items-center justify-center"
            :style="{ backgroundColor: dialogueBoxStyleComputed.accentColor }"
            @click="handleMiniSend"
          >
            <Send class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Interactive Window Corner Resize Grip (Bottom-Right of Window, Hidden when locked) -->
    <div 
      v-if="!settingStore.settings.isWindowLocked"
      class="interactive-zone resize-handle fixed bottom-0.5 right-0.5 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity z-50 pointer-events-auto"
      title="按住拖动右下角自由放大/缩小桌面小窗"
      @mousedown="onWindowResizeMouseDown"
    >
      <div class="w-2.5 h-2.5 border-b-2 border-r-2" :style="{ borderColor: dialogueBoxStyleComputed.borderColor }"></div>
    </div>

    <!-- Right-Click Context Menu -->
    <div 
      v-if="showContextMenu"
      class="interactive-zone context-menu-zone fixed z-50 py-1.5 px-1 rounded-xl bg-slate-950/95 backdrop-blur-md border shadow-[0_0_20px_rgba(0,0,0,0.8)] text-xs text-slate-200 w-40 space-y-0.5 pointer-events-auto"
      :style="{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px`, borderColor: dialogueBoxStyleComputed.borderColor }"
      @click.stop
    >
      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        @click="showContextMenu = false; emit('switch-to-workspace')"
      >
        <Maximize2 class="w-3.5 h-3.5 text-cyan-400" />
        <span>展开主窗口</span>
      </button>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        @click="toggleWindowLock"
      >
        <Lock v-if="!settingStore.settings.isWindowLocked" class="w-3.5 h-3.5 text-amber-400" />
        <Unlock v-else class="w-3.5 h-3.5 text-emerald-400" />
        <span>{{ settingStore.settings.isWindowLocked ? '🔓 解锁位置与大小' : '🔒 锁定位置与大小' }}</span>
      </button>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        @click="showContextMenu = false; showMiniPortraitStudio = true"
      >
        <Palette class="w-3.5 h-3.5 text-pink-400" />
        <span>打开立绘工坊</span>
      </button>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        @click="showContextMenu = false; showMiniSettings = true"
      >
        <Settings class="w-3.5 h-3.5 text-amber-400" />
        <span>系统与外观设置</span>
      </button>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        title="恢复气泡默认紧凑宽高与位置"
        @click="showContextMenu = false; settingStore.resetDialogueBoxToDefault()"
      >
        <RotateCcw class="w-3.5 h-3.5 text-cyan-400" />
        <span>🔄 重置气泡尺寸位置</span>
      </button>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        title="开启后鼠标将完全穿透小窗和立绘，打游戏绝不误触；可随时在右下角任务栏托盘右键或按 Ctrl+Alt+M 退出穿透"
        @click="enableMouseThrough"
      >
        <ShieldAlert class="w-3.5 h-3.5 text-cyan-400" />
        <span>🎯 开启鼠标穿透 (游戏模式)</span>
      </button>

      <div class="border-t border-slate-800 my-1"></div>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-300 transition-colors text-left"
        @click="minimizeToTray"
      >
        <Minus class="w-3.5 h-3.5 text-rose-400" />
        <span>最小化至托盘</span>
      </button>
    </div>

    <!-- Modals in Mini Mode -->
    <div class="interactive-zone pointer-events-auto">
      <SettingsModal 
        v-if="showMiniSettings"
        @close="showMiniSettings = false"
        @open-studio="showMiniSettings = false; showMiniPortraitStudio = true"
      />

      <PortraitDesignerModal 
        v-if="showMiniPortraitStudio"
        @close="showMiniPortraitStudio = false"
      />
    </div>
  </div>
</template>
