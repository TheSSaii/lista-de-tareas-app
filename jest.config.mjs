export default {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/ia/", "/.expo/"],
  collectCoverageFrom: ["src/services/**/*.{ts,tsx}"],
  coverageThreshold: {
    "./src/services/": { lines: 80, functions: 80, branches: 80, statements: 80 },
  },
};
