/**
 * Configuration dynamique : reprend app.json et, pour une publication du site
 * de démonstration dans un sous-dossier (GitHub Pages), fixe le chemin de base.
 *   EXPO_BASE_URL=/suivi-voeux-demo npx expo export --platform web
 */
module.exports = ({ config }) => {
  const base = process.env.EXPO_BASE_URL;
  return base ? { ...config, experiments: { ...(config.experiments ?? {}), baseUrl: base } } : config;
};
