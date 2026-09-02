<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useSettingStore } from '@/stores/settingStore';
import TopHUDBar from '@/components/hud/TopHUDBar.vue';
import ParticleBackground from '@/components/hud/ParticleBackground.vue';
import CharacterAvatar from '@/components/character/CharacterAvatar.vue';
import CharacterPortrait from '@/components/character/CharacterPortrait.vue';
import ChatBubble from '@/components/chat/ChatBubble.vue';
import SettingsModal from '@/components/settings/SettingsModal.vue';
import PortraitDesignerModal from '@/components/character/PortraitDesignerModal.vue';
import AstrBotQuickTools from '@/components/astrbot/AstrBotQuickTools.vue';
import { 
  Plus, 
  Trash2, 
  Send, 
  Square, 
  MessageSquare, 
  Sparkles, 
  Search, 
  Code, 
  Languages, 
  Heart,
  ChevronRight,
  Sliders,
  Bot,
  Palette,
  Minimize2,
  Eraser,
  Copy,
  RotateCcw,
  Settings
} from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';

const props = defineProps<{
  isElectron?: boolean;
}>();

const emit = defineEmits<{
  (e: 'switch-to-mini'): void;
}>();

const chatStore = useChatStore();
const settingStore = useSettingStore();

const userInput = ref('');
const showSettings = ref(false);
const showPortraitStudio = ref(false);
const chatContainerRef = ref<HTMLElement | null>(null);

const activeSession = computed(() => chatStore.currentSession);
const activePersona = computed(() => chatStore.activePersona);

