import { createDefaultPreset } from "ts-jest";

const tsJestTransformConfig = createDefaultPreset().transform;

export default {
  testEnvironment: "jsdom",
  transform: {
    ...tsJestTransformConfig,
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};