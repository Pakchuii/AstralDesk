<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { MoodType, PortraitConfig, InteractiveTouchAction } from '@/types';
import { AVATAR_SVGS } from '@/assets/avatars';
import { soundFx } from '@/services/audioSynthesizer';
import { Sparkles, Heart, Flower2 } from 'lucide-vue-next';
import { useSettingStore } from '@/stores/settingStore';

const props = withDefaults(defineProps<{
  mood?: MoodType;
  config?: PortraitConfig;
  interactive?: boolean;
  compact?: boolean;
  isGenerating?: boolean;
}>(), {
  mood: 'normal',
  interactive: true,
  compact: false,
  isGenerating: false,
});

const emit = defineEmits<{
  (e: 'poke', actionName: string): void;
}>();

const settingStore = useSettingStore();

// Currently active action
const currentAction = ref<InteractiveTouchAction | null>(null);
let returnTimer: any = null;

const floatingParticles = ref<{ 
  id: number; 
  x: number; 
  y: number; 
  text: string; 
  effectType: string;
}[]>([]);

// Determine the active media asset URL
const activeAssetUrl = computed(() => {
  if (currentAction.value?.assetUrl) {
    return currentAction.value.assetUrl;
  }
  return props.config?.url || '';
});

// Detect media type of current active asset (video vs image/webp vs svg)
const currentMediaType = computed(() => {
  const url = activeAssetUrl.value;
  if (!url) return props.config?.type || 'svg';
  if (url.startsWith('data:video/') || url.endsWith('.mp4') || url.endsWith('.webm')) {
    return 'video';
  }
  return 'webp';
});

const portraitStyle = computed(() => {
  const cfg = props.config || {
    type: 'svg',
    url: '',
    actions: [],
    scale: 1,
    viewportScale: 1,
    offsetX: 0,
    offsetY: 0,
    opacity: 1,
    glowColor: '#38bdf8',
    glowIntensity: 0.35,
    enableBreathing: true,
  };

  const glowInt = cfg.glowIntensity ?? 0.35;
  const shadowBlur = glowInt * 20;
  const baseScale = cfg.scale || 1.0;
  const vpScale = cfg.viewportScale || 1.0;
  const totalScale = baseScale * vpScale;

  return {
    transform: `translate(${cfg.offsetX}px, ${cfg.offsetY}px) scale(${totalScale})`,
    transformOrigin: 'center center',
    opacity: cfg.opacity,
    filter: glowInt > 0 ? `drop-shadow(0 0 ${shadowBlur}px ${cfg.glowColor || '#38bdf8'})` : 'none',
  };
});

// Video ended handler: auto return to idle standby if configured
const handleVideoEnded = () => {
  if (currentAction.value && currentAction.value.autoReturnOnEnded !== false) {
    currentAction.value = null;
  }
};

// Handle touch/click on specific hitboxes
const handleClick = (e: MouseEvent) => {
  if (!props.interactive) return;

  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickY = e.clientY - rect.top;
  const clickX = e.clientX - rect.left;
  const relativeY = clickY / rect.height;

  // Determine hit zone
  let hitZone: 'head' | 'body' | 'bottom' = 'body';
  if (relativeY < 0.35) {
    hitZone = 'head';
  } else if (relativeY >= 0.75) {
    hitZone = 'bottom';
  } else {
    hitZone = 'body';
  }

  // Find matching action from config
  const actions = props.config?.actions || [];
  const matched = actions.find(a => a.triggerZone === hitZone || a.triggerZone === 'all');

  if (returnTimer) {
    clearTimeout(returnTimer);
    returnTimer = null;
  }

  let reactionText = hitZone === 'head' ? '(*/ω＼*) 摸摸头~' : '(*^▽^*) 戳戳~';
  let sfx: string = hitZone === 'head' ? 'chime' : 'click';
  let effectType: string = hitZone === 'head' ? 'hearts' : 'sparkles';

  if (matched) {
    currentAction.value = matched;
    if (matched.reactionText) reactionText = matched.reactionText;
    if (matched.soundEffect) sfx = matched.soundEffect;
    if (matched.effectType) effectType = matched.effectType;

    // Auto-return timer for images/webps or if returnPolicy is auto
    if (matched.returnPolicy === 'auto' && (!matched.autoReturnOnEnded || currentMediaType.value !== 'video')) {
      const dur = (matched.durationSec || 3) * 1000;
      returnTimer = setTimeout(() => {
        currentAction.value = null;
      }, dur);
    }
  }

  // Check custom touch voice
  const touchVoiceResult = settingStore.playTouchVoice(hitZone);
  if (touchVoiceResult?.reactionText) {
    reactionText = touchVoiceResult.reactionText;
  }

  // Play Default Sound Effect if custom touch voice not played
  if (!touchVoiceResult) {
    if (sfx === 'chime') {
      soundFx.playCrystalChime([783.99, 1046.5]);
    } else if (sfx === 'click') {
      soundFx.playTypewriterClick();
    } else if (sfx === 'magic') {
      soundFx.playCrystalChime([523.25, 659.25, 783.99, 1046.5]);
    }
  }

  // Spawn floating reaction particle
  const newParticle = { 
    id: Date.now() + Math.random(), 
    x: clickX, 
    y: clickY, 
    text: reactionText,
    effectType: effectType
  };
  floatingParticles.value.push(newParticle);

  setTimeout(() => {
    floatingParticles.value = floatingParticles.value.filter(p => p.id !== newParticle.id);
  }, 1300);

  emit('poke', matched?.name || hitZone);
};