const hexToRgb = (hex: string) => {
  let c = (hex || '').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length < 6) return '2, 6, 23';
  const num = parseInt(c.slice(0, 6), 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

const chatRoomConfig = computed(() => settingStore.settings.chatRoom);

const sidebarStyle = computed(() => {
  const c = chatRoomConfig.value;
  if (!c) return {};
  const bgRgb = hexToRgb(c.sidebarBgColor || '#020617');
  const opacity = c.sidebarBgOpacity ?? 0.70;
  const blur = c.stageBlur ?? 0;
  return {
    backgroundColor: opacity > 0 ? `rgba(${bgRgb}, ${opacity})` : 'transparent',
    borderColor: `${c.borderColor || '#0284c7'}40`,
    backdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
  };
});

const chatStageStyle = computed(() => {
  const c = chatRoomConfig.value;
  if (!c) return {};
  const bgRgb = hexToRgb(c.stageBgColor || '#020617');
  const opacity = c.stageBgOpacity ?? 0.45;
  const blur = c.stageBlur ?? 12;
  return {
    backgroundColor: opacity > 0 ? `rgba(${bgRgb}, ${opacity})` : 'transparent',
    backdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
  };
});

const bannerCardStyle = computed(() => {
  const c = chatRoomConfig.value;
  if (!c) return {};
  const bgRgb = hexToRgb(c.assistantBgColor || '#0f172a');
  const opacity = c.assistantBgOpacity ?? 0.85;
  const blur = c.assistantBlur ?? 12;
  return {
    backgroundColor: opacity > 0 ? `rgba(${bgRgb}, ${opacity * 0.7})` : 'transparent',
    borderColor: `${c.borderColor || '#0284c7'}60`,
    borderRadius: `${c.assistantBorderRadius ?? 16}px`,
    backdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
  };
});

const footerStyle = computed(() => {
  const c = chatRoomConfig.value;
  const bgRgb = hexToRgb(c?.sidebarBgColor || '#020617');
  const opacity = c?.sidebarBgOpacity ?? 0.70;
  const blur = c?.stageBlur ?? 12;
  return {
    backgroundColor: opacity > 0 ? `rgba(${bgRgb}, ${opacity})` : 'transparent',
    borderColor: `${c?.borderColor || '#38bdf8'}30`,
    backdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
  };
});

const inputPanelStyle = computed(() => {
  const c = chatRoomConfig.value;
  if (!c) return {};
  const bgRgb = hexToRgb(c.inputBgColor || '#0f172a');
  return {
    backgroundColor: `rgba(${bgRgb}, 0.85)`,
    borderColor: c.inputBorderColor || c.borderColor || '#38bdf8',
    borderRadius: `${c.assistantBorderRadius ?? 16}px`,
    boxShadow: (c.assistantBorderGlow ?? 0.4) > 0 ? `0 0 ${(c.assistantBorderGlow ?? 0.4) * 15}px ${c.accentColor || '#38bdf8'}` : '0 4px 16px rgba(0,0,0,0.25)',
  };
});

const sendButtonStyle = computed(() => {
  const c = chatRoomConfig.value;
  if (!c?.accentColor) return {};
  return {
    background: c.accentColor,
    boxShadow: `0 0 12px ${c.accentColor}60`,
  };
});

const newChatBtnStyle = computed(() => {
  const c = chatRoomConfig.value;
  const accent = c?.accentColor || '#38bdf8';
  return {
    background: `linear-gradient(135deg, ${accent}dd, ${accent})`,
    boxShadow: `0 0 15px ${accent}40`,
  };
});

const chipStyle = computed(() => {
  const c = chatRoomConfig.value;
  const accent = c?.accentColor || '#38bdf8';
  return {
    borderColor: `${accent}40`,
    color: accent,
  };
});

const scrollToBottom = async (smooth = true) => {
  await nextTick();
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTo({
      top: chatContainerRef.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }
};

const handleSend = async () => {
  const text = userInput.value.trim();
  if (!text || chatStore.isGenerating) return;
  userInput.value = '';
  await chatStore.sendMessage(text);
  scrollToBottom();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const applyQuickPrompt = (promptText: string) => {
  userInput.value = promptText;
  soundFx.playTypewriterClick();
};

const handleNewSession = () => {
  chatStore.createNewSession();
  soundFx.playCrystalChime();
  scrollToBottom(false);
};

const handleClearHistory = () => {
  if (confirm('确认清空当前对话的所有历史记录吗？')) {
    chatStore.clearCurrentMessages();
    soundFx.playTypewriterClick();
  }
};

const handleAvatarPoke = (zone?: 'head' | 'body') => {
  if (zone === 'head') {
    const headGreetings = [
      '摸摸头~ 收到你的鼓励啦！(*/ω＼*)',
      '好舒服呀~ 心情值瞬间爆满 200%！',
      '摸头杀！今天也会一直开心陪着你哦！'
    ];
    userInput.value = headGreetings[Math.floor(Math.random() * headGreetings.length)];
  } else {
    const bodyGreetings = [
      '哇呀！戳到我啦~ (*^▽^*)',
      '今天在忙什么呀？和我说说呗~',
      '有什么想和我聊聊的吗？随时在哦！'
    ];
    userInput.value = bodyGreetings[Math.floor(Math.random() * bodyGreetings.length)];
  }
};

// Auto scroll on new messages
watch(() => activeSession.value?.messages.length, () => {
  scrollToBottom();
});

// Auto scroll on streaming chunks
watch(() => {
  const msgs = activeSession.value?.messages;
  return msgs ? msgs[msgs.length - 1]?.content : '';
}, () => {
  if (chatStore.isGenerating) {
    scrollToBottom(false);
  }
});

// Context Menu Management
const showContextMenu = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });
const targetMessage = ref<any | null>(null);

const handleBubbleContextMenu = (e: MouseEvent, msg: any) => {
  e.preventDefault();
  targetMessage.value = msg;
  contextMenuPos.value = {
    x: Math.min(e.clientX, window.innerWidth - 220),
    y: Math.min(e.clientY, window.innerHeight - 250)
  };
  showContextMenu.value = true;
};

const handleStageContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  targetMessage.value = null;
  contextMenuPos.value = {
    x: Math.min(e.clientX, window.innerWidth - 220),
    y: Math.min(e.clientY, window.innerHeight - 200)
  };
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
};

