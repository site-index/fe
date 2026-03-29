import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import { importX } from 'eslint-plugin-import-x'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        ignores: ['dist', 'dev-dist', 'coverage', '.tsbuild', 'scripts/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ...importX.flatConfigs.recommended,
    },
    {
        files: ['**/*.{ts,tsx}'],
        ...importX.flatConfigs.typescript,
        settings: {
            'import-x/resolver': {
                typescript: {
                    project: ['./tsconfig.app.json', './tsconfig.node.json'],
                    noWarnOnMultipleProjects: true,
                },
                node: true,
            },
        },
    },
    {
        files: ['**/*.{jsx,tsx}'],
        ...react.configs.flat['jsx-runtime'],
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': eslintPluginReactRefresh,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            complexity: ['error', 10],
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'no-restricted-syntax': [
                'error',
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
    {
        files: [
            'src/components/ui/**/*.{ts,tsx}',
            'src/contexts/**/*.{ts,tsx}',
        ],
        rules: {
            // UI primitives export cva variants / helpers with components; contexts export hooks with providers.
            'react-refresh/only-export-components': 'off',
        },
    },
    eslintConfigPrettier
)
