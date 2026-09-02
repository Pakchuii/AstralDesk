import { AstrBotService } from './astralBot';
import { DeepSeekService } from './deepseek';
import { AppSettings, ChatMessage, EngineType, MoodType } from '@/types';
import { soundFx } from './audioSynthesizer';

export interface DispatchOptions {
  settings: AppSettings;
  systemPrompt: string;
  history: { role: string; content: string }[];
  sessionId?: string;
  onThinking: (chunk: string) => void;
  onContent: (chunk: string) => void;
  onFinish: (mood: MoodType, thinkingTimeSec: number) => void;
  onError: (err: Error) => void;
  abortSignal?: AbortSignal;
}

export class EngineManager {
  /**
   * Helper to guess character mood from the generated text
   */
  public static analyzeMood(text: string): MoodType {
    if (/(哈哈|嘻嘻|好耶|太棒了|开心|元气|喵|\(\*\^▽\^\*\)|✨)/i.test(text)) return 'happy';
    if (/(思考|分析|算法|计算|根据|逻辑|因为|推理|公式)/i.test(text)) return 'thinking';
    if (/(哇|居然|竟然|天哪|震惊|什么|真的吗|？！|!\?)/i.test(text)) return 'surprised';
    if (/(害羞|脸红|哼|笨蛋|才没有|讨厌啦|\(⁄ ⁄•⁄-⁄•⁄ ⁄\))/i.test(text)) return 'shy';
    if (/(傲娇|别小看我|当然啦|哼哼|本小姐|区区)/i.test(text)) return 'pout';
    return 'normal';
  }

  public static async dispatchChat(options: DispatchOptions) {
    const { settings, systemPrompt, history, sessionId, onThinking, onContent, onFinish, onError, abortSignal } = options;
    const startTime = performance.now();
    let isFirstToken = true;
    let accumulatedContent = '';
    let accumulatedThinking = '';
    let thinkingEnded = false;
    let thinkingDuration = 0;

    const handleThinking = (delta: string) => {
      if (!accumulatedThinking) {
        soundFx.playThinkingPulse();
      }
      accumulatedThinking += delta;
      onThinking(delta);
    };

    const handleContent = (delta: string) => {
      if (accumulatedThinking && !thinkingEnded) {
        thinkingEnded = true;
        thinkingDuration = Math.round((performance.now() - startTime) / 1000);
      }

      if (isFirstToken) {
        isFirstToken = false;
        soundFx.playCrystalChime();
      } else if (Math.random() < 0.25) {
        soundFx.playTypewriterClick();
      }

      accumulatedContent += delta;
      onContent(delta);
    };

    const handleFinish = () => {
      if (accumulatedThinking && !thinkingDuration) {
        thinkingDuration = Math.round((performance.now() - startTime) / 1000);
      }
      const mood = this.analyzeMood(accumulatedContent);
      onFinish(mood, thinkingDuration);
    };

    const handleError = (err: Error) => {
      onError(err);
    };

    const targetEngine: EngineType = settings.engine;

    if (targetEngine === 'astrbot') {
      await AstrBotService.streamChat(
        settings.astrbot.baseUrl,
        settings.astrbot.apiKey,
        settings.astrbot.model || 'astrbot-agent',
        history,
        systemPrompt,
        sessionId || 'default_session',
        {
          onThinking: handleThinking,
          onContent: handleContent,
          onFinish: handleFinish,
          onError: handleError,
        },
        abortSignal
      );
    } else if (targetEngine === 'deepseek') {
      await DeepSeekService.streamChat(
        settings.deepseek.apiKey,
        settings.deepseek.baseUrl,
        settings.deepseek.model || 'deepseek-reasoner',
        history,
        systemPrompt,
        settings.deepseek.temperature,
        {
          onThinking: handleThinking,
          onContent: handleContent,
          onFinish: handleFinish,
          onError: handleError,
        },
        abortSignal
      );
    } else {
      // Custom OpenAI Compatible Provider (e.g. SiliconFlow, Kimi, Ollama)
      await DeepSeekService.streamChat(
        settings.custom.apiKey,
        settings.custom.baseUrl,
        settings.custom.model || 'gpt-3.5-turbo',
        history,
        systemPrompt,
        0.7,
        {
          onThinking: handleThinking,
          onContent: handleContent,
          onFinish: handleFinish,
          onError: handleError,
        },
        abortSignal
      );
    }
  }
}
