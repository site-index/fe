import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "scripts/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{jsx,tsx}"],
    ...react.configs.flat["jsx-runtime"],
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      complexity: ["error", 10],
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'ImportDeclaration[source.value="react"] ImportNamespaceSpecifier',
          message:
            'Use named imports from "react" (e.g. import { useState } from "react") instead of import * as React.',
        },
        {
          selector: 'MemberExpression[object.name="React"]',
          message:
            'Use named imports from "react" instead of the React namespace (e.g. useState, not React.useState).',
        },
        {
          selector: 'TSQualifiedName[left.name="React"]',
          message:
            'Use `import type { … } from "react"` instead of React.* type namespaces (e.g. ReactNode, not React.ReactNode).',
        },
      ],
    },
  },
);
