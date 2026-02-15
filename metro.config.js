import { getDefaultConfig } from 'expo/metro-config.js';
import { withNativeWind } from 'nativewind/dist/metro/index.js';

const config = getDefaultConfig(import.meta.dirname);

// Make sure Supabase and other ESM-only deps are transpiled
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

export default withNativeWind(config, { input: './global.css' });
