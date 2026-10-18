const appJson = require('./app.json');

/**
 * app.json plus environment: EAS_PROJECT_ID (from `eas init`) is required for Expo push
 * tokens on real devices; without it the app runs fine and simply skips push registration.
 */
module.exports = () => {
  const config = structuredClone(appJson.expo);
  const projectId = process.env.EAS_PROJECT_ID;
  if (projectId) {
    config.extra = { ...config.extra, eas: { projectId } };
    config.updates = { url: `https://u.expo.dev/${projectId}` };
    config.runtimeVersion = { policy: 'appVersion' };
  }
  return config;
};
