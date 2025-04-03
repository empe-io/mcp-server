module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:prettier/recommended',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'prettier', 'import'],
    env: {
        node: true,
        es2022: true,
    },
    ignorePatterns: [
        '**/dist/**',
        '**/node_modules/**',
        '**/coverage/**',
        '**/*.js',
        '**/empe.diddoc/**', // Add this line
        'packages/blockchain-client/src/empe.diddoc/**/*',
    ],
    parserOptions: {
        project: ['./apps/*/tsconfig.json', './packages/*/tsconfig.json', './packages/wallet-core/tsconfig.test.json'],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    settings: {
        'import/resolver': {
            typescript: {
                project: ['./apps/*/tsconfig.json', './packages/*/tsconfig.json'],
            },
            node: true,
        },
    },
    rules: {
        'prettier/prettier': ['error', {}, { usePrettierrc: true }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/only-throw-error': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-redundant-type-constituents': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',

        'import/order': [
            'error',
            {
                groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'object', 'type'],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
        'import/no-unresolved': 'error',
        'import/no-cycle': 'error',
        'import/no-unused-modules': 'warn',
        'import/no-duplicates': 'error',
        'import/no-named-as-default-member': 'off',
        'import/default': 'off',

        'no-console': ['warn', { allow: ['warn', 'error'] }],
        curly: 'off',
        eqeqeq: ['error', 'always'],
        'no-return-await': 'error',
        'require-await': 'off',
    },
};
