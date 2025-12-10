module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/__tests__*.js',
        '**/?(*.)+(spec|test).js',
        '**/tests*.js'
    ],
    collectCoverageFrom: [
        'src*.js',
        '!src*.test.js',
        '!src*.spec.js'
    ],
    testTimeout: 30000,
    verbose: true,
    transformIgnorePatterns: [
        'node_modules/(?!(supertest)/)'
    ]
};