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
  ],
  darkMode: 'class',
} satisfies Config
