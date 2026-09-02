<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import katex from 'katex';
import { soundFx } from '@/services/audioSynthesizer';

const props = defineProps<{
  content: string;
}>();

const containerRef = ref<HTMLElement | null>(null);

// Initialize markdown-it with highlight.js integration
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        return `<pre class="hljs"><div class="code-header flex justify-between items-center px-3 py-1.5 bg-slate-900/90 text-xs text-slate-400 border-b border-slate-700/50 select-none"><span>${lang}</span><button class="copy-code-btn hover:text-cyan-400 text-[11px] transition-colors" data-code="${encodeURIComponent(str)}">复制</button></div><code class="hljs block p-3 overflow-x-auto font-mono text-xs">${highlighted}</code></pre>`;
      } catch {
        // fallback
      }
    }
    const escaped = md.utils.escapeHtml(str);
    return `<pre class="hljs"><div class="code-header flex justify-between items-center px-3 py-1.5 bg-slate-900/90 text-xs text-slate-400 border-b border-slate-700/50 select-none"><span>code</span><button class="copy-code-btn hover:text-cyan-400 text-[11px] transition-colors" data-code="${encodeURIComponent(str)}">复制</button></div><code class="hljs block p-3 overflow-x-auto font-mono text-xs">${escaped}</code></pre>`;
  }
});

// Process KaTeX math in text before markdown rendering
const processMathAndRender = (raw: string): string => {
  if (!raw) return '';

  let text = raw;

  // 1. Replace display math $$ ... $$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `$$${math}$$`;
    }
  });

  // 2. Replace inline math $ ... $ (safeguard shell variables, currencies, and code identifiers)
  text = text.replace(/(?<!\\)\$([^\$\n]+?)\$(?!\w)/g, (match, math) => {
    const trimmed = math.trim();
    if (!trimmed) return match;
    // Skip shell variables / currencies / identifiers like $100, $HOME, $_.WorkingSet
    if (/^[\w_.]+$/.test(trimmed) || /^\d+(\.\d+)?$/.test(trimmed) || trimmed.startsWith('_')) {
      return match;
    }
    // Only render if it looks like actual LaTeX formula
    if (/[\^_{}\\=+\-*/]/.test(trimmed) || /\\[a-zA-Z]+/.test(trimmed)) {
      try {
        return katex.renderToString(trimmed, { displayMode: false, throwOnError: false });
      } catch {
        return match;
      }
    }
    return match;
  });

  return md.render(text);
};

const renderedHtml = computed(() => {
  return processMathAndRender(props.content);
});

// Bind copy buttons inside code blocks
const bindCopyButtons = () => {
  if (!containerRef.value) return;
  const buttons = containerRef.value.querySelectorAll<HTMLButtonElement>('.copy-code-btn');
  buttons.forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const code = decodeURIComponent(btn.getAttribute('data-code') || '');
      if (code) {
        await navigator.clipboard.writeText(code);
        const originalText = btn.innerText;
        btn.innerText = '已复制 ✓';
        btn.classList.add('text-emerald-400');
        soundFx.playCrystalChime([880, 1046.5]);
        setTimeout(() => {
          btn.innerText = originalText;
          btn.classList.remove('text-emerald-400');
        }, 2000);
      }
    };
  });
};

watch(() => props.content, () => {
  nextTick(() => {
    bindCopyButtons();
  });
});

onMounted(() => {
  bindCopyButtons();
});
</script>

<template>
  <div 
    ref="containerRef" 
    class="markdown-body text-sm leading-relaxed"
    v-html="renderedHtml"
  ></div>
</template>
