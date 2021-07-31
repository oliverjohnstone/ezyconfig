module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    coverageReporters: ["cobertura"],
    reporters: ["default"],
    collectCoverage: true,
    coverageThreshold: {
        global: {
            lines: 90,
            functions: 95,
            branches: 95,
            statements: 90
        }
    },
    verbose: true
};
