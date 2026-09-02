import { StreamCallbacks } from './astralBot';

export class DeepSeekService {
  /**
   * Stream chat completion directly from DeepSeek API or SiliconFlow / OpenAI compatible provider
   */
  public static async streamChat(
    apiKey: string,
    baseUrl: string = 'https://api.deepseek.com',
    model: string = 'deepseek-reasoner',
    messages: { role: string; content: string }[],
    systemPrompt: string,
    temperature: number = 0.7,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ) {
    if (!apiKey) {
      throw new Error('未配置 DeepSeek API Key，请点击右上角设置填入 API Key');
    }

    const cleanUrl = (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    const endpoint = cleanUrl.endsWith('/chat/completions')
      ? cleanUrl
      : `${cleanUrl}/chat/completions`;

    const formattedMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const payload: Record<string, unknown> = {
      model: model || 'deepseek-reasoner',
      messages: formattedMessages,
      stream: true,
      temperature: model.includes('reasoner') ? undefined : temperature,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`DeepSeek API 请求失败 (${response.status}): ${errText || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法初始化数据流');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let isInThinkTag = false;

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
              const delta = data.choices?.[0]?.delta;

              // Official DeepSeek R1 reasoning_content field
              if (delta?.reasoning_content && callbacks.onThinking) {
                callbacks.onThinking(delta.reasoning_content);
              }

              // Normal text content (could also contain <think>...</think> on some third-party proxy relays)
              if (delta?.content) {
                const text: string = delta.content;

                if (text.includes('<think>')) {
                  isInThinkTag = true;
                  const parts = text.split('<think>');
                  if (parts[0]) callbacks.onContent(parts[0]);
                  if (parts[1] && callbacks.onThinking) callbacks.onThinking(parts[1]);
                } else if (text.includes('</think>')) {
                  isInThinkTag = false;
                  const parts = text.split('</think>');
                  if (parts[0] && callbacks.onThinking) callbacks.onThinking(parts[0]);
                  if (parts[1]) callbacks.onContent(parts[1]);
                } else if (isInThinkTag && callbacks.onThinking) {
                  callbacks.onThinking(text);
                } else {
                  callbacks.onContent(text);
                }
              }
            } catch {
              // Ignore non-json lines
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
