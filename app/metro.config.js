const { getDefaultConfig } = require('expo/metro-config');

// Expo's default config detects the pnpm workspace (watchFolders + node_modules paths),
// so @tranche/shared resolves from ../shared without extra setup.
const config = getDefaultConfig(__dirname);

module.exports = config;
