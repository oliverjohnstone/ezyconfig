module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    coverageThreshold: {
        global: {
            lines: 99,
            functions: 100,
            branches: 98,
            statements: 99
        }
    }
};
