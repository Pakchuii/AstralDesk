<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useSettingStore } from '@/stores/settingStore';

const settingStore = useSettingStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number | null = null;

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  length?: number;
}

const particles: Particle[] = [];
const PARTICLE_COUNT = 32;

const bgConfig = computed(() => settingStore.settings.background);

const bgStyle = computed(() => {
  const bg = bgConfig.value;
  if (!bg.enabled || !bg.url) return {};
  return {
    transform: `translate(${bg.offsetX}px, ${bg.offsetY}px) scale(${bg.scale})`,
    opacity: bg.opacity,
    filter: `blur(${bg.blur}px)`,
  };
});

const getThemeColors = () => {
  const theme = settingStore.settings.theme;
  switch (theme) {
    case 'pink':
      return ['#f472b6', '#fb7185', '#fda4af', '#f43f5e', '#ffffff'];
    case 'gold':
      return ['#f59e0b', '#fbbf24', '#fde68a', '#d97706', '#ffffff'];
    case 'purple':
      return ['#a855f7', '#c084fc', '#e9d5ff', '#38bdf8', '#ffffff'];
    default:
      return ['#38bdf8', '#7dd3fc', '#bae6fd', '#0284c7', '#ffffff'];
  }
};

const initParticles = (width: number, height: number) => {
  particles.length = 0;
  const colors = getThemeColors();
  const theme = settingStore.settings.theme;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1.5,
      speedX: theme === 'pink' ? (Math.random() * 0.8 + 0.3) : (Math.random() - 0.5) * 0.4,
      speedY: theme === 'purple' ? (Math.random() * 2 + 1.5) : (Math.random() * 0.5 + 0.3),
      opacity: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      length: Math.random() * 8 + 4,
    });
  }
};

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const theme = settingStore.settings.theme;

  // Background subtle grid dots
  ctx.fillStyle = theme === 'pink' ? 'rgba(244, 114, 182, 0.04)' : 'rgba(56, 189, 248, 0.03)';
  const gridSize = 36;
  for (let x = 0; x < canvas.width; x += gridSize) {
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // Draw customized themed particles
  particles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.rotation += p.rotSpeed;

    if (p.y > canvas.height + 15) p.y = -15;
    if (p.x > canvas.width + 15) p.x = -15;
    if (p.x < -15) p.x = canvas.width + 15;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.opacity;

    if (theme === 'pink') {
      // Sakura Petal Shape
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.5);
      ctx.bezierCurveTo(p.size, -p.size, p.size * 1.5, p.size, 0, p.size * 2);
      ctx.bezierCurveTo(-p.size * 1.5, p.size, -p.size, -p.size, 0, -p.size * 1.5);
      ctx.fill();
    } else if (theme === 'purple') {
      // Cyber Rain Line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, p.length || 10);
      ctx.lineWidth = p.size * 0.8;
      ctx.stroke();
    } else if (theme === 'gold') {
      // Star Rail Star Dust (4-pointed star)
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 2);
      ctx.lineTo(p.size * 0.6, -p.size * 0.6);
      ctx.lineTo(p.size * 2, 0);
      ctx.lineTo(p.size * 0.6, p.size * 0.6);
      ctx.lineTo(0, p.size * 2);
      ctx.lineTo(-p.size * 0.6, p.size * 0.6);
      ctx.lineTo(-p.size * 2, 0);
      ctx.lineTo(-p.size * 0.6, -p.size * 0.6);
      ctx.closePath();
      ctx.fill();
    } else {
      // Blue Archive Tactical Diamond
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.6);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(0, p.size * 1.6);
      ctx.lineTo(-p.size, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  });
};

let lastRenderTime = 0;
const FPS_INTERVAL = 1000 / 30; // Cap particle rendering to 30 FPS for ultra-low GPU/CPU overhead

const throttledRender = (currentTime: number) => {
  if (document.hidden) {
    animationFrameId = requestAnimationFrame(throttledRender);
    return;
  }
  const delta = currentTime - lastRenderTime;
  if (delta > FPS_INTERVAL) {
    lastRenderTime = currentTime - (delta % FPS_INTERVAL);
    render();
  }
  animationFrameId = requestAnimationFrame(throttledRender);
};

const handleResize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles(canvas.width, canvas.height);
};

watch(() => settingStore.settings.theme, () => {
  const canvas = canvasRef.value;
  if (canvas) initParticles(canvas.width, canvas.height);
});

const handleVisibilityChange = () => {
  if (!document.hidden && !animationFrameId) {
    animationFrameId = requestAnimationFrame(throttledRender);
  }
};

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  animationFrameId = requestAnimationFrame(throttledRender);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
});
</script>

<template>
  <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
    <!-- 1. Custom User Wallpaper Background (Video or Image) -->
    <div 
      v-if="bgConfig.enabled && bgConfig.url"
      class="absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-200 pointer-events-none overflow-hidden"
      :style="bgStyle"
    >
      <video 
        v-if="bgConfig.type === 'video'"
        :src="bgConfig.url"
        autoplay
        loop
        muted
        playsinline
        :class="[
          bgConfig.fit === 'cover' ? 'w-full h-full object-cover' : 
          bgConfig.fit === 'fill' ? 'w-full h-full object-fill' : 
          bgConfig.fit === 'original' ? 'max-w-none' : 
          'w-full h-full object-contain'
        ]"
      ></video>
      <img 
        v-else
        :src="bgConfig.url"
        alt="Custom Wallpaper"
        :class="[
          bgConfig.fit === 'cover' ? 'w-full h-full object-cover' : 
          bgConfig.fit === 'fill' ? 'w-full h-full object-fill' : 
          bgConfig.fit === 'original' ? 'max-w-none' : 
          'w-full h-full object-contain'
        ]"
      />
    </div>

    <!-- 2. Themed Floating Particles -->
    <canvas 
      ref="canvasRef" 
      class="absolute inset-0 h-full w-full opacity-70"
    ></canvas>
  </div>
</template>
