/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
      },
      colors: {
        // Primary accent (blue) — accents, headings, links
        tulus: {
          50: '#eef3fb', 100: '#d6e3f4', 200: '#aec6e8', 300: '#7ea4d6',
          400: '#5181c0', 500: '#3263a6', 600: '#214e8a', 700: '#1a3d6e',
          800: '#142f54', 900: '#102342', 950: '#0a1830',
        },
        // Text
        ink: { DEFAULT: '#0c111b', soft: '#1b2433', muted: '#5b6675' },
        // Positive green (leaf)
        leaf: {
          50: '#edfaf3', 100: '#d1f2e0', 400: '#34b27b', 500: '#1aa46a',
          600: '#138a58', 700: '#0f6f47',
        },
        // Optional secondary theme (green)
        brand: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        // Theme-aware semantic tokens (switch via CSS variables)
        canvas: 'var(--bg)',
        surface: 'var(--surface)',
        elevated: 'var(--elevated)',
        hairline: 'var(--hairline)',
        glass: 'var(--glass)',
        glassline: 'var(--glass-border)',
        fg: { DEFAULT: 'var(--fg)', muted: 'var(--fg-muted)' },
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          soft: 'var(--accent-soft)',
        },
        pos: 'rgb(var(--pos) / <alpha-value>)',
        neg: 'rgb(var(--neg) / <alpha-value>)',
      },
      maxWidth: {
        content: '72rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.04), 0 10px 28px rgba(0,0,0,.06)',
        glass: '0 8px 30px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)',
      },
    },
  },
  plugins: [],
}
