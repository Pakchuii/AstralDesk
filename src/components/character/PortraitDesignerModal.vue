<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingStore } from '@/stores/settingStore';
import { PortraitConfig, InteractiveTouchAction } from '@/types';
import CharacterPortrait from '@/components/character/CharacterPortrait.vue';
import { 
  X, 
  Upload, 
  Sparkles, 
  Sliders, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Film, 
  Check, 
  Layers, 
  Palette,
  Volume2,
  Heart,
  MessageSquare,
  ZoomIn,
  Crop,
  UserCheck
} from 'lucide-vue-next';
import { soundFx } from '@/services/audioSynthesizer';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const settingStore = useSettingStore();

const localConfig = ref<PortraitConfig>(JSON.parse(JSON.stringify(settingStore.settings.portrait)));
if (localConfig.value.viewportScale === undefined) {
  localConfig.value.viewportScale = 1.0;
}
if (localConfig.value.viewportMode === undefined) {
  localConfig.value.viewportMode = 'full';
}
if (localConfig.value.viewportHeight === undefined) {
  localConfig.value.viewportHeight = 420;
}

const baseFileInputRef = ref<HTMLInputElement | null>(null);
const actionFileInputRef = ref<HTMLInputElement | null>(null);
const currentActionUploadId = ref<string | null>(null);

const glowColors = [
  { name: '蔚蓝冰晶', color: '#38bdf8' },
  { name: '樱花粉紫', color: '#ec4899' },
  { name: '璀璨星金', color: '#fbbf24' },
  { name: '赛博霓虹', color: '#a855f7' },
  { name: '极光翡翠', color: '#10b981' },
];

const applyFramingPreset = (mode: 'full' | 'half' | 'bust') => {
  localConfig.value.viewportMode = mode;
  if (mode === 'full') {
    localConfig.value.viewportScale = 1.0;
    localConfig.value.offsetY = 0;
  } else if (mode === 'half') {
    localConfig.value.viewportScale = 1.65;
    localConfig.value.offsetY = 50;
  } else if (mode === 'bust') {
    localConfig.value.viewportScale = 2.3;
    localConfig.value.offsetY = 120;
  }
  soundFx.playCrystalChime();
};

const handleBaseUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const isVideo = file.type.includes('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
  localConfig.value.type = isVideo ? 'video' : 'webp';

  const reader = new FileReader();
  reader.onload = async (event) => {
    let result = event.target?.result as string;
    if (result) {
      if (window.electronAPI?.saveMediaAsset) {
        result = await window.electronAPI.saveMediaAsset(file.name, result);
      }
      localConfig.value.url = result;
      soundFx.playCrystalChime();
    }
  };
  reader.readAsDataURL(file);
};

const handleActionUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !currentActionUploadId.value) return;

  const isVideo = file.type.includes('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');

  const act = localConfig.value.actions.find(a => a.id === currentActionUploadId.value);
  if (!act) return;

  act.assetType = isVideo ? 'video' : 'webp';
  if (isVideo && act.autoReturnOnEnded === undefined) {
    act.autoReturnOnEnded = true;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    let result = event.target?.result as string;
    if (result) {
      if (window.electronAPI?.saveMediaAsset) {
        result = await window.electronAPI.saveMediaAsset(file.name, result);
      }
      act.assetUrl = result;
      soundFx.playCrystalChime();
    }
  };
  reader.readAsDataURL(file);
};

const triggerActionUpload = (actionId: string) => {
  currentActionUploadId.value = actionId;
  actionFileInputRef.value?.click();
  soundFx.playTypewriterClick();
};

const addNewAction = () => {
  const count = localConfig.value.actions.length + 1;
  const newAct: InteractiveTouchAction = {
    id: 'act_' + Date.now(),
    name: count === 1 ? '摸摸头反应' : count === 2 ? '戳戳身体反应' : `触碰动作 ${count}`,
    triggerZone: count === 1 ? 'head' : 'body',
    assetUrl: '',
    assetType: 'webp',
    returnPolicy: 'auto',
    autoReturnOnEnded: true,
    durationSec: 3,
    reactionText: count === 1 ? '(*/ω＼*) 摸摸头~' : '(*^▽^*) 戳戳~',
    soundEffect: 'chime',
    effectType: count === 1 ? 'hearts' : 'sparkles',
  };
  localConfig.value.actions.push(newAct);
  soundFx.playTypewriterClick();
};

