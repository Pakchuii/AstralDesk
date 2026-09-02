<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChatMessage } from '@/types';
import CharacterAvatar from '@/components/character/CharacterAvatar.vue';
import ThinkingPulse from './ThinkingPulse.vue';
import MarkdownViewer from './MarkdownViewer.vue';
import { Copy, Check, Bot, User, Sparkles, Trash2 } from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';
import { useSettingStore } from '@/stores/settingStore';
import { cleanAgentTrace } from '@/services/astralBot';

const props = defineProps<{
  message: ChatMessage;
  assistantName?: string;
}>();

const emit = defineEmits<{
  (e: 'bubble-contextmenu', event: MouseEvent, message: ChatMessage): void;
  (e: 'delete', messageId: string): void;
}>();

const settingStore = useSettingStore();
const isCopied = ref(false);

const isAssistant = computed(() => props.message.role === 'assistant');

const displayContent = computed(() => {
  if (!props.message.content) return '';
  if (isAssistant.value) {
    const cleaned = cleanAgentTrace(props.message.content);
    return cleaned || (props.message.isThinking ? '' : '已完成相应操作~');
  }
  return props.message.content;
});

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const copyContent = async () => {
  if (!props.message.content) return;
  try {
    await navigator.clipboard.writeText(props.message.content);
    isCopied.value = true;
    soundFx.playCrystalChime([659.25, 880]);
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};

const hexToRgb = (hex: string) => {
  let c = (hex || '').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length < 6) return '15, 23, 42';
  const num = parseInt(c.slice(0, 6), 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

const bubbleStyle = computed(() => {
  const c = settingStore.settings.chatRoom;
  if (!c) return {};

  if (isAssistant.value) {
    const bgHex = c.assistantBgColor || '#0f172a';
    const bgRgb = hexToRgb(bgHex);
    const opacity = c.assistantBgOpacity ?? 0.85;
    const glowBlur = (c.assistantBorderGlow || 0.4) * 15;

    return {
      backgroundColor: `rgba(${bgRgb}, ${opacity})`,
      color: c.assistantTextColor || '#f8fafc',
      borderColor: c.assistantBorderColor || '#38bdf8',
      borderRadius: `${c.assistantBorderRadius ?? 16}px`,
      backdropFilter: `blur(${c.assistantBlur ?? 12}px)`,
      boxShadow: (c.assistantBorderGlow ?? 0.4) > 0 ? `0 0 ${glowBlur}px ${c.assistantBorderColor || '#38bdf8'}` : '0 4px 20px rgba(0,0,0,0.3)',
      fontSize: c.assistantFontSize ? `${c.assistantFontSize}px` : undefined,
    };
  } else {
    // User message bubble
    return {
      backgroundColor: c.userBgColor || c.accentColor || '#0284c7',
      color: c.userTextColor || '#ffffff',
      borderRadius: `${c.userBorderRadius ?? 16}px`,
      fontSize: c.assistantFontSize ? `${c.assistantFontSize}px` : undefined,
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    };
  }
});
</script>

<template>
  <div 
    class="flex gap-3.5 my-4 group transition-all duration-300"
    :class="isAssistant ? 'items-start flex-row' : 'items-start flex-row-reverse'"
  >
    <!-- Avatar column -->
    <div class="flex-shrink-0 pt-0.5">
      <CharacterAvatar 
        v-if="isAssistant"
        :mood="message.mood || 'normal'"
        size="sm"
        :interactive="true"
      />
      <div 
        v-else 
        class="w-10 h-10 rounded-full overflow-hidden p-0.5 shadow-[0_0_12px_rgba(56,189,248,0.3)] flex items-center justify-center text-white bg-slate-900 border border-cyan-500/40 relative"
      >
        <img 
          v-if="settingStore.settings.userAvatar?.url"
          :src="settingStore.settings.userAvatar.url"
          alt="User Avatar"
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
        <div v-else class="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center">
          <User class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- Message bubble container -->
    <div 
      class="max-w-[85%] md:max-w-[80%] min-w-0 flex flex-col"
      :class="isAssistant ? 'items-start' : 'items-end'"
    >
      <!-- Sender tag & Timestamp -->
      <div class="flex items-center gap-2 mb-1 px-1 text-xs text-slate-400 select-none">
        <span class="font-semibold text-xs flex items-center gap-1">
          <span 
            v-if="isAssistant" 
            class="text-cyan-400 font-mono tracking-wider"
          >
            {{ assistantName || settingStore.settings.botDisplayName || '智能伴侣' }}
          </span>
          <span v-else class="text-slate-300">Commander</span>
        </span>

        <span class="text-[10px] text-slate-500">{{ formatTime(message.timestamp) }}</span>
      </div>

      <!-- Bubble content box with dynamic styling -->
      <div 
        class="p-4 transition-all relative overflow-hidden text-sm border max-w-full break-words select-text cursor-default"
        :class="isAssistant ? 'rounded-tl-sm' : 'rounded-tr-sm'"
        :style="bubbleStyle"
        @contextmenu.stop="emit('bubble-contextmenu', $event, message)"
      >
        <!-- Thinking Chain (Assistant only) -->
        <ThinkingPulse 
          v-if="isAssistant && (message.thinkingContent || message.isThinking)"
          :thinking-content="message.thinkingContent"
          :is-thinking="message.isThinking"
          :thinking-time="message.thinkingTime"
        />

        <!-- Main Content -->
        <div v-if="displayContent" class="max-w-full overflow-hidden">
          <MarkdownViewer :content="displayContent" />
        </div>

        <!-- Typing stream placeholder -->
        <div 
          v-else-if="message.isThinking && !message.content" 
          class="flex items-center gap-2 text-xs text-cyan-300/80 py-1"
        >
          <Sparkles class="w-3.5 h-3.5 animate-spin" />
          <span>✍️ 正在写回复...</span>
        </div>

        <!-- Quick actions hover bar -->
        <div 
          v-if="message.content && !message.error"
          class="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 rounded px-1.5 py-0.5 border border-white/10 select-none text-[11px]"
        >
          <button 
            class="hover:text-cyan-300 text-slate-400 p-1 transition-colors"
            title="复制消息"
            @click.stop="copyContent"
          >
            <Check v-if="isCopied" class="w-3 h-3 text-emerald-400" />
            <Copy v-else class="w-3 h-3" />
          </button>
          <button 
            class="hover:text-rose-400 text-slate-400 p-1 transition-colors"
            title="删除此条消息"
            @click.stop="emit('delete', message.id)"
          >
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
