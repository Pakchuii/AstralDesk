import { cleanAgentTrace } from './astralBot';
import { useChatStore } from '@/stores/chatStore';
import { useSettingStore } from '@/stores/settingStore';
import { EngineManager } from './engineManager';
import { soundFx } from './audioSynthesizer';
import { ttsService } from './ttsService';

class ProactivePushService {
  private ws: WebSocket | null = null;
  private syncTimer: any = null;
  private isRunning: boolean = false;
  private lastSyncedContent: string = '';
  private isDocumentHidden: boolean = false;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Listen to document visibility for smart throttling
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 1. Electron Native SQLite Real-time Observer (0% CPU, instant file system trigger)
    if (window.electronAPI?.onAstrBotPushMessage) {
      window.electronAPI.onAstrBotPushMessage((data: any) => {
        if (data && data.text) {
          const cleaned = cleanAgentTrace(data.text);
          if (cleaned) {
            this.dispatchProactiveMessage(cleaned);
          }
        }
      });
    }

    // 2. Fetch any missed messages right on start
    if (window.electronAPI?.fetchMissedMessages) {
      window.electronAPI.fetchMissedMessages(3).then((list: any[]) => {
        if (Array.isArray(list) && list.length > 0) {
          const latest = list[0];
          if (latest && latest.text) {
            const cleaned = cleanAgentTrace(latest.text);
            if (cleaned) {
              this.dispatchProactiveMessage(cleaned);
            }
          }
        }
      }).catch(() => {});
    }

    // In Electron environment, native SQLite push handles instant delivery with 0% CPU.
    // Fallback to WebSocket only in browser dev mode
    if (!window.electronAPI) {
      this.connectWebSocket();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    this.isDocumentHidden = document.hidden;
  };

  /**
   * Track A: WebSocket Real-time Push
   */
  private connectWebSocket() {
    if (!this.isRunning) return;

    const settingStore = useSettingStore();
    if (settingStore.settings.engine !== 'astrbot') return;

    const baseUrl = settingStore.settings.astrbot.baseUrl || 'http://127.0.0.1:6185';
    const apiKey = settingStore.settings.astrbot.apiKey;
    const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/+$/, '');

