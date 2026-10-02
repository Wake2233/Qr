/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset'), require('@cp/design-tokens/nativewind').default],
  plugins: [],
};
