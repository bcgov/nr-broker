// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import * as angular from "angular-eslint";
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      stylistic.configs.customize({
        semi: true,
      }),
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      '@stylistic/operator-linebreak': ['error', 'after', { overrides: { '|': 'before', '?': 'before', ':': 'before' } }],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/max-len': ['error', { code: 120, ignoreRegExpLiterals: true, ignoreTrailingComments: true, ignoreTemplateLiterals: true, ignoreStrings: true }],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/lines-between-class-members': [
        'error',
        {
          enforce: [
            { blankLine: 'always', prev: 'method', next: 'method' },
          ],
        },
      ],
      '@stylistic/comma-dangle': ["error", "always-multiline" ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
