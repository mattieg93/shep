export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        'shep-indigo': {
          50: '#E8E6F7',
          100: '#D1CEEF',
          600: '#312E81',
          700: '#2A1F6B',
        },
        'shep-cyan': {
          50: '#E0F7FF',
          100: '#B3F0FF',
          400: '#38BDF8',
        },
        'shep-surface': {
          light: '#EEF2FF',
          white: '#FFFFFF',
        },
        'shep-text': {
          primary: '#0B1120',
          muted: '#6B7280',
        },
      },
    },
  },
  plugins: [],
}
