export default {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/ia/", "/.expo/"],
  collectCoverageFrom: ["src/services/**/*.{ts,tsx}", "src/db/**/*.ts", "src/repositories/**/*.ts"],
  coverageThreshold: {
    "./src/services/": { lines: 80, functions: 80, branches: 80, statements: 80 },
    "./src/db/": { lines: 80, functions: 80, branches: 80, statements: 80 },
    "./src/repositories/": { lines: 80, functions: 80, branches: 80, statements: 80 },
  },
};
