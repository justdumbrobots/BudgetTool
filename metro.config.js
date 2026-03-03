// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Explicitly route react-native-svg to its web entry on the web platform.
// Metro's automatic .web.ts resolution may not traverse node_modules the same
// way it does for project source files, so we force it here to prevent the
// native (C++ bindings) entry from being loaded and crashing on web.
const { resolver } = config;
const defaultResolveRequest = resolver.resolveRequest;
resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-svg') {
    return (defaultResolveRequest ?? context.resolveRequest)(
      context,
      'react-native-svg/src/ReactNativeSVG.web',
      platform,
    );
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = config;