    try {
      const wsEndpoints = [
        `${wsUrl}/api/v1/ws?api_key=${encodeURIComponent(apiKey || '')}`,
        `${wsUrl}/ws`,
        `${wsUrl}/api/v1/events`
      ];

      // Try primary WS endpoint
      const targetWs = wsEndpoints[0];
      this.ws = new WebSocket(targetWs);

      this.ws.onopen = () => {
        try {
          this.ws?.send(JSON.stringify({ type: 'subscribe', username: 'Commander' }));
        } catch {}
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch {}
      };

      this.ws.onerror = () => {
        // Fallback gracefully to Track B (Incremental Sync)
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.isRunning) {
          setTimeout(() => {
            if (this.isRunning && !this.ws) {
              this.connectWebSocket();
            }
          }, 15000);
        }
      };
    } catch {
      // Fallback
    }
  }

  private handleIncomingMessage(data: any) {
    if (!data) return;

    let rawText = '';
    if (typeof data === 'string') {
      rawText = data;
    } else if (data.message && typeof data.message === 'string') {
      rawText = data.message;
    } else if (data.content && typeof data.content === 'string') {
      rawText = data.content;
    } else if (data.data && typeof data.data === 'string' && data.type === 'plain') {
      rawText = data.data;
    }

    if (!rawText) return;

    const cleaned = cleanAgentTrace(rawText);
    if (!cleaned) return;

    this.dispatchProactiveMessage(cleaned);
  }

  /**
   * Track B: Lightweight Incremental Sync
   * Queries AstrBot history endpoint with 0% CPU consumption
   */
  private async performIncrementalSync() {
    if (!this.isRunning) return;

    const settingStore = useSettingStore();
    const chatStore = useChatStore();

    if (settingStore.settings.engine !== 'astrbot' || chatStore.isGenerating) {
      this.scheduleNextSync(8000);
      return;
    }

    const baseUrl = (settingStore.settings.astrbot.baseUrl || 'http://127.0.0.1:6185').replace(/\/+$/, '');
    const apiKey = settingStore.settings.astrbot.apiKey;
    const sessionId = chatStore.activeSessionId || 'default_session';

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': apiKey || '',
      'Authorization': apiKey ? `Bearer ${apiKey}` : '',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const endpoints = [
        `${baseUrl}/api/v1/conversations/${sessionId}/messages`,
        `${baseUrl}/api/v1/chat/history?session_id=${sessionId}`,
        `${baseUrl}/api/v1/webchat/threads/${sessionId}/messages`,
      ];

      let response: Response | null = null;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });
          if (res.ok) {
            response = res;
            break;
          }
        } catch {}
      }

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const json = await response.json().catch(() => null);
        if (json) {
          const messages = Array.isArray(json) ? json : (json.messages || json.data || []);
          if (Array.isArray(messages) && messages.length > 0) {
            const assistantMsgs = messages.filter((m: any) => m.role === 'assistant' || m.sender === 'bot');
            const latestServerMsg = assistantMsgs[assistantMsgs.length - 1];

            if (latestServerMsg) {
              const serverContent = latestServerMsg.content || latestServerMsg.text || '';
              const cleaned = cleanAgentTrace(serverContent);

              if (cleaned && cleaned !== this.lastSyncedContent) {
                const currentSession = chatStore.currentSession;
                const localMsgs = currentSession?.messages || [];
                const lastLocalAssistant = [...localMsgs].reverse().find(m => m.role === 'assistant');

                if (!lastLocalAssistant || lastLocalAssistant.content !== cleaned) {
                  this.lastSyncedContent = cleaned;
                  this.dispatchProactiveMessage(cleaned);
                }
              }
            }
          }
        }
      }
    } catch {}

    const interval = this.isDocumentHidden ? 12000 : 6000;
    this.scheduleNextSync(interval);
  }

  private scheduleNextSync(delayMs: number) {
    if (!this.isRunning) return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.performIncrementalSync();
    }, delayMs);
  }

  private dispatchProactiveMessage(content: string) {
    const chatStore = useChatStore();
    const settingStore = useSettingStore();
    const sess = chatStore.currentSession;
    if (!sess) return;

    // Do NOT duplicate if user is currently in an active generating stream
    if (chatStore.isGenerating) return;

    // Content normalization fingerprint (strip whitespace, newlines, markdown spaces)
    const normalize = (s: string) => (s || '').replace(/\s+/g, '').replace(/[\r\n\t]/g, '');
    const cleanIncoming = normalize(content);
    if (!cleanIncoming) return;

    // Check if identical content exists anywhere in the session messages
    const exists = sess.messages.some(m => {
      if (m.role !== 'assistant' || !m.content) return false;
      const normLocal = normalize(m.content);
      return normLocal === cleanIncoming || (normLocal.length > 8 && (normLocal.includes(cleanIncoming) || cleanIncoming.includes(normLocal)));
    });
    if (exists) return;

    const mood = EngineManager.analyzeMood(content);

    const newMsg = {
      id: 'msg_proactive_' + Date.now(),
      role: 'assistant' as const,
      content,
      thinkingContent: '',
      isThinking: false,
      timestamp: Date.now(),
      mood,
    };

    sess.messages.push(newMsg);
    sess.updatedAt = Date.now();
    chatStore.currentMood = mood;
    chatStore.saveToStorage();

    if (settingStore.settings.soundEnabled) {
      soundFx.playCrystalChime([783.99, 1046.5]);
    }

    if (settingStore.settings.ttsEnabled) {
      ttsService.speak(content);
    }
  }
}

export const proactivePushService = new ProactivePushService();
