<script setup lang="ts">
import { computed } from 'vue';
import { MoodType, AvatarCropConfig } from '@/types';
import { AVATAR_SVGS } from '@/assets/avatars';
import { soundFx } from '@/services/audioSynthesizer';
import { useSettingStore } from '@/stores/settingStore';

const props = withDefaults(defineProps<{
  mood?: MoodType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customAvatar?: AvatarCropConfig;
  interactive?: boolean;
  showHalo?: boolean;
}>(), {
  mood: 'normal',
  size: 'md',
  interactive: true,
  showHalo: true,
});

const emit = defineEmits<{
  (e: 'poke'): void;
}>();

const settingStore = useSettingStore();

const effectiveAvatar = computed(() => {
  if (props.customAvatar) return props.customAvatar;
  return settingStore.settings.botAvatar;
});

const effectiveAvatarUrl = computed(() => {
  return effectiveAvatar.value?.url || '';
});

const avatarImgStyle = computed(() => {
  const av = effectiveAvatar.value;
  if (!av) return {};
  const scale = av.scale || 1.0;
  const ox = av.offsetX || 0;
  const oy = av.offsetY || 0;
  return {
    top: '50%',
    left: '50%',
    minWidth: '100%',
    minHeight: '100%',
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `translate(-50%, -50%) scale(${scale}) translate(${ox}px, ${oy}px)`,
    transformOrigin: 'center center',
  };
});

const svgContent = computed(() => {
  return AVATAR_SVGS[props.mood] || AVATAR_SVGS.normal;
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-10 h-10';
    case 'md': return 'w-16 h-16';
    case 'lg': return 'w-24 h-24';
    case 'xl': return 'w-36 h-36';
    default: return 'w-16 h-16';
  }
});

const handlePoke = () => {
  if (props.interactive) {
    soundFx.playCrystalChime([783.99, 1046.50]);
    emit('poke');
  }
};
</script>

<template>
  <div 
    class="relative inline-flex items-center justify-center transition-transform duration-300 select-none flex-shrink-0"
    :class="[
      sizeClasses,
      interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
    ]"
    @click="handlePoke"
  >
    <!-- Custom Image Avatar Mode (Scale & Offset strictly decoupled without position drift) -->
    <div 
      v-if="effectiveAvatarUrl"
      class="w-full h-full rounded-full overflow-hidden border-2 border-cyan-400/50 shadow-[0_0_12px_rgba(56,189,248,0.4)] flex items-center justify-center bg-slate-900 relative"
    >
      <img 
        :src="effectiveAvatarUrl" 
        alt="Avatar" 
        class="absolute pointer-events-none transition-transform duration-75 select-none"
        :style="avatarImgStyle"
      />
    </div>

    <!-- Built-in Vector SVG Mode -->
    <div 
      v-else
      class="w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] animate-float"
      v-html="svgContent"
    ></div>

    <!-- Active Mood indicator pip -->
    <span 
      v-if="mood === 'thinking'"
      class="absolute -top-1 -right-1 flex h-3.5 w-3.5"
    >
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500 border border-white/40"></span>
    </span>
  </div>
</template>
