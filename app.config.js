/**
 * Thin wrapper around app.json — adds the one thing that has to differ by
 * build: the two iOS Info.plist keys that support local-network Metro
 * discovery for development builds (App Review "should fix" #4 — these
 * shipped in every build, including production, when they lived in
 * app.json directly).
 *
 * expo-dev-client's own config plugin does NOT re-inject these keys
 * (checked node_modules/expo-dev-client/plugin/build/ — no
 * NSLocalNetworkUsageDescription/NSBonjourServices anywhere in it), so they
 * can't just be deleted: a local `expo run:ios` / development or preview EAS
 * build still needs them for the local-network permission prompt and Bonjour
 * discovery to work at all.
 *
 * EAS sets EAS_BUILD_PROFILE to the profile name being built
 * (development/preview/production); a local `expo prebuild`/`expo run:ios`
 * leaves it unset. So the default (unset, development, preview) keeps the
 * dev keys — the developer-friendly choice — and only an actual production
 * build strips them.
 */
module.exports = ({ config }) => {
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

  if (isProductionBuild) {
    return config;
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios.infoPlist,
        NSLocalNetworkUsageDescription:
          'Piggy uses your local network to connect to the development server while testing.',
        NSBonjourServices: ['_expo._tcp', '_metro._tcp'],
      },
    },
  };
};
