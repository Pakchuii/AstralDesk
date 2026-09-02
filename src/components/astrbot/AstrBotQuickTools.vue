<script setup lang="ts">
import { useSettingStore } from '@/stores/settingStore';
import { useChatStore } from '@/stores/chatStore';
import { 
  Globe, 
  Code2, 
  BookOpen, 
  Palette, 
  Volume2, 
  VolumeX, 
  Bot, 
  Sparkles,
  Zap
} from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';
import { ttsService } from '@/services/ttsService';

const emit = defineEmits<{
  (e: 'inject-prompt', prompt: string): void;
}>();

const settingStore = useSettingStore();
const chatStore = useChatStore();

const tools = [
  {
    id: 'search',
    name: '联网搜索',
    desc: 'AstrBot 实时网页检索',
    icon: Globe,
    color: 'text-blue-400',
    prompt: '/web_search 请联网检索以下最新信息：\n',
  },
  {
    id: 'code',
    name: '代码沙箱',
    desc: 'Python 执行与深度审查',
    icon: Code2,
    color: 'text-purple-400',
    prompt: '请在沙箱中分析并优化以下代码：\n\n```python\n\n```',
  },
  {
    id: 'kb',
    name: '知识库 RAG',
    desc: '检索本地文档与记忆',
    icon: BookOpen,
    color: 'text-emerald-400',
    prompt: '请根据知识库内容，详细回答以下问题：\n',
  },
  {
    id: 'draw',
    name: '绘画生成',
    desc: '触发 AstrBot T2I 绘图',
    icon: Palette,
    color: 'text-pink-400',
    prompt: '/draw 一幅高精度的二次元插画，画面描述：',
  },
];

const handleToolClick = (tool: typeof tools[0]) => {
  soundFx.playTypewriterClick();
  emit('inject-prompt', tool.prompt);
};

const toggleTTS = () => {
  settingStore.settings.ttsEnabled = !settingStore.settings.ttsEnabled;
  ttsService.setEnabled(settingStore.settings.ttsEnabled);
  settingStore.save();
  if (settingStore.settings.ttsEnabled) {
    soundFx.playCrystalChime();
    ttsService.speak('语音朗读已开启，星奈会为你念出回复哦！');
  } else {
    soundFx.playTypewriterClick();
  }
};
</script>

<template>
  <div class="space-y-3">
    <!-- Header with TTS Switch -->
    <div class="flex items-center justify-between px-1">
      <span class="text-xs font-semibold text-cyan-300 font-mono flex items-center gap-1.5">
        <Sparkles class="w-3.5 h-3.5" />
        <span>AstrBot 快捷工具</span>
      </span>

      <!-- TTS Voice Toggle -->
      <button 
        class="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] transition-all"
        :class="settingStore.settings.ttsEnabled 
          ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(56,189,248,0.3)]' 
          : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'"
        :title="settingStore.settings.ttsEnabled ? '语音朗读已开启' : '点击开启语音朗读'"
        @click="toggleTTS"
      >
        <Volume2 v-if="settingStore.settings.ttsEnabled" class="w-3 h-3 text-cyan-300" />
        <VolumeX v-else class="w-3 h-3" />
        <span>{{ settingStore.settings.ttsEnabled ? '语音开启' : '语音静音' }}</span>
      </button>
    </div>

    <!-- Quick Tools Grid -->
    <div class="grid grid-cols-2 gap-2">
      <button 
        v-for="t in tools" 
        :key="t.id"
        class="p-2.5 rounded-xl bg-slate-900/70 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 transition-all text-left group flex flex-col justify-between"
        @click="handleToolClick(t)"
      >
        <div class="flex items-center justify-between w-full mb-1">
          <component :is="t.icon" class="w-4 h-4 transition-transform group-hover:scale-110" :class="t.color" />
          <span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">快捷</span>
        </div>
        <div>
          <div class="font-medium text-xs text-slate-200 group-hover:text-cyan-300 transition-colors">{{ t.name }}</div>
          <div class="text-[10px] text-slate-500 truncate">{{ t.desc }}</div>
        </div>
      </button>
    </div>
  </div>
</template>
