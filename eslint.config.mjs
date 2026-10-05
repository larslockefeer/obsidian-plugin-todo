import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "main.js",
      "coverage/**",
      ".prettierrc.js",
      "jest.config.js",
      "rollup.config.js",
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
  {
    files: ["**/*.test.ts"],
    languageOptions: {
      globals: {
        beforeEach: "readonly",
        expect: "readonly",
        jest: "readonly",
        test: "readonly",
      },
    },
  },
]);