const copyTargetMessage = async () => {
  if (targetMessage.value?.content) {
    await navigator.clipboard.writeText(targetMessage.value.content);
    soundFx.playCrystalChime([659.25, 880]);
  }
  showContextMenu.value = false;
};

const deleteTargetMessage = () => {
  if (targetMessage.value) {
    chatStore.deleteMessage(targetMessage.value.id);
  }
  showContextMenu.value = false;
};

const clearCurrentSessionMessages = () => {
  chatStore.clearCurrentMessages();
  soundFx.playCrystalChime([523.25, 659.25, 783.99]);
  showContextMenu.value = false;
};

onMounted(() => {
  scrollToBottom(false);
  settingStore.checkAstrBotHealth();
});
</script>

<template>
  <div 
    class="relative w-full h-full flex flex-col bg-slate-950/95 overflow-hidden select-none"
    @click="closeContextMenu"
  >
    <!-- Particle Background with 4 ACG themes -->
    <ParticleBackground />

    <!-- Top Tactical Bar -->
    <TopHUDBar 
      :show-window-controls="isElectron"
      @open-settings="showSettings = true"
      @open-portrait-studio="showPortraitStudio = true"
      @toggle-mode="emit('switch-to-mini')"
    />

    <!-- Main Workspace Body -->
    <div class="relative z-10 flex flex-1 overflow-hidden">
      <!-- 1. Left Sessions Sidebar (Theme-responsive) -->
      <aside 
        class="w-60 border-r flex flex-col justify-between p-3 flex-shrink-0 transition-all"
        :style="sidebarStyle"
      >
        <div>
          <!-- New Chat Button with Dynamic Theme Accent -->
          <button 
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-medium text-xs transition-all mb-3"
            :style="newChatBtnStyle"
            @click="handleNewSession"
          >
            <Plus class="w-4 h-4" />
            <span>开启新对话</span>
          </button>

          <!-- Session List -->
          <div class="space-y-1 max-h-[62vh] overflow-y-auto pr-1">
            <div 
              v-for="sess in chatStore.sessions" 
              :key="sess.id"
              class="group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all border"
              :style="sess.id === chatStore.activeSessionId 
                ? { 
                    borderColor: `${chatRoomConfig?.borderColor || '#38bdf8'}80`, 
                    backgroundColor: `${chatRoomConfig?.accentColor || '#38bdf8'}25`, 
                    color: chatRoomConfig?.accentColor || '#38bdf8',
                    boxShadow: `0 0 10px ${chatRoomConfig?.accentColor || '#38bdf8'}30`
                  } 
                : { borderColor: 'transparent' }"
              :class="sess.id !== chatStore.activeSessionId ? 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200' : ''"
              @click="chatStore.selectSession(sess.id)"
            >
              <div class="flex items-center gap-2 truncate">
                <MessageSquare class="w-3.5 h-3.5 flex-shrink-0" :style="{ color: chatRoomConfig?.accentColor || '#38bdf8' }" />
                <span class="truncate">{{ sess.title }}</span>
              </div>
              <button 
                class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                title="删除会话"
                @click.stop="chatStore.deleteSession(sess.id)"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <!-- Sidebar Bottom Persona Card -->
        <div 
          class="p-3 rounded-xl border flex items-center gap-3 transition-all"
          :style="{ 
            backgroundColor: `${chatRoomConfig?.assistantBgColor || '#0f172a'}90`, 
            borderColor: `${chatRoomConfig?.borderColor || '#38bdf8'}40` 
          }"
        >
          <CharacterAvatar 
            :mood="chatStore.currentMood"
            size="sm"
            :interactive="false"
          />
          <div class="flex flex-col truncate">
            <span class="text-xs font-semibold truncate" :style="{ color: chatRoomConfig?.accentColor || '#38bdf8' }">{{ settingStore.settings.botDisplayName }}</span>
            <span class="text-[10px] text-slate-400 truncate">专属伴侣</span>
          </div>
        </div>
      </aside>

      <!-- 2. Center Chat Stage (Customizable Background & Opacity) -->
      <main 
        class="flex-1 flex flex-col justify-between overflow-hidden transition-all"
        :style="chatStageStyle"
      >
        <!-- Message Flow Container -->
        <div 
          ref="chatContainerRef"
          class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-4 max-w-full"
          @contextmenu="handleStageContextMenu"
        >
          <!-- Welcome Companion Banner -->
          <div 
            class="mx-auto max-w-xl text-center my-4 p-4 rounded-2xl border shadow-xl transition-all"
            :style="bannerCardStyle"
          >
            <div class="inline-flex mb-2">
              <CharacterAvatar 
                :mood="chatStore.currentMood"
                size="md"
                :interactive="true"
                @poke="handleAvatarPoke"
              />
            </div>
            <h2 class="text-sm font-bold font-mono tracking-wider" :style="{ color: chatRoomConfig?.accentColor || '#38bdf8' }">
              {{ settingStore.settings.botDisplayName }}
            </h2>
            <p class="text-xs text-slate-300 mt-1 leading-relaxed">
              你的专属桌面伴侣，随时随地陪你聊天哦~
            </p>
          </div>

          <!-- Message Bubbles -->
          <template v-if="activeSession">
            <ChatBubble 
              v-for="msg in activeSession.messages" 
              :key="msg.id"
              :message="msg"
              :assistant-name="settingStore.settings.botDisplayName"
              @bubble-contextmenu="handleBubbleContextMenu"
              @delete="chatStore.deleteMessage"
            />
          </template>
        </div>

        <!-- Bottom Input Bar & Quick Action Chips -->
        <footer 
          class="p-3 md:p-4 border-t transition-all"
          :style="footerStyle"
        >
          <!-- Quick Action Chips from settings -->
          <div class="flex items-center gap-2 mb-2 overflow-x-auto pb-1 select-none">
            <button 
              v-for="chip in settingStore.settings.quickPrompts" 
              :key="chip.id"
              class="px-2.5 py-1 rounded-full border text-[11px] transition-all flex-shrink-0 bg-slate-900/60 hover:brightness-125"
              :style="chipStyle"
              @click="applyQuickPrompt(chip.text)"
            >
              {{ chip.label }}
            </button>
          </div>

          <!-- Main Input Container with Dynamic Styling -->
          <div 
            class="relative rounded-2xl border p-2 flex items-end gap-2 transition-all"
            :style="inputPanelStyle"
          >
            <textarea 
              v-model="userInput"
              rows="2"
              class="flex-1 bg-transparent text-slate-100 text-xs md:text-sm resize-none outline-none placeholder:text-slate-500 px-2 py-1 leading-relaxed"
              :placeholder="'想对 ' + (settingStore.settings.botDisplayName || '智能伴侣') + ' 说点什么... (Enter 发送, Shift+Enter 换行)'"
              @keydown="handleKeyDown"
            ></textarea>

            <!-- Send / Stop Button with Dynamic Accent -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <button 
                v-if="chatStore.isGenerating"
                class="p-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)] transition-all flex items-center justify-center"
                title="停止生成"
                @click="chatStore.stopGeneration"
              >
                <Square class="w-4 h-4" />
              </button>

              <button 
                v-else
                class="p-2.5 rounded-xl text-white transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                :style="sendButtonStyle"
                :disabled="!userInput.trim()"
                title="发送消息"
                @click="handleSend"
              >
                <Send class="w-4 h-4" />
              </button>
            </div>
          </div>
        </footer>
      </main>

      <!-- 3. Right Status, Live Portrait & AstrBot Drawer -->
      <aside 
        class="hidden lg:flex w-72 border-l flex-col p-4 space-y-4 overflow-y-auto flex-shrink-0 transition-all"
        :style="sidebarStyle"
      >
        <!-- Live Dynamic Character Portrait Showcase Card -->
        <div class="p-3.5 rounded-2xl glass-card border border-cyan-500/30 text-center flex flex-col items-center relative overflow-hidden group">
          <!-- Top Tag & Studio Button -->
          <div class="w-full flex items-center justify-between mb-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-mono flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE STAND</span>
            </span>

            <button 
              class="p-1 rounded-lg hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
              title="打开立绘设计器 (导入动态 WebP/视频/图片)"
              @click="showPortraitStudio = true"
            >
              <Palette class="w-3.5 h-3.5" />
              <span>立绘工坊</span>
            </button>
          </div>

          <!-- Character Portrait Display (Supports WebP/Video/SVG) -->
          <div class="w-full h-48 flex items-center justify-center my-1">
            <CharacterPortrait 
              :config="settingStore.settings.portrait"
              :mood="chatStore.currentMood"
              :is-generating="chatStore.isGenerating"
              :interactive="true"
              @poke="handleAvatarPoke"
            />
          </div>

          <div class="mt-2 w-full flex items-center justify-between text-[11px] px-1 text-slate-400 border-t border-cyan-500/15 pt-2">
            <span class="font-semibold text-cyan-300">{{ activePersona.name.split(' ')[0] }}</span>
            <span class="font-mono text-slate-500">{{ chatStore.currentMood }}</span>
          </div>
        </div>

        <!-- AstrBot Quick Tools -->
        <AstrBotQuickTools @inject-prompt="applyQuickPrompt" />

        <!-- Clear session history button -->
        <button 
          class="w-full py-2 px-3 rounded-xl border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          @click="handleClearHistory"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>清空当前记录</span>
        </button>
      </aside>
    </div>

    <!-- Settings Modal -->
    <SettingsModal 
      v-if="showSettings" 
      @close="showSettings = false"
      @open-studio="showSettings = false; showPortraitStudio = true"
    />

    <!-- Standalone Portrait Studio Modal -->
    <PortraitDesignerModal 
      v-if="showPortraitStudio" 
      @close="showPortraitStudio = false"
    />

    <!-- 🌟 Right-Click Context Menu (二次元悬浮右键操作菜单) -->
    <div 
      v-if="showContextMenu"
      class="fixed z-50 py-1.5 px-1 rounded-xl bg-slate-950/95 backdrop-blur-md border shadow-[0_0_25px_rgba(0,0,0,0.8)] text-xs text-slate-200 w-48 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 select-none"
      :style="{ 
        left: `${contextMenuPos.x}px`, 
        top: `${contextMenuPos.y}px`, 
        borderColor: `${chatRoomConfig?.borderColor || '#38bdf8'}60` 
      }"
      @click.stop
    >
      <!-- Message specific actions -->
      <template v-if="targetMessage">
        <div class="px-2.5 py-1 text-[10px] text-slate-400 font-mono border-b border-slate-800 flex items-center justify-between">
          <span>消息操作</span>
          <span class="text-cyan-400">{{ targetMessage.role === 'assistant' ? 'AI 伴侣' : '我' }}</span>
        </div>

        <button 
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
          @click="copyTargetMessage"
        >
          <Copy class="w-3.5 h-3.5 text-cyan-400" />
          <span>复制此条文本</span>
        </button>

        <button 
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-300 transition-colors text-left"
          @click="deleteTargetMessage"
        >
          <Trash2 class="w-3.5 h-3.5 text-rose-400" />
          <span>删除此条消息</span>
        </button>

        <div class="border-t border-slate-800/80 my-1"></div>
      </template>

      <!-- Global / Session actions -->
      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-300 transition-colors text-left"
        @click="clearCurrentSessionMessages"
      >
        <Eraser class="w-3.5 h-3.5 text-amber-400" />
        <span>清空当前全部记录</span>
      </button>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        @click="showContextMenu = false; handleNewSession()"
      >
        <Plus class="w-3.5 h-3.5 text-emerald-400" />
        <span>开启全新对话</span>
      </button>

      <button 
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
        @click="showContextMenu = false; showSettings = true"
      >
        <Settings class="w-3.5 h-3.5 text-cyan-400" />
        <span>聊天室外观设置</span>
      </button>
    </div>
  </div>
</template>
