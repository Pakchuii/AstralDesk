import { defineStore } from 'pinia';
import { ChatMessage, ChatSession, MoodType } from '@/types';
import { useSettingStore } from './settingStore';
import { EngineManager } from '@/services/engineManager';
import { AstrBotService, cleanAgentTrace } from '@/services/astralBot';
import { soundFx } from '@/services/audioSynthesizer';
import { ttsService } from '@/services/ttsService';

const SESSIONS_STORAGE_KEY = 'astral_desk_sessions_v2';

export const useChatStore = defineStore('chat', {
  state: (): {
    sessions: ChatSession[];
    activeSessionId: string;
    isGenerating: boolean;
    currentMood: MoodType;
    abortController: AbortController | null;
  } => {
    let savedSessions: ChatSession[] = [];
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        savedSessions = JSON.parse(raw);
        if (Array.isArray(savedSessions)) {
          for (const s of savedSessions) {
            if (Array.isArray(s.messages)) {
              for (const m of s.messages) {
                // Ensure no messages stay stuck in thinking or writing state on app startup
                if (m.isThinking) {
                  m.isThinking = false;
                }
                if (m.role === 'assistant') {
                  m.content = cleanAgentTrace(m.content || '');
                  if (!m.content && m.thinkingContent) {
                    m.content = '（本次生成已中断）';
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }

    if (!savedSessions || savedSessions.length === 0) {
      const defaultSession: ChatSession = {
        id: 'session_' + Date.now(),
        title: '新对话',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          {
            id: 'msg_welcome',
            role: 'assistant',
            content: '你好呀！我是你的桌面伴侣，今天也一直陪着你哦~ 有什么想和我聊聊的吗？',
            timestamp: Date.now(),
            mood: 'happy',
          }
        ]
      };
      savedSessions = [defaultSession];
    }

    return {
      sessions: savedSessions,
      activeSessionId: savedSessions[0].id,
      isGenerating: false,
      currentMood: 'normal',
      abortController: null,
    };
  },

  getters: {
    currentSession(state): ChatSession | undefined {
      return state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
    },
    activePersona(): { name: string; title: string; description: string; greeting: string } {
      const settingStore = useSettingStore();
      const botName = settingStore.settings.botDisplayName || '智能伴侣';
      return {
        name: botName,
        title: botName,
        description: '你的专属桌面伴侣，支持丰富动作表情与日常暖心对话。',
        greeting: `你好呀！我是 ${botName}，有什么想和我聊聊的吗？`,
      };
    }
  },

  actions: {
    saveToStorage() {
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(this.sessions));
      } catch (e) {
        console.error('Failed to save sessions to storage', e);
      }
    },

    createNewSession() {
      const newSession: ChatSession = {
        id: 'session_' + Date.now(),
        title: '新对话',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          {
            id: 'msg_welcome_' + Date.now(),
            role: 'assistant',
            content: this.activePersona.greeting,
            timestamp: Date.now(),
            mood: 'happy',
          }
        ]
      };
      this.sessions.unshift(newSession);
      this.activeSessionId = newSession.id;
      this.saveToStorage();
    },

    selectSession(sessionId: string) {
      if (this.sessions.some(s => s.id === sessionId)) {
        this.activeSessionId = sessionId;
        soundFx.playTypewriterClick();
      }
    },

    deleteSession(sessionId: string) {
      const settingStore = useSettingStore();
      if (settingStore.settings.engine === 'astrbot') {
        AstrBotService.deleteSession(
          settingStore.settings.astrbot.baseUrl,
          settingStore.settings.astrbot.apiKey,
          sessionId
        ).catch(() => {});
      }

      if (this.sessions.length <= 1) {
        this.createNewSession();
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
      } else {
        const idx = this.sessions.findIndex(s => s.id === sessionId);
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        if (this.activeSessionId === sessionId) {
          this.activeSessionId = this.sessions[Math.max(0, idx - 1)].id;
        }
      }
      this.saveToStorage();
      soundFx.playTypewriterClick();
    },

    deleteMessage(messageId: string) {
      const sess = this.currentSession;
      if (sess) {
        sess.messages = sess.messages.filter(m => m.id !== messageId);
        this.saveToStorage();
        soundFx.playTypewriterClick();
      }
    },

    clearCurrentMessages() {
      const sess = this.currentSession;
      if (sess) {
        const settingStore = useSettingStore();
        if (settingStore.settings.engine === 'astrbot') {
          AstrBotService.deleteSession(
            settingStore.settings.astrbot.baseUrl,
            settingStore.settings.astrbot.apiKey,
            sess.id
          ).catch(() => {});
        }

        sess.messages = [
          {
            id: 'msg_welcome_' + Date.now(),
            role: 'assistant',
            content: this.activePersona.greeting,
            timestamp: Date.now(),
            mood: 'happy',
          }
        ];
        this.saveToStorage();
      }
    },

    stopGeneration() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      this.isGenerating = false;
      this.currentMood = 'normal';
      soundFx.playTypewriterClick();
    },

    async sendMessage(text: string) {
      if (!text.trim() || this.isGenerating) return;

      const sess = this.currentSession;
      if (!sess) return;

      // Append user message
      const userMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      sess.messages.push(userMsg);

      // Auto-update session title if it's default
      if (sess.messages.filter(m => m.role === 'user').length === 1) {
        sess.title = text.slice(0, 16) + (text.length > 16 ? '...' : '');
      }

      // Placeholder assistant message
      const assistantMsgId = 'msg_' + (Date.now() + 1);
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        thinkingContent: '',
        isThinking: true,
        timestamp: Date.now(),
        engineUsed: useSettingStore().settings.engine,
        mood: 'thinking',
      };
      sess.messages.push(assistantMsg);
      sess.updatedAt = Date.now();
      this.saveToStorage();

      this.isGenerating = true;
      this.currentMood = 'thinking';
      this.abortController = new AbortController();

      const settingStore = useSettingStore();

      // Extract conversation history
      const history = sess.messages
        .filter(m => m.id !== assistantMsgId && !m.error)
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content }));

      try {
        await EngineManager.dispatchChat({
          settings: settingStore.settings,
          systemPrompt: '', // 不覆盖 AstrBot 人设
          history,
          sessionId: sess.id,
          abortSignal: this.abortController.signal,
          onThinking: (chunk: string) => {
            const target = sess.messages.find(m => m.id === assistantMsgId);
            if (target) {
              target.thinkingContent = (target.thinkingContent || '') + chunk;
              target.isThinking = true;
            }
          },
          onContent: (chunk: string) => {
            const target = sess.messages.find(m => m.id === assistantMsgId);
            if (target) {
              target.isThinking = false;
              target.content += chunk;
            }
          },
          onFinish: (mood: MoodType, thinkingTimeSec: number) => {
            const target = sess.messages.find(m => m.id === assistantMsgId);
            if (target) {
              target.isThinking = false;
              // Clean any lingering tool call or JSON traces from final output
              target.content = cleanAgentTrace(target.content);
              target.mood = mood;
              target.thinkingTime = thinkingTimeSec;
              if (settingStore.settings.ttsEnabled && target.content) {
                ttsService.speak(target.content);
              }
            }
            this.currentMood = mood;
            this.isGenerating = false;
            this.abortController = null;
            this.saveToStorage();
          },
          onError: (err: Error) => {
            const target = sess.messages.find(m => m.id === assistantMsgId);
            if (target) {
              target.isThinking = false;
              target.error = true;
              target.content = `❌ 连接异常：${err.message}\n\n💡 提示：如果使用 AstrBot 模式，请确认本地 AstrBot（${settingStore.settings.astrbot.baseUrl}）是否已启动；或者点击右上角切换为 DeepSeek 云端直连模式。`;
              target.mood = 'pout';
            }
            this.currentMood = 'pout';
            this.isGenerating = false;
            this.abortController = null;
            this.saveToStorage();
          }
        });
      } catch (err: unknown) {
        console.error('Chat execution failed', err);
        this.isGenerating = false;
        this.abortController = null;
      }
    }
  }
});
