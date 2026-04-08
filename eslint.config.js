import js from "@eslint/js";
import globals from "globals";
import n from "eslint-plugin-n";
import promise from "eslint-plugin-promise";
import tseslint from "typescript-eslint";

const maxLinesConfig = ["error", { max: 250, skipBlankLines: true, skipComments: true }];

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "eslint.config.js"]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  promise.configs["flat/recommended"],
  n.configs["flat/recommended"],
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "complexity": ["error", 30],
      "max-depth": ["error", 3],
      "max-lines": maxLinesConfig,
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "n/hashbang": "off",
      "n/no-process-exit": "off",
      "no-console": "error",
      "n/no-missing-import": "off",
      "n/no-unsupported-features/node-builtins": "off"
    }
  },
  {
    files: ["src/commands/**/*.ts"],
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    files: ["src/db/**/*.ts"],
    rules: {
      "max-lines": maxLinesConfig
    }
  },
  {
    files: ["src/services/**/*.ts", "src/youtube/**/*.ts", "src/articles/**/*.ts"],
    rules: {
      "max-lines": maxLinesConfig
    }
  },
  {
    files: ["src/utils/**/*.ts", "src/types/**/*.ts"],
    rules: {
      "max-lines": ["error", { max: 150, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }]
    }
  }
);