onUnmounted(() => {
  if (returnTimer) clearTimeout(returnTimer);
});
</script>

<template>
  <div 
    class="relative w-full h-full flex flex-col items-center justify-center select-none overflow-visible group bg-transparent pointer-events-none"
  >
    <!-- Background Tactical Glow Aura (Adjustable Intensity) -->
    <div 
      v-if="(config?.glowIntensity ?? 0.35) > 0"
      class="absolute w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-300"
      :style="{ 
        background: config?.glowColor || 'var(--theme-color, #38bdf8)',
        opacity: (config?.glowIntensity ?? 0.35) * 0.7,
      }"
    ></div>

    <!-- Active Action Badge -->
    <div 
      v-if="currentAction && !compact"
      class="interactive-zone absolute top-2 left-2 z-20 px-2.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-400 text-[10px] text-cyan-300 font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.4)] animate-pulse pointer-events-auto"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
      <span>{{ currentAction.name }}</span>
    </div>

    <!-- Breathing Animation Wrapper (Keeps CSS animation isolated from transform scale) -->
    <div 
      class="w-full h-full flex items-center justify-center bg-transparent overflow-visible pointer-events-none"
      :class="config?.enableBreathing === true ? 'animate-float' : ''"
    >
      <!-- Dedicated Transform & Dual Scale Layer (Base Scale × Viewport Framing Scale) -->
      <div 
        class="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-100 bg-transparent overflow-visible pointer-events-none"
        :style="portraitStyle"
      >
        <!-- Interactive Character Figure Content Layer (Only the actual character catches clicks!) -->
        <div 
          class="interactive-zone inline-flex items-center justify-center pointer-events-auto cursor-pointer transition-transform"
          :class="interactive ? 'hover:scale-[1.01] active:scale-[0.99]' : ''"
          @click.stop="handleClick"
        >
          <!-- Mode 1: Video (WebM / MP4) with auto return on ended -->
          <video 
            v-if="currentMediaType === 'video' && activeAssetUrl"
            :key="activeAssetUrl"
            :src="activeAssetUrl"
            autoplay
            :loop="!currentAction?.autoReturnOnEnded"
            muted
            playsinline
            class="max-w-full max-h-full object-contain pointer-events-auto bg-transparent"
            @ended="handleVideoEnded"
          ></video>

          <!-- Mode 2: Dynamic Animated WebP / GIF / Image -->
          <img 
            v-else-if="currentMediaType === 'webp' && activeAssetUrl"
            :key="activeAssetUrl"
            :src="activeAssetUrl"
            alt="Character Sprite"
            class="max-w-full max-h-full object-contain pointer-events-auto bg-transparent"
          />

          <!-- Mode 3: Built-in HD Vector SVG Stand (Fallback) -->
          <div 
            v-else
            class="w-40 h-40 md:w-48 md:h-48 flex items-center justify-center drop-shadow-[0_0_16px_rgba(56,189,248,0.4)] bg-transparent pointer-events-auto"
            v-html="AVATAR_SVGS[mood || 'normal']"
          ></div>
        </div>
      </div>
    </div>

    <!-- Floating Click Reaction Text & Icon Particles -->
    <div 
      v-for="p in floatingParticles" 
      :key="p.id"
      class="absolute pointer-events-none z-30 animate-ping flex items-center gap-1 text-pink-400 font-bold text-xs whitespace-nowrap drop-shadow"
      :style="{ left: `${p.x}px`, top: `${p.y}px` }"
    >
      <Heart v-if="p.effectType === 'hearts'" class="w-3.5 h-3.5 fill-current text-pink-400" />
      <Flower2 v-else-if="p.effectType === 'sakura'" class="w-3.5 h-3.5 text-rose-300" />
      <Sparkles v-else-if="p.effectType === 'sparkles'" class="w-3.5 h-3.5 text-amber-300" />
      <span>{{ p.text }}</span>
    </div>
  </div>
</template>
