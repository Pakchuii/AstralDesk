<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Brain, ChevronDown, ChevronRight, Copy, Check, Sparkles } from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';
import { useSettingStore } from '@/stores/settingStore';

const props = withDefaults(defineProps<{
  thinkingContent?: string;
  isThinking?: boolean;
  thinkingTime?: number;
}>(), {
  thinkingContent: '',
  isThinking: false,
  thinkingTime: 0,
});

const settingStore = useSettingStore();
const isCollapsed = ref(false);
const isCopied = ref(false);
const liveSeconds = ref(0);
let timer: number | null = null;

const displayTime = computed(() => {
  if (props.thinkingTime && props.thinkingTime > 0) {
    return props.thinkingTime;
  }
  return liveSeconds.value;
});

const thinkingBoxStyle = computed(() => {
  const c = settingStore.settings.chatRoom;
  if (!c) return {};
  return {
    backgroundColor: c.thinkingBgColor ? `${c.thinkingBgColor}` : undefined,
    borderColor: c.thinkingBorderColor ? `${c.thinkingBorderColor}` : undefined,
    color: c.thinkingTextColor ? `${c.thinkingTextColor}` : undefined,
  };
});

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  soundFx.playTypewriterClick();
};

const copyThinking = async () => {
  if (!props.thinkingContent) return;
  try {
    await navigator.clipboard.writeText(props.thinkingContent);
    isCopied.value = true;
    soundFx.playCrystalChime([659.25, 880]);
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy thinking content', err);
  }
};

watch(() => props.isThinking, (val) => {
  if (!val && timer) {
    clearInterval(timer);
    timer = null;
  }
});

onMounted(() => {
  if (props.isThinking) {
    const start = performance.now();
    timer = window.setInterval(() => {
      liveSeconds.value = Math.max(1, Math.round((performance.now() - start) / 1000));
    }, 1000);
  }
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<template>
  <div 
    v-if="thinkingContent || isThinking" 
    class="mb-3 rounded-xl border backdrop-blur-md overflow-hidden transition-all duration-300 shadow-inner"
    :style="thinkingBoxStyle"
  >
    <!-- Header Summary Bar -->
    <div 
      class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-900/20 transition-colors select-none text-xs text-purple-200/80"
      @click="toggleCollapse"
    >
      <div class="flex items-center gap-2">
        <!-- Pulsing Brain / Halo Icon -->
        <div class="relative flex items-center justify-center">
          <Brain 
            class="w-4 h-4 text-purple-400"
            :class="isThinking ? 'animate-pulse text-purple-300' : ''"
          />
          <span 
            v-if="isThinking" 
            class="absolute -top-1 -right-1 flex h-2 w-2"
          >
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
        </div>

        <span class="font-medium tracking-wide">
          {{ isThinking ? '💭 正在认真思考中...' : '💭 思考完毕' }}
        </span>

        <span class="px-1.5 py-0.5 rounded bg-purple-900/40 text-[10px] text-purple-300 font-mono border border-purple-500/20">
          {{ displayTime }}s
        </span>
      </div>

      <div class="flex items-center gap-1.5" @click.stop>
        <button 
          v-if="thinkingContent && !isThinking"
          class="p-1 rounded hover:bg-purple-800/40 text-purple-300/70 hover:text-purple-200 transition-colors"
          title="复制思绪"
          @click="copyThinking"
        >
          <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
          <Copy v-else class="w-3.5 h-3.5" />
        </button>

        <button 
          class="p-1 text-purple-300/70 hover:text-purple-200"
          @click="toggleCollapse"
        >
          <ChevronDown v-if="!isCollapsed" class="w-3.5 h-3.5" />
          <ChevronRight v-else class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Thinking Content Body -->
    <div 
      v-if="!isCollapsed" 
      class="px-3.5 py-2.5 text-xs text-purple-200/70 border-t border-purple-500/15 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto"
    >
      <div v-if="thinkingContent">{{ thinkingContent }}</div>
      <div v-else-if="isThinking" class="flex items-center gap-2 text-purple-300/60 italic">
        <Sparkles class="w-3.5 h-3.5 animate-spin" />
        正在悄悄想该怎么回复你...
      </div>
    </div>
  </div>
</template>
