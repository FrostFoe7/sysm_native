// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import tailwind from "eslint-plugin-tailwindcss";

export default defineConfig([
  expoConfig,
  ...tailwind.configs["flat/recommended"],
  {
    ignores: ["dist/*"],
    rules: {
      "tailwindcss/no-custom-classname": "off",
    },
  },
]);
