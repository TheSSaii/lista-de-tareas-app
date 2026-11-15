export default {
  preset: "jest-expo",
  moduleNameMapper: {
    "\\.css$": "<rootDir>/src/testing/estilo-falso.ts",
  },
  resolver: "react-native-reanimated/jest/resolver",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/ia/", "/.expo/"],
  collectCoverageFrom: [
    "src/services/**/*.{ts,tsx}",
    "src/db/**/*.ts",
    "src/repositories/**/*.ts",
    "src/sensors/**/*.ts",
  ],
  coverageThreshold: {
    "./src/services/": { lines: 80, functions: 80, branches: 80, statements: 80 },
    "./src/db/": { lines: 80, functions: 80, branches: 80, statements: 80 },
    "./src/repositories/": { lines: 80, functions: 80, branches: 80, statements: 80 },
    "./src/sensors/": { lines: 80, functions: 80, branches: 80, statements: 80 },
  },
};
