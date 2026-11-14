export default {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/ia/", "/.expo/"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "!**/*.d.ts"],
};
