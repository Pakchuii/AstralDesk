<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  color?: string;
  size?: number;
  glow?: boolean;
}>(), {
  color: '#38bdf8',
  size: 80,
  glow: true,
});

const haloStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size * 0.35}px`,
  borderColor: props.color,
  boxShadow: props.glow ? `0 0 16px ${props.color}, inset 0 0 10px ${props.color}` : 'none',
}));
</script>

<template>
  <div class="pointer-events-none relative flex items-center justify-center">
    <!-- Outer 3D Halo Ring -->
    <div 
      class="rounded-full border-2 border-dashed animate-halo-spin"
      :style="haloStyle"
    ></div>
    <!-- Inner Crosshairs / Concentric Ring -->
    <div 
      class="absolute rounded-full border border-dotted opacity-60 animate-halo-spin"
      :style="{
        width: `${size * 0.7}px`,
        height: `${size * 0.24}px`,
        borderColor: color,
        animationDirection: 'reverse',
        animationDuration: '6s'
      }"
    ></div>
  </div>
</template>