const removeAction = (id: string) => {
  localConfig.value.actions = localConfig.value.actions.filter(a => a.id !== id);
  soundFx.playTypewriterClick();
};

const resetToDefault = () => {
  localConfig.value = {
    type: 'svg',
    url: '',
    actions: [],
    scale: 1,
    viewportScale: 1,
    viewportMode: 'full',
    offsetX: 0,
    offsetY: 0,
    opacity: 1,
    glowColor: '#38bdf8',
    glowIntensity: 0.35,
    enableBreathing: true,
  };
  soundFx.playTypewriterClick();
};

const handleSave = () => {
  settingStore.settings.portrait = JSON.parse(JSON.stringify(localConfig.value));
  settingStore.save();
  soundFx.playCrystalChime();
  emit('close');
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
    <div class="w-full max-w-4xl rounded-2xl glass-panel border border-cyan-500/30 overflow-hidden shadow-[0_0_40px_rgba(56,189,248,0.3)] flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/80">
        <div class="flex items-center gap-2 text-cyan-300 font-medium text-xs md:text-sm">
          <Palette class="w-4 h-4" />
          <span class="font-mono tracking-wider">立绘交互设计工坊 (INTERACTIVE PORTRAIT STUDIO)</span>
        </div>
        <button 
          class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Hidden inputs for file upload -->
      <input 
        ref="baseFileInputRef" 
        type="file" 
        accept=".webp,.gif,.png,.jpg,.jpeg,.webm,.mp4" 
        class="hidden"
        @change="handleBaseUpload"
      />
      <input 
        ref="actionFileInputRef" 
        type="file" 
        accept=".webp,.gif,.png,.jpg,.jpeg,.webm,.mp4" 
        class="hidden"
        @change="handleActionUpload"
      />

      <!-- Body: Left Preview + Right Controls -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left: Real-time Live Sandbox Preview -->
        <div class="w-1/2 p-6 flex flex-col items-center justify-center border-r border-cyan-500/15 relative overflow-hidden bg-gradient-to-b from-slate-950/80 to-slate-900/60">
          <div class="absolute top-3 left-3 text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 z-10 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/20">
            <Sparkles class="w-3.5 h-3.5" />
            <span>实时沙盒 (支持点击互动测试)</span>
          </div>

          <div class="w-full h-[400px] flex items-center justify-center relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/40">
            <CharacterPortrait 
              :config="localConfig" 
              :interactive="true"
            />
          </div>

          <div class="text-[10px] text-slate-400 mt-2 text-center">
            点击人物头部（摸头）或身体（戳戳）可即刻预览动作切换与台词效果
          </div>
        </div>

        <!-- Right: Configurations List -->
        <div class="w-1/2 p-5 overflow-y-auto space-y-4 text-xs">
          <!-- Section 1: Default Idle Portrait -->
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div class="flex items-center justify-between text-slate-300 font-medium">
              <span class="flex items-center gap-1.5">
                <Layers class="w-3.5 h-3.5 text-cyan-400" />
                默认待机立绘 (常驻动画 / 视频)
              </span>
              <span class="text-[10px] font-mono text-cyan-400">
                {{ localConfig.url ? (localConfig.type === 'video' ? '视频待机' : 'WebP/图片') : '内置矢量' }}
              </span>
            </div>

            <div class="flex gap-2">
              <button 
                class="flex-1 py-2 px-3 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 font-medium flex items-center justify-center gap-1.5 transition-all"
                @click="baseFileInputRef?.click()"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>{{ localConfig.url ? '更换待机素材 (WebP / MP4)' : '导入待机素材 (WebP / MP4)' }}</span>
              </button>

              <button 
                v-if="localConfig.url"
                class="px-3 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors"
                title="恢复默认矢量"
                @click="localConfig.url = ''; localConfig.type = 'svg'"
              >
                <RotateCcw class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Section 2: Dual-Layer Scale & Viewport Framing Manager -->
          <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between text-slate-200 font-medium">
              <span class="flex items-center gap-1.5">
                <Crop class="w-3.5 h-3.5 text-cyan-400" />
                <span>双层缩放与取景构图控制</span>
              </span>
              <button 
                class="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1"
                @click="resetToDefault"
              >
                <RotateCcw class="w-3 h-3" />
                <span>恢复默认</span>
              </button>
            </div>

            <!-- Quick Framing Presets (Full Body, Half Body, Bust Close-up) -->
            <div class="space-y-1.5">
              <label class="block text-[11px] text-slate-400">快速构图预设（全身 / 半身 / 特写）</label>
              <div class="grid grid-cols-3 gap-2 text-[10px]">
                <button 
                  class="py-1.5 px-2 rounded-lg border font-medium transition-all text-center"
                  :class="localConfig.viewportMode === 'full' ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'"
                  @click="applyFramingPreset('full')"
                >
                  🧍 【全身立牌】
                </button>
                <button 
                  class="py-1.5 px-2 rounded-lg border font-medium transition-all text-center"
                  :class="localConfig.viewportMode === 'half' ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'"
                  @click="applyFramingPreset('half')"
                >
                  👗 【半身互动】
                </button>
                <button 
                  class="py-1.5 px-2 rounded-lg border font-medium transition-all text-center"
                  :class="localConfig.viewportMode === 'bust' ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'"
                  @click="applyFramingPreset('bust')"
                >
                  🌸 【胸像特写】
                </button>
              </div>
            </div>

            <!-- Two Independent Scale Sliders -->
            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-[11px]">
              <!-- Slider 1: Base Asset Scale -->
              <div class="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                <div class="flex justify-between text-slate-300 mb-1 font-medium items-center">
                  <span>① 立绘基准缩放 (Asset)</span>
                  <div class="flex items-center gap-1">
                    <input 
                      v-model.number="localConfig.scale" 
                      type="number" 
                      step="0.05"
                      min="0.05"
                      max="10.0"
                      class="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px] font-mono text-center outline-none"
                    />
                    <span class="text-slate-500 font-mono">x</span>
                  </div>
                </div>
                <input 
                  v-model.number="localConfig.scale" 
                  type="range" 
                  min="0.1" 
                  max="10.0" 
                  step="0.05"
                  class="w-full accent-cyan-400 mt-1"
                />
                <div class="text-[9px] text-slate-500 mt-1">调节人物素材本身的物理标准体型大小 (0.1x ~ 10.0x)</div>
              </div>

              <!-- Slider 2: Viewport Framing Range Scale -->
              <div class="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                <div class="flex justify-between text-slate-300 mb-1 font-medium items-center">
                  <span>② 视口取景缩放 (Range)</span>
                  <div class="flex items-center gap-1">
                    <input 
                      v-model.number="localConfig.viewportScale" 
                      type="number" 
                      step="0.05"
                      min="0.05"
                      max="8.0"
                      class="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-pink-300 text-[10px] font-mono text-center outline-none"
                      @input="localConfig.viewportMode = 'custom'"
                    />
                    <span class="text-slate-500 font-mono">x</span>
                  </div>
                </div>
                <input 
                  v-model.number="localConfig.viewportScale" 
                  type="range" 
                  min="0.1" 
                  max="8.0" 
                  step="0.05"
                  class="w-full accent-pink-400 mt-1"
                  @input="localConfig.viewportMode = 'custom'"
                />
                <div class="text-[9px] text-slate-500 mt-1">调节在窗口画框范围内的局部特写放大 (0.1x ~ 8.0x)</div>
              </div>

              <!-- Offset Sliders -->
              <div>
                <div class="flex justify-between text-slate-400 mb-1 items-center">
                  <span>水平 X 偏移</span>
                  <div class="flex items-center gap-1">
                    <input 
                      v-model.number="localConfig.offsetX" 
                      type="number" 
                      class="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px] font-mono text-center outline-none"
                    />
                    <span class="text-slate-500 font-mono">px</span>
                  </div>
                </div>
                <input 
                  v-model.number="localConfig.offsetX" 
                  type="range" 
                  min="-1200" 
                  max="1200" 
                  step="2"
                  class="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-1 items-center">
                  <span>垂直 Y 偏移</span>
                  <div class="flex items-center gap-1">
                    <input 
                      v-model.number="localConfig.offsetY" 
                      type="number" 
                      class="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px] font-mono text-center outline-none"
                    />
                    <span class="text-slate-500 font-mono">px</span>
                  </div>
                </div>
                <input 
                  v-model.number="localConfig.offsetY" 
                  type="range" 
                  min="-1200" 
                  max="1200" 
                  step="2"
                  class="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-1 items-center">
                  <span>立绘占用空间高度 (Space)</span>
                  <div class="flex items-center gap-1">
                    <input 
                      v-model.number="localConfig.viewportHeight" 
                      type="number" 
                      class="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px] font-mono text-center outline-none"
                    />
                    <span class="text-slate-500 font-mono">px</span>
                  </div>
                </div>
                <input 
                  v-model.number="localConfig.viewportHeight" 
                  type="range" 
                  min="200" 
                  max="1400" 
                  step="10"
                  class="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-1">
                  <span>发光度 (Glow Intensity)</span>
                  <span class="font-mono text-cyan-300">{{ Math.round((localConfig.glowIntensity ?? 0.35) * 100) }}%</span>
                </div>
                <input 
                  v-model.number="localConfig.glowIntensity" 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  class="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-1">
                  <span>立绘透光度 (Opacity)</span>
                  <span class="font-mono text-cyan-300">{{ Math.round(localConfig.opacity * 100) }}%</span>
                </div>
                <input 
                  v-model.number="localConfig.opacity" 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.05"
                  class="w-full accent-cyan-400"
                />
              </div>
            </div>

            <!-- Glow Aura Color -->
            <div class="pt-2 border-t border-slate-800/80">
              <label class="block text-slate-400 text-[11px] mb-1.5">背景光晕光环色</label>
              <div class="flex items-center gap-2">
                <button 
                  v-for="gc in glowColors" 
                  :key="gc.color"
                  class="w-6 h-6 rounded-full border flex items-center justify-center transition-all"
                  :style="{ background: gc.color, borderColor: localConfig.glowColor === gc.color ? '#fff' : 'transparent' }"
                  @click="localConfig.glowColor = gc.color"
                >
                  <Check v-if="localConfig.glowColor === gc.color" class="w-3 h-3 text-white drop-shadow" />
                </button>
              </div>
            </div>

            <!-- Breathing Float Animation Toggle -->
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div class="text-[11px] text-slate-300 font-medium">立绘上下浮动动画 (微动态呼吸效果)</div>
                <div class="text-[9px] text-slate-500">默认已关闭（完全静止平稳），如需微动态起伏可随时开启</div>
              </div>
              <input 
                type="checkbox" 
                v-model="localConfig.enableBreathing" 
                class="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          <!-- Section 3: Interactive Touch Action Slots -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-medium text-slate-200 flex items-center gap-1.5">
                <Film class="w-3.5 h-3.5 text-pink-400" />
                <span>触碰互动动作槽位 (摸头 / 戳戳)</span>
              </span>
              <button 
                class="px-2.5 py-1 rounded-lg bg-pink-950/50 hover:bg-pink-900/50 border border-pink-500/30 text-pink-300 font-medium flex items-center gap-1 transition-all text-[11px]"
                @click="addNewAction"
              >
                <Plus class="w-3 h-3" />
                <span>添加互动槽位</span>
              </button>
            </div>

            <!-- Action Slot Cards -->
            <div class="space-y-3">
              <div 
                v-for="(act, idx) in localConfig.actions" 
                :key="act.id"
                class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5"
              >
                <!-- Row 1: Action Name & Trigger Zone -->
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-mono text-[10px] flex items-center justify-center flex-shrink-0">
                    {{ idx + 1 }}
                  </span>
                  <input 
                    v-model="act.name" 
                    type="text" 
                    class="w-28 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-200 text-xs outline-none focus:border-cyan-400"
                    placeholder="动作名称"
                  />
                  <select 
                    v-model="act.triggerZone"
                    class="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-300 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="head">触发部位: 头部 (摸头)</option>
                    <option value="body">触发部位: 身体 (戳戳)</option>
                    <option value="bottom">触发部位: 裙摆/腿部</option>
                    <option value="all">触发部位: 全区域点击</option>
                  </select>
                  <button 
                    class="ml-auto p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="删除动作"
                    @click="removeAction(act.id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Row 2: Asset Upload Button -->
                <div class="flex items-center gap-2">
                  <button 
                    class="flex-1 py-1.5 px-2.5 rounded-lg border text-left text-xs flex items-center justify-between transition-all"
                    :class="act.assetUrl ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/50 border-dashed border-slate-700 text-slate-400 hover:border-slate-500'"
                    @click="triggerActionUpload(act.id)"
                  >
                    <span class="truncate">{{ act.assetUrl ? `已绑定: ${act.assetType === 'video' ? '视频动画' : 'WebP/图片'}` : '点击导入互动动画素材 (MP4/WebP)' }}</span>
                    <Upload class="w-3 h-3 flex-shrink-0" />
                  </button>
                </div>

                <!-- Row 3: Custom Reaction Text & Sound & Particles -->
                <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
                  <div class="col-span-3">
                    <label class="block text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                      <MessageSquare class="w-3 h-3 text-cyan-400" />
                      <span>自定义触碰反应台词</span>
                    </label>
                    <input 
                      v-model="act.reactionText" 
                      type="text" 
                      class="w-full px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-cyan-200 text-xs outline-none focus:border-cyan-400"
                      placeholder="(*/ω＼*) 摸摸头~"
                    />
                  </div>

                  <div>
                    <label class="block text-[10px] text-slate-400 mb-1">音效</label>
                    <select 
                      v-model="act.soundEffect"
                      class="w-full px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-300 text-[10px] outline-none"
                    >
                      <option value="chime">水晶风铃</option>
                      <option value="click">机械打字音</option>
                      <option value="magic">治愈星芒音</option>
                      <option value="none">静音</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-[10px] text-slate-400 mb-1">漂浮特效</label>
                    <select 
                      v-model="act.effectType"
                      class="w-full px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-300 text-[10px] outline-none"
                    >
                      <option value="hearts">💖 飘动爱心</option>
                      <option value="sakura">🌸 落樱花瓣</option>
                      <option value="sparkles">✨ 璀璨星芒</option>
                      <option value="none">无粒子特效</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-[10px] text-slate-400 mb-1">返回策略</label>
                    <select 
                      v-model="act.returnPolicy"
                      class="w-full px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-300 text-[10px] outline-none"
                    >
                      <option value="auto">自动切回待机</option>
                      <option value="stay">保持动作</option>
                    </select>
                  </div>
                </div>

                <!-- Row 4: Video Auto-return Switch & Duration -->
                <div class="p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1.5 text-[10px]">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-300">如果是视频：播放完毕立即自动切回待机</span>
                    <input 
                      type="checkbox" 
                      v-model="act.autoReturnOnEnded" 
                      class="accent-cyan-400"
                    />
                  </div>

                  <div v-if="!act.autoReturnOnEnded || act.assetType !== 'video'" class="flex items-center justify-between text-slate-400">
                    <span>动图/停留持续时间</span>
                    <div class="flex items-center gap-2">
                      <input 
                        v-model.number="act.durationSec"
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        class="w-24 accent-cyan-400"
                      />
                      <span class="font-mono text-cyan-300">{{ act.durationSec }} 秒</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 border-t border-cyan-500/20 bg-slate-950/90 flex justify-end gap-2">
        <button 
          class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          @click="emit('close')"
        >
          取消
        </button>
        <button 
          class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all"
          @click="handleSave"
        >
          保存并应用
        </button>
      </div>
    </div>
  </div>
</template>
