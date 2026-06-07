const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  assert: path.resolve(__dirname, 'src/lib/empty.js'),
};

module.exports = config;
