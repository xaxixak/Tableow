import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Hierarchy colors for categories (depth-based backgrounds)
    'bg-slate-50',
    'bg-blue-50',
    'bg-indigo-50',
    'bg-purple-50',
    'dark:bg-zinc-800',
    'dark:bg-blue-900/30',
    'dark:bg-indigo-900/30',
    'dark:bg-purple-900/30',
    // Hover states
    'hover:bg-slate-100',
    'hover:bg-blue-100',
    'hover:bg-indigo-100',
    'hover:bg-purple-100',
    'dark:hover:bg-zinc-700',
    'dark:hover:bg-blue-900/50',
    'dark:hover:bg-indigo-900/50',
    'dark:hover:bg-purple-900/50',
  ],
  darkMode: 'class',
} satisfies Config
