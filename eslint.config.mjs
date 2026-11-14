import { defineConfig } from "eslint/config";
import expo from "eslint-config-expo/flat";

export default defineConfig([
  expo,
  { ignores: ["dist/*", "coverage/*", ".expo/*", "ia/logs/*"] },
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