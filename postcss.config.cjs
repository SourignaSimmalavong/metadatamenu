module.exports = {
    plugins: [
        require('cssnano')({ preset: 'default' }),
        require('@fullhuman/postcss-purgecss').default({
            content: [
                './**/*.html',
                './src/**/*.js',
                './src/**/*.ts',
                './src/**/*.vue',
                './src/**/*.jsx',
                './src/**/*.tsx',
                './test-vault-mdm/**/*.md',  // Include markdown if relevant
            ],
            safelist: [],  // Add any classes to prevent from purging
            defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        }),
    ],
};
