import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      react: react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
        ...tseslint.configs.recommended.rules,
        ...react.configs.recommended.rules,
        ...reactHooks.configs.recommended.rules,
        "react/react-in-jsx-scope": "off",
        "@typescript-eslint/no-explicit-any": "warn",
    },
    settings: {
        react: {
            version: 'detect'
        }
    }
  },
];