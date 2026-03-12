import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Hierarchy colors for categories (depth-based backgrounds) - more distinct
    'bg-slate-200',
    'bg-blue-300',
    'bg-indigo-300',
    'bg-purple-300',
    'dark:bg-zinc-800',
    'dark:bg-blue-800',
    'dark:bg-indigo-800',
    'dark:bg-purple-800',
    // Hover states
    'hover:bg-slate-300',
    'hover:bg-blue-400',
    'hover:bg-indigo-400',
    'hover:bg-purple-400',
    'dark:hover:bg-zinc-700',
    'dark:hover:bg-blue-700',
    'dark:hover:bg-indigo-700',
    'dark:hover:bg-purple-700',
    // Category color accents (used dynamically via categoryColors.ts)
    'border-l-cyan-500', 'bg-cyan-50', 'bg-cyan-600', 'dark:bg-cyan-950/30',
    'border-l-violet-500', 'bg-violet-50', 'bg-violet-600', 'dark:bg-violet-950/30',
    'border-l-pink-500', 'bg-pink-50', 'bg-pink-600', 'dark:bg-pink-950/30',
    'border-l-amber-500', 'bg-amber-50', 'bg-amber-600', 'dark:bg-amber-950/30',
    'border-l-emerald-500', 'bg-emerald-50', 'bg-emerald-600', 'dark:bg-emerald-950/30',
    'border-l-rose-500', 'bg-rose-50', 'bg-rose-600', 'dark:bg-rose-950/30',
    'border-l-blue-500', 'bg-blue-50', 'bg-blue-600', 'dark:bg-blue-950/30',
    'border-l-slate-400', 'bg-slate-50', 'bg-slate-600', 'dark:bg-slate-900/30',
  ],
  darkMode: 'class',
} satisfies Config
