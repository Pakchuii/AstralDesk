import { MoodType } from '@/types';

/**
 * High-definition Anime Character Vector Avatars
 * Supports 6 mood states with tactical halo and glow effects
 */
export const AVATAR_SVGS: Record<MoodType, string> = {
  normal: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <defs>
      <linearGradient id="bg_norm" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.1"/>
      </linearGradient>
      <linearGradient id="hair_grad" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#7dd3fc"/>
        <stop offset="60%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <!-- Tactical Halo Ring -->
    <ellipse cx="60" cy="22" rx="42" ry="12" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6 4" class="animate-halo-spin origin-center"/>
    <!-- Background glow circle -->
    <circle cx="60" cy="62" r="50" fill="url(#bg_norm)" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.4"/>
    <!-- Back Hair -->
    <path d="M26 50 C20 85, 25 110, 32 115 C38 115, 42 90, 42 75 Z" fill="#0284c7"/>
    <path d="M94 50 C100 85, 95 110, 88 115 C82 115, 78 90, 78 75 Z" fill="#0284c7"/>
    <!-- Cat Ears / Headset -->
    <polygon points="34,42 22,20 48,32" fill="#38bdf8" stroke="#7dd3fc" stroke-width="2"/>
    <polygon points="36,40 28,26 44,34" fill="#f472b6"/>
    <polygon points="86,42 98,20 72,32" fill="#38bdf8" stroke="#7dd3fc" stroke-width="2"/>
    <polygon points="84,40 92,26 76,34" fill="#f472b6"/>
    <!-- Face Contour -->
    <path d="M38 52 C38 78, 48 95, 60 95 C72 95, 82 78, 82 52 C82 38, 72 32, 60 32 C48 32, 38 38, 38 52 Z" fill="#ffedd5"/>
    <!-- Front Hair Bangs -->
    <path d="M34 46 C45 36, 75 36, 86 46 C80 62, 70 54, 60 62 C50 54, 40 62, 34 46 Z" fill="url(#hair_grad)"/>
    <!-- Eyes -->
    <ellipse cx="48" cy="65" rx="5.5" ry="7.5" fill="#0369a1"/>
    <ellipse cx="72" cy="65" rx="5.5" ry="7.5" fill="#0369a1"/>
    <circle cx="46.5" cy="63" r="2.2" fill="#ffffff"/>
    <circle cx="70.5" cy="63" r="2.2" fill="#ffffff"/>
    <!-- Blush -->
    <ellipse cx="42" cy="74" rx="4" ry="2" fill="#f472b6" fill-opacity="0.45"/>
    <ellipse cx="78" cy="74" rx="4" ry="2" fill="#f472b6" fill-opacity="0.45"/>
    <!-- Calm Mouth -->
    <path d="M57 78 Q60 80 63 78" stroke="#db2777" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  happy: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <defs>
      <linearGradient id="bg_happy" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f472b6" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="hair_happy" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#bae6fd"/>
        <stop offset="60%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <!-- Tactical Halo Ring with Pulsing Sparkles -->
    <ellipse cx="60" cy="20" rx="45" ry="13" stroke="#f472b6" stroke-width="3" stroke-dasharray="8 3" class="animate-halo-spin origin-center"/>
    <!-- Sparkle icons -->
    <polygon points="18,30 22,28 26,30 24,34" fill="#facc15"/>
    <polygon points="102,28 105,25 108,28 106,32" fill="#facc15"/>
    <!-- Background circle -->
    <circle cx="60" cy="62" r="50" fill="url(#bg_happy)" stroke="#f472b6" stroke-width="1.8" stroke-opacity="0.5"/>
    <!-- Ears -->
    <polygon points="34,42 20,18 48,32" fill="#38bdf8" stroke="#7dd3fc" stroke-width="2"/>
    <polygon points="36,40 26,24 44,34" fill="#f472b6"/>
    <polygon points="86,42 100,18 72,32" fill="#38bdf8" stroke="#7dd3fc" stroke-width="2"/>
    <polygon points="84,40 94,24 76,34" fill="#f472b6"/>
    <!-- Face -->
    <path d="M38 52 C38 78, 48 95, 60 95 C72 95, 82 78, 82 52 C82 38, 72 32, 60 32 C48 32, 38 38, 38 52 Z" fill="#ffedd5"/>
    <!-- Front Hair -->
    <path d="M34 46 C45 36, 75 36, 86 46 C80 62, 70 54, 60 62 C50 54, 40 62, 34 46 Z" fill="url(#hair_happy)"/>
    <!-- Smiling Arc Eyes (^_^) -->
    <path d="M43 66 Q48 58 54 66" stroke="#0369a1" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M66 66 Q72 58 77 66" stroke="#0369a1" stroke-width="2.8" stroke-linecap="round"/>
    <!-- Bright Blush -->
    <ellipse cx="40" cy="73" rx="5" ry="3" fill="#f43f5e" fill-opacity="0.6"/>
    <ellipse cx="80" cy="73" rx="5" ry="3" fill="#f43f5e" fill-opacity="0.6"/>
    <!-- Open Happy Mouth :D -->
    <path d="M54 77 Q60 86 66 77 Z" fill="#e11d48"/>
  </svg>`,

  thinking: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <defs>
      <linearGradient id="bg_think" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.2"/>
      </linearGradient>
    </defs>
    <!-- Tactical Halo Ring Concentric -->
    <ellipse cx="60" cy="22" rx="42" ry="12" stroke="#a855f7" stroke-width="2" stroke-dasharray="4 2"/>
    <ellipse cx="60" cy="22" rx="36" ry="10" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="8 6" class="animate-halo-spin origin-center"/>
    <!-- Thought sparkles -->
    <circle cx="88" cy="38" r="3.5" fill="#c084fc" class="animate-ping"/>
    <circle cx="96" cy="28" r="2.5" fill="#38bdf8"/>
    <!-- Background circle -->
    <circle cx="60" cy="62" r="50" fill="url(#bg_think)" stroke="#a855f7" stroke-width="1.5" stroke-opacity="0.4"/>
    <!-- Ears -->
    <polygon points="34,42 22,20 48,32" fill="#38bdf8"/>
    <polygon points="86,42 98,20 72,32" fill="#38bdf8"/>
    <!-- Face -->
    <path d="M38 52 C38 78, 48 95, 60 95 C72 95, 82 78, 82 52 C82 38, 72 32, 60 32 C48 32, 38 38, 38 52 Z" fill="#ffedd5"/>
    <!-- Hair -->
    <path d="M34 46 C45 36, 75 36, 86 46 C80 62, 70 54, 60 62 C50 54, 40 62, 34 46 Z" fill="#38bdf8"/>
    <!-- Left Eye looking up, Right Eye closed in thought -->
    <ellipse cx="48" cy="62" rx="5" ry="6.5" fill="#0369a1"/>
    <circle cx="47" cy="59" r="2" fill="#ffffff"/>
    <path d="M68 64 Q73 60 77 64" stroke="#0369a1" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Mouth small 'o' -->
    <circle cx="60" cy="79" r="2.8" fill="#e11d48"/>
  </svg>`,

  surprised: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <!-- Halo with exclamation -->
    <ellipse cx="60" cy="20" rx="44" ry="12" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="10 5" class="animate-halo-spin origin-center"/>
    <text x="88" y="32" fill="#f59e0b" font-size="18" font-weight="bold">!?</text>
    <circle cx="60" cy="62" r="50" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="1.8"/>
    <polygon points="34,42 20,18 48,32" fill="#38bdf8"/>
    <polygon points="86,42 100,18 72,32" fill="#38bdf8"/>
    <path d="M38 52 C38 78, 48 95, 60 95 C72 95, 82 78, 82 52 C82 38, 72 32, 60 32 C48 32, 38 38, 38 52 Z" fill="#ffedd5"/>
    <path d="M34 46 C45 36, 75 36, 86 46 C80 62, 70 54, 60 62 C50 54, 40 62, 34 46 Z" fill="#38bdf8"/>
    <!-- Big Wide Eyes -->
    <ellipse cx="48" cy="64" rx="7" ry="9" fill="#0369a1"/>
    <ellipse cx="72" cy="64" rx="7" ry="9" fill="#0369a1"/>
    <circle cx="47" cy="60" r="3.2" fill="#ffffff"/>
    <circle cx="71" cy="60" r="3.2" fill="#ffffff"/>
    <!-- Wide Open O mouth -->
    <ellipse cx="60" cy="80" rx="4.5" ry="6" fill="#e11d48"/>
  </svg>`,

  shy: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <ellipse cx="60" cy="22" rx="42" ry="12" stroke="#f472b6" stroke-width="2"/>
    <circle cx="60" cy="62" r="50" fill="#f472b6" fill-opacity="0.18" stroke="#f472b6" stroke-width="1.5"/>
    <polygon points="34,42 22,20 48,32" fill="#38bdf8"/>
    <polygon points="86,42 98,20 72,32" fill="#38bdf8"/>
    <path d="M38 52 C38 78, 48 95, 60 95 C72 95, 82 78, 82 52 C82 38, 72 32, 60 32 C48 32, 38 38, 38 52 Z" fill="#ffedd5"/>
    <path d="M34 46 C45 36, 75 36, 86 46 C80 62, 70 54, 60 62 C50 54, 40 62, 34 46 Z" fill="#38bdf8"/>
    <!-- Downward Shy Eyes -->
    <ellipse cx="48" cy="67" rx="5" ry="6" fill="#0369a1"/>
    <ellipse cx="72" cy="67" rx="5" ry="6" fill="#0369a1"/>
    <circle cx="47" cy="65" r="1.8" fill="#ffffff"/>
    <circle cx="71" cy="65" r="1.8" fill="#ffffff"/>
    <!-- Strong Blush Lines -->
    <path d="M37 72 L45 76 M40 70 L48 74" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M75 74 L83 70 M78 76 L86 72" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Shy Wavy Mouth -->
    <path d="M56 79 Q60 82 64 79" stroke="#e11d48" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  pout: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <ellipse cx="60" cy="22" rx="42" ry="12" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6 3"/>
    <circle cx="60" cy="62" r="50" fill="#38bdf8" fill-opacity="0.15" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="34,42 22,20 48,32" fill="#38bdf8"/>
    <polygon points="86,42 98,20 72,32" fill="#38bdf8"/>
    <!-- Puffed Face -->
    <path d="M36 52 C36 80, 46 95, 60 95 C74 95, 84 80, 84 52 C84 38, 72 32, 60 32 C48 32, 36 38, 36 52 Z" fill="#ffedd5"/>
    <path d="M34 46 C45 36, 75 36, 86 46 C80 62, 70 54, 60 62 C50 54, 40 62, 34 46 Z" fill="#38bdf8"/>
    <!-- Side-glance Pout Eyes -->
    <ellipse cx="50" cy="65" rx="5.5" ry="6.5" fill="#0369a1"/>
    <ellipse cx="74" cy="65" rx="5.5" ry="6.5" fill="#0369a1"/>
    <circle cx="52" cy="63" r="2.2" fill="#ffffff"/>
    <circle cx="76" cy="63" r="2.2" fill="#ffffff"/>
    <!-- Pout Cheeks & Mouth -->
    <ellipse cx="37" cy="74" rx="4" ry="2.5" fill="#f43f5e" fill-opacity="0.5"/>
    <ellipse cx="83" cy="74" rx="4" ry="2.5" fill="#f43f5e" fill-opacity="0.5"/>
    <path d="M57 80 Q60 76 63 80" stroke="#e11d48" stroke-width="2" stroke-linecap="round"/>
  </svg>`
};
