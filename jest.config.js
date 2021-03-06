module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    coverageReporters: ["cobertura"],
    reporters: ["default"],
    collectCoverage: true,
    coverageThreshold: {
        global: {
            lines: 99,
            functions: 100,
            branches: 98,
            statements: 99
        }
    },
    verbose: true
};
