<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSettingStore } from '@/stores/settingStore';
import WorkspaceView from '@/views/WorkspaceView.vue';
import MiniOverlayView from '@/views/MiniOverlayView.vue';

import { proactivePushService } from '@/services/proactivePushService';

const settingStore = useSettingStore();
const currentMode = ref<'main' | 'mini'>('main');

const themeColors: Record<string, { color: string; glow: string; border: string }> = {
  cyan: { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)', border: 'rgba(56, 189, 248, 0.3)' },
  pink: { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', border: 'rgba(244, 63, 94, 0.3)' },
  gold: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', border: 'rgba(245, 158, 11, 0.3)' },
  purple: { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', border: 'rgba(168, 85, 247, 0.3)' },
  emerald: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', border: 'rgba(16, 185, 129, 0.3)' },
};

const activeThemeVars = computed(() => {
  const t = themeColors[settingStore.settings.theme] || themeColors.cyan;
  return {
    '--theme-color': t.color,
    '--theme-glow': t.glow,
    '--glass-border': t.border,
  };
});

const isElectron = computed(() => {
  return typeof window !== 'undefined' && !!window.electronAPI;
});

const switchToMini = () => {
  currentMode.value = 'mini';
  if (window.electronAPI) {
    window.electronAPI.setWindowMode('mini');
  }
};

const switchToWorkspace = () => {
  currentMode.value = 'main';
  if (window.electronAPI) {
    window.electronAPI.setWindowMode('main');
  }
};

onMounted(() => {
  settingStore.applyGlobalFont();
  proactivePushService.start();

  if (window.electronAPI) {
    window.electronAPI.onModeChange?.((mode: 'main' | 'mini') => {
      currentMode.value = mode;
    });
  }
});
</script>

<template>
  <div 
    class="w-screen h-screen overflow-hidden"
    :style="activeThemeVars"
  >
    <WorkspaceView 
      v-if="currentMode === 'main'"
      :is-electron="isElectron"
      @switch-to-mini="switchToMini"
    />
    <MiniOverlayView 
      v-else
      @switch-to-workspace="switchToWorkspace"
    />
  </div>
</template>
