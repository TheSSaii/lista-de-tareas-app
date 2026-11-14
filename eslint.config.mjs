import expo from "eslint-config-expo/flat.js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  expo,
  {
    ignores: [
      "dist/*",
      "coverage/*",
      ".expo/*",
      "node_modules/*",
      "android/*",
      "ios/*",
      "ia/**",
      ".opencode/**",
      ".husky/**",
    ],
  },
  {
    rules: {
      complexity: ["error", 10],
      "max-lines-per-function": ["error", 50],
      "max-depth": ["error", 3],
      "no-console": "error",
      eqeqeq: "error",
    },
  },
]);
