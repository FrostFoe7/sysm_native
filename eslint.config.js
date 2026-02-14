// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tailwind = require('eslint-plugin-tailwindcss');

module.exports = defineConfig([
  expoConfig,
  ...tailwind.configs['flat/recommended'],
  {
    ignores: ['dist/*'],
    rules: {
      'tailwindcss/no-custom-classname': 'off', // NativeWind often uses custom classes
    },
  },
]);
