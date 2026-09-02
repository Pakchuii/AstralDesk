import { AstrBotStatus } from '@/types';

export interface StreamCallbacks {
  onThinking?: (delta: string) => void;
  onContent: (delta: string) => void;
  onError?: (err: Error) => void;
  onFinish?: () => void;
}

export const DEFAULT_ASTRBOT_KEY = 'abk_astraldesk_desktop_client_key';

/**
 * Filter and remove any raw Agent tool calls, SQL/Python code dumps, PowerShell error logs, and XML trace artifacts
 */
export function cleanAgentTrace(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Remove XML / Tagged thought & tool blocks
  text = text.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '');
  text = text.replace(/<tool_result>[\s\S]*?<\/tool_result>/gi, '');
  text = text.replace(/<function_call>[\s\S]*?<\/function_call>/gi, '');
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  text = text.replace(/<antThinking>[\s\S]*?<\/antThinking>/gi, '');
  text = text.replace(/<action>[\s\S]*?<\/action>/gi, '');

  // 2. Remove JSON tool call traces (chatcmpl-tool, call_, tool_, ts, result, arguments, etc.)
  text = text.replace(/\{"id":\s*"(?:chatcmpl-tool|call|tool)[^"]*"[\s\S]*?\}\s*/g, '');
  text = text.replace(/\{"ts":\s*\d+(\.\d+)?[\s\S]*?"result":[\s\S]*?\}\s*/g, '');
  text = text.replace(/\{"name":\s*"[^"]+",\s*"(?:args|arguments)"[\s\S]*?\}\s*/g, '');
  text = text.replace(/\{"type":\s*"(?:function|tool_call)",[\s\S]*?\}\s*/g, '');

  // 3. Remove PowerShell / CMD command dumps and exception stack traces
  text = text.replace(/Command completed with exit code \d+[\s\S]*?(?=(?:（|\(|$|\n\n|[a-zA-Z\u4e00-\u9fa5]{2,}))/gi, '');
  text = text.replace(/CategoryInfo\s*:\s*[^\n]+\s*FullyQualifiedErrorId\s*:\s*[^\n]+/gi, '');
  text = text.replace(/无法将值[^转]+转换为类型[^\n]+/gi, '');
  text = text.replace(/所在位置\s*行:\d+[\s\S]*?FullyQualifiedErrorId[^\n]*/gi, '');
  text = text.replace(/sqlite_master\s+WHERE\s+type=['"]table['"][\s\S]*?con\.close\(\)/gi, '');

  // 4. Remove ReAct prompt artifacts
  text = text.replace(/Action:\s*.*?\n/gi, '');
  text = text.replace(/Action Input:\s*.*?\n/gi, '');
  text = text.replace(/Observation:\s*.*?\n/gi, '');
  text = text.replace(/^Final Answer:\s*/gi, '');

  return text.trim();
}

/**
 * Check if a text chunk looks like a tool execution trace, JSON snippet, or command error
 */
export function isAgentTraceChunk(chunk: string): boolean {
  if (!chunk) return false;
  const trimmed = chunk.trim();
  if (trimmed.startsWith('{"id":') || trimmed.startsWith('{"ts":') || trimmed.startsWith('{"name":') || trimmed.startsWith('{"tool":')) return true;
  if (trimmed.includes('chatcmpl-tool-') || trimmed.includes('"result":')) return true;
  if (trimmed.includes('CategoryInfo :') || trimmed.includes('FullyQualifiedErrorId :')) return true;
  if (trimmed.includes('Command completed with exit code')) return true;
  if (trimmed.includes('sqlite_master WHERE type=') || trimmed.includes('sqlite3.connect')) return true;
  if (trimmed.startsWith('<tool_call>') || trimmed.startsWith('<function_call>') || trimmed.startsWith('<think>')) return true;
  return false;
}

export class AstrBotService {
  private static status: AstrBotStatus = {
    online: false,
    latencyMs: 0,
    url: 'http://127.0.0.1:6185',
    activePlugins: ['联网搜索', '沙箱代码执行', '知识库RAG', '多端会话同步'],
    lastChecked: 0,
  };

  public static async checkHealth(baseUrl: string = 'http://127.0.0.1:6185'): Promise<AstrBotStatus> {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`${cleanUrl}/api/v1/auth/setup-status`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      }).catch(async () => {
        return await fetch(`${cleanUrl}/`, {
          method: 'GET',
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      if (response && (response.ok || response.status === 401 || response.status === 200)) {
        this.status = {
          online: true,
          latencyMs: elapsed,
          url: cleanUrl,
          activePlugins: this.status.activePlugins,
          lastChecked: Date.now(),
        };
      } else {
        this.status.online = false;
        this.status.latencyMs = 0;
        this.status.lastChecked = Date.now();
      }
    } catch {
      this.status.online = false;
      this.status.latencyMs = 0;
      this.status.lastChecked = Date.now();
    }

    return this.status;
  }

  public static getCachedStatus(): AstrBotStatus {
    return this.status;
  }

  /**
   * Delete / Reset a conversation in AstrBot backend database
   */
  public static async deleteSession(baseUrl: string, apiKey: string, sessionId: string) {
    if (!sessionId) return;
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const effectiveKey = apiKey.trim() || DEFAULT_ASTRBOT_KEY;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': effectiveKey,
      'Authorization': `Bearer ${effectiveKey}`,
    };

    try {
      // 1. AstrBot chat reset endpoint
      await fetch(`${cleanUrl}/api/v1/chat/reset`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id: sessionId, conversation_id: sessionId, username: 'Commander' }),
      }).catch(() => {});

      // 2. AstrBot conversation delete REST endpoint
      await fetch(`${cleanUrl}/api/v1/conversations/${sessionId}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {});

      // 3. AstrBot chat session delete endpoint
      await fetch(`${cleanUrl}/api/v1/chat/session/${sessionId}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {});
    } catch {
      // Silently catch network errors during cleanup
    }
  }

  /**
   * Stream chat completion through AstrBot's native /api/v1/chat endpoint
   */
  public static async streamChat(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[],
    systemPrompt: string,
    sessionId: string,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ) {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/v1/chat`;
    const effectiveKey = apiKey.trim() || DEFAULT_ASTRBOT_KEY;

    // Get the user's latest query
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const userQuery = lastUserMsg ? lastUserMsg.content : (messages[messages.length - 1]?.content || '');

    // Bind to the exact session ID so AstrBot reuses the same conversation rather than creating orphans
    const payload = {
      username: 'Commander',
      message: userQuery,
      session_id: sessionId || 'default_session',
      conversation_id: sessionId || 'default_session',
      enable_streaming: true,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': effectiveKey,
      'Authorization': `Bearer ${effectiveKey}`,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`AstrBot 接口错误 (${response.status}): ${errText || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法创建流式读取器');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let isInThinkTag = false;
      let lastToolEventName = '';

      const handlePlainTextDelta = (text: string) => {
        if (!text) return;

        // Check for tag boundaries
        if (text.includes('<think>')) {
          isInThinkTag = true;
          const parts = text.split('<think>');
          if (parts[0]) {
            const c = cleanAgentTrace(parts[0]);
            if (c) callbacks.onContent(c);
          }
          if (parts[1] && callbacks.onThinking) {
            callbacks.onThinking(parts[1]);
          }
          return;
        }

        if (text.includes('</think>')) {
          isInThinkTag = false;
          const parts = text.split('</think>');
          if (parts[0] && callbacks.onThinking) {
            callbacks.onThinking(parts[0]);
          }
          if (parts[1]) {
            const c = cleanAgentTrace(parts[1]);
            if (c) callbacks.onContent(c);
          }
          return;
        }

        if (isInThinkTag) {
          callbacks.onThinking?.(text);
          return;
        }

        // If it's a tool execution or trace chunk, do not send to content
        if (isAgentTraceChunk(text)) {
          return;
        }

        const cleaned = cleanAgentTrace(text);
        if (cleaned) {
          callbacks.onContent(cleaned);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            callbacks.onFinish?.();
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              // 1. Dedicated Reasoning / Thought stream
              if ((data.type === 'reasoning' || data.type === 'thought' || data.type === 'agent_thought') && data.data) {
                callbacks.onThinking?.(data.data);
              } 
              // 2. Intercept Agent Tool Calls (Emit at most once per tool)
              else if (
                data.type === 'tool_call' || 
                data.type === 'tool_result' || 
                data.type === 'tool' || 
                data.type === 'action' || 
                data.type === 'step' || 
                data.type === 'plugin'
              ) {
                const toolName = data.name || data.tool_name || data.action || data.type;
                if (toolName && toolName !== lastToolEventName) {
                  lastToolEventName = toolName;
                  callbacks.onThinking?.(`\n[🛠️ 正在执行: ${toolName}]\n`);
                }
              } 
              // 3. Normal plain content stream (Strictly separated from think tag)
              else if (data.type === 'plain' && data.data) {
                handlePlainTextDelta(data.data);
              } 
              // 4. Finish event
              else if (data.type === 'finish' || data.type === 'run_finished') {
                callbacks.onFinish?.();
                return;
              } 
              // 5. OpenAI compatible format fallback
              else if (data.choices?.[0]?.delta) {
                const delta = data.choices[0].delta;
                if (delta.reasoning_content && callbacks.onThinking) {
                  callbacks.onThinking(delta.reasoning_content);
                }
                if (delta.content) {
                  handlePlainTextDelta(delta.content);
                }
              }
            } catch {
              // Ignore non-json chunks
            }
          }
        }
      }

      callbacks.onFinish?.();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
