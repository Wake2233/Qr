// Expo's default config auto-detects the pnpm/turbo monorepo (watchFolders + nodeModulesPaths).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/global.css' });
