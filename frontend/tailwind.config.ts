import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          primary: '#E53935',       // Mobile app primary_red
          primaryDark: '#C62828',   // Mobile app primary_red_dark
          crimson: '#880E4F',       // BloodLink signature dark crimson
          cta: '#DC2626',           // Mobile app crimson_cta_primary
          badgeBg: '#FFEBEE',       // Mobile app blood_badge_background
          badgeStroke: '#E53935',
          textPrimary: '#212121',   // Mobile app text_primary
          textSecondary: '#757575', // Mobile app text_secondary
          textHint: '#9E9E9E',      // Mobile app text_hint
          bgLight: '#F5F5F5',       // Mobile app background #F5F5F5
          surface: '#FFFFFF',       // Mobile app surface
          cardBorder: '#E2E8F0',    // Mobile app strokeColor
          cardBloodBg: '#FFF1F2',   // Mobile app crimson_card_blood_bg
          cardBloodStroke: '#FECDD3', // Mobile app crimson_card_blood_stroke
          cardBloodText: '#B91C1C', // Mobile app crimson_card_blood_text
          urgentBg: '#FEF2F2',      // Mobile app crimson_card_urgent_bg
          urgentStroke: '#FECACA',  // Mobile app crimson_card_urgent_stroke
          urgentText: '#B91C1C',    // Mobile app crimson_card_urgent_text
          actionBtnBg: '#F8FAFC',   // Mobile app card_action_btn_bg
          actionBtnStroke: '#E2E8F0', // Mobile app card_action_btn_stroke
          actionBtnIcon: '#334155', // Mobile app card_action_btn_icon
        },
        blood: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#880e4f',
          950: '#4c0519',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
