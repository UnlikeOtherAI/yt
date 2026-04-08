import js from "@eslint/js";
import globals from "globals";
import importX from "eslint-plugin-import-x";
import n from "eslint-plugin-n";
import promise from "eslint-plugin-promise";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

const maxLinesConfig = ["error", { max: 250, skipBlankLines: true, skipComments: true }];

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  promise.configs["flat/recommended"],
  n.configs["flat/recommended"],
  unicorn.configs["flat/recommended"],
  sonarjs.configs.recommended,
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
      "complexity": ["error", 10],
      "import-x/no-default-export": "error",
      "import-x/no-cycle": "error",
      "max-depth": ["error", 3],
      "max-lines": maxLinesConfig,
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "n/no-process-exit": "off",
      "no-console": "error",
      "sonarjs/todo-tag": "error",
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": [
        "error",
        {
          allowList: {
            args: true,
            env: true,
            params: true
          }
        }
      ]
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
