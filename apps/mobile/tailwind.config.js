/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset'), require('@cp/design-tokens/nativewind').default],
  theme: {
    extend: {
      // Family per weight: the names expo-font registers in src/lib/fonts.ts.
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        display: ['Sora_600SemiBold'],
        'display-bold': ['Sora_700Bold'],
      },
    },
  },
  plugins: [],
};
