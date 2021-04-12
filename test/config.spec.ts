import {singleton as singletonConfig, ConfigBuilder, resetSingleton} from "../src";
import {InjectedEnvironment} from "../src/injectedEnvironment";
import {ConfigReturnType, ConfigValueType} from "../src/types/config";
import {Environment} from "../src/types/environment";

const vars: {[key: string]: string} = {};

function clean(): void {
    Object.keys(vars).forEach(v => delete process.env[v]);
    resetSingleton();
}

function createEnvVars(toSet: {[key: string]: string}): void {
    Object.entries(toSet).forEach(([key, value]) => {
        vars[key] = value;
        process.env[key] = value;
    });
}

describe("Config", () => {
    afterEach(clean);

    describe("Definition/Compilation", () => {
        it("builds the expected config from a function", () => {
            createEnvVars({
                TEST: "test;test2;test3",
                NESTED_SECRET: "shhh"
            });
            const config = (new ConfigBuilder())
                .build((env: InjectedEnvironment): ConfigReturnType => ({
                    testProp: env.value("TEST").asArray(";"),
                    testConst: "constant",
                    object: {
                        nested: {
                            value: env.value("NESTED", "nested"),
                            secret: env.secret("NESTED_SECRET"),
                            port: env.value("PORT", 5000).asNumber()
                        }
                    },
                    functionValue: () => "hello-world"
                }));

            expect(config).toEqual({
                testProp: ["test", "test2", "test3"],
                testConst: "constant",
                object: {
                    nested: {
                        value: "nested",
                        secret: "shhh",
                        port: 5000
                    }
                },
                functionValue: "hello-world"
            });
        });

        it("throws an error if there is no environment variable or default value", () => {
            expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment): ConfigReturnType => ({
                test: env.value("KEY")
            }))).toThrowErrorMatchingSnapshot();
        });

        it("reports all errors for all properties without leaking secrets", () => {
            createEnvVars({
                "INVALID_NUM": "jdshkgn",
                "INVALID_PORT": "0",
                "ARRAY_ERROR": "ghj, true, false, oj",
                "SECRET": "SECRET|values|5|8|be|thrown"
            });
            expect(() => (new ConfigBuilder())
                .build((env: InjectedEnvironment): ConfigReturnType => ({
                    numbers: {
                        parseError: env.value("INVALID_NUM").asNumber(),
                        validationError: env.value("INVALID_PORT").asNumber().validate(env.validators.isPort)
                    },
                    arrays: {
                        // This doesn't make sense because it's casting to a number and then trying to split but
                        // it should still report errors for it
                        error: env.value("ARRAY_ERROR").asNumber().asArray(",").ofNumbers(),
                        // Error messages for this config property should not print the value/s
                        secret: env.secret("SECRET").asNumber().asArray("|").ofNumbers()
                    }
                }))
            ).toThrowErrorMatchingSnapshot();
        });

        it("calls functions specified as a config value", () => {
            const fn = jest.fn(() => "hello world");
            const config = (new ConfigBuilder()).build(() => ({fn}));

            expect(fn).toHaveBeenCalledTimes(1);
            expect(config).toEqual({fn: "hello world"});
        });

        it("throws exceptions when calling builder methods after build has been called", () => {
            const builder = new ConfigBuilder();
            builder.build(() => ({}));

            expect(() => builder.loadPlugAndPlayEnv({name: "test", properties: []}))
                .toThrow("Config has already been built. Try creating a new ConfigBuilder");
            expect(() => builder.singleton())
                .toThrow("Config has already been built. Try creating a new ConfigBuilder");
        });

        it("throws exceptions when calling methods that require build to be called first", () => {
            const builder = new ConfigBuilder();

            expect(() => builder.getRequiredEnvironmentVariables()).toThrow(
                "Config should be built before getting the required environment variables."
            );
            expect(() => builder.getLoggableConfigObject()).toThrow(
                "Config should be built before getting the loggable config object."
            );
        });

        it("throws an error if trying to build again", () => {
            const builder = new ConfigBuilder();
            builder.build(() => ({a: 1}));
            expect(() => builder.build(() => ({b: 2}))).toThrow("Config has already been built");
        });

        it("throws an error when a function in a config throws", () => {
            expect(() => (new ConfigBuilder()).build(() => ({
                fn: () => {
                    throw new Error("Hmm");
                }
            }))).toThrow("An error occurred whilst executing a configuration function: Error: Hmm");
        });

        describe("Array Values", () => {
            it("returns a real array for constant array properties", () => {
                const config = (new ConfigBuilder()).build(() => ({a: [1, 2, 3]}));

                expect(Array.isArray(config.a)).toBe(true);
            });

            it("throws an error when the default value is not an array", () => {
                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    array: env.value("ARRAY", "bob").asArray(",").ofNumbers()
                }))).toThrowErrorMatchingSnapshot();
            });

            it("throws an error when the entries of the default array don't match the expected type", () => {
                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    bools: env.value("ARRAY", [true, 1, null]).asArray(",").ofBooleans(),
                    objs: env.value("ARRAY", [null, {}, false, 3]).asArray(",").ofObjects()
                }))).toThrowErrorMatchingSnapshot();
            });

            it("throws an error when there is no env value or default value", () => {
                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    bools: env.value("ARRAY").asArray(",").ofBooleans()
                }))).toThrowErrorMatchingSnapshot();
            });

            it("throws an error when there is an empty array", () => {
                createEnvVars({ARRAY: ",   , ,,\t"});
                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    bools: env.value("ARRAY").asArray(",").ofBooleans()
                }))).toThrowErrorMatchingSnapshot();
            });
        });

        describe("Singleton", () => {
            it("exports a singleton instance when requested", () => {
                const config = (new ConfigBuilder())
                    .singleton()
                    .build(() => ({hello: "world"}));

                expect(singletonConfig.hello).toBe("world");
                expect(config.hello).toBe("world");
            });

            it("does not export a singleton instance when not requested", () => {
                const config = (new ConfigBuilder()).build(() => ({hello: "world"}));

                expect(() => singletonConfig.hello).toThrow(
                    "Singleton export not available. Are you sure you've configured it, or perhaps build() hasn't been called?"
                );
                expect(config.hello).toBe("world");
            });

            it("resets the singleton export when calling resetSingleton()", () => {
                const config = (new ConfigBuilder())
                    .singleton()
                    .build(() => ({a: "hi"}));

                expect(singletonConfig.a).toBe("hi");
                expect(config.a).toBe("hi");

                resetSingleton();

                expect(() => singletonConfig.a).toThrow(
                    "Singleton export not available. Are you sure you've configured it, or perhaps build() hasn't been called?"
                );
                expect(config.a).toBe("hi");
            });
        });

        describe("Validators", () => {
            it("validates values using the defined validator", () => {
                createEnvVars({
                    "INVALID_PORT": "999999999",
                    "MALFORMED_INT": "not-an-int"
                });

                expect(() => (new ConfigBuilder())
                    .build((env: InjectedEnvironment): ConfigReturnType => ({
                        port: env.value("INVALID_PORT").asNumber().validate(env.validators.isPort),
                        malformed: env.value("MALFORMED_INT").asNumber()
                    }))
                ).toThrowErrorMatchingSnapshot();
            });

            it("validates that a file exists", () => {
                createEnvVars({
                    NO_FILE: "",
                    FILE_EXISTS: __filename,
                    FILE_DOESNT_EXIST: "/no-such-file-probably.txt"
                });

                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    noFile: env.value("NO_FILE").validate(env.validators.fileExists),
                    exists: env.value("FILE_EXISTS").validate(env.validators.fileExists),
                    doesntExist: env.value("FILE_DOESNT_EXIST").validate(env.validators.fileExists)
                }))).toThrowErrorMatchingSnapshot();
            });

            // There are many other validators provided by https://www.npmjs.com/package/validator but we
            // don't test those here as we are only interested in the wrapping.
            it("validates that the value is a valid ISO8601 date format", () => {
                createEnvVars({
                    EMPTY: "",
                    VALID: "2020-12-15T17:52:15+00:00"
                });

                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    empty: env.value("EMPTY").validate(env.validators.isISO8601),
                    valid: env.value("VALID").validate(env.validators.isISO8601)
                }))).toThrowErrorMatchingSnapshot();
            });

            it("validates each array item", () => {
                createEnvVars({
                    VALID: "2020-12-15T17:52:15+00:00|false|2020-12-15T17:52:15+00:00"
                });

                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    valid: env.value("VALID").asArray("|").validate(env.validators.isISO8601),
                }))).toThrowErrorMatchingSnapshot();
            });
        });

        describe("Type Coercion", () => {
            it("parses into the defined types", () => {
                createEnvVars({
                    "NUMBER": "56",
                    "BOOLEAN": "true",
                    "OBJECT": JSON.stringify({hello: "world"}),
                    "ARRAY_NUMBERS": "1, 2, 3, 4",
                    "ARRAY_OBJECTS": Array.from(new Array(5), () => JSON.stringify({hi: "world"}))
                        .join("$$$"),
                    "ARRAY_BOOLEANS": "T|F|TrUe|FaLse |0|1"
                });

                const config = (new ConfigBuilder())
                    .build((env: InjectedEnvironment): ConfigReturnType => ({
                        number: env.value("NUMBER").asNumber(),
                        boolean: env.value("BOOLEAN").asBoolean(),
                        object: env.value("OBJECT").asObject(),
                        arrays: {
                            ofNumbers: env.value("ARRAY_NUMBERS").asArray(",").ofNumbers(),
                            ofObjects: env.value("ARRAY_OBJECTS").asArray("$$$").ofObjects(),
                            ofBooleans: env.value("ARRAY_BOOLEANS").asArray("|").ofBooleans()
                        },
                        function: () => "hello"
                    }));

                expect(config).toEqual({
                    arrays: {
                        ofBooleans: [true, false, true, false, false, true],
                        ofNumbers: [1, 2, 3, 4],
                        ofObjects: [
                            {hi: "world"},
                            {hi: "world"},
                            {hi: "world"},
                            {hi: "world"},
                            {hi: "world"}
                        ]
                    },
                    boolean: true,
                    number: 56,
                    object: {hello: "world"},
                    function: "hello"
                });
            });

            it("validates that the default type is the same as the declared type", () => {
                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment): ConfigReturnType => ({
                    test: env.value("TEST", 1).asBoolean(),
                    test2: env.value("TEST", 1).asObject(),
                }))).toThrowErrorMatchingSnapshot();
            });

            it("does not support setting the type twice", () => {
                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment): ConfigReturnType => ({
                    twice: env.value("ENV_KEY", "true").asNumber().asBoolean()
                }))).toThrowErrorMatchingSnapshot();
            });

            it("reports errors for malformed environment variables", () => {
                createEnvVars({
                    INVALID_BOOL: "hmm",
                    INVALID_OBJ: ":/"
                });

                expect(() => (new ConfigBuilder()).build((env: InjectedEnvironment) => ({
                    bool: env.value("INVALID_BOOL").asBoolean(),
                    boolSecret: env.secret("INVALID_BOOL").asBoolean(),
                    obj: env.value("INVALID_OBJ").asObject(),
                    objSecret: env.secret("INVALID_OBJ").asObject()
                }))).toThrowErrorMatchingSnapshot();
            });
        });

        describe("Plug and Play Environments", () => {
            it("throws an error when the property is not defined on the pnp environment", () => {
                expect(() => (new ConfigBuilder())
                    .loadPlugAndPlayEnv({name: "pnp", properties: []})
                    .build((env, pnpEnvs) => ({prop: pnpEnvs.pnp.test}))
                ).toThrow("pnp PnP environment does not have \"test\" defined.");
            });

            it("is immutable", () => {
                expect(() => (new ConfigBuilder())
                    .loadPlugAndPlayEnv({name: "pnp", properties: []})
                    .build((env, pnpEnvs) => {
                        pnpEnvs.pnp.test = "test";
                        return {};
                    })
                ).toThrow("The PnP environment, pnp, is immutable.");
            });

            it("validates variables in a pnp config", () => {
                const pnp: Environment = {
                    name: "pnp",
                    properties: [
                        {
                            name: "toValidate",
                            validator: {name: "validator function", fn: () => false},
                            envKey: "TO_VALIDATE",
                            secret: false,
                            type: ConfigValueType.STRING
                        }
                    ]
                };

                createEnvVars({TO_VALIDATE: "TO_VALIDATE"});

                expect(() => (new ConfigBuilder()).loadPlugAndPlayEnv(pnp).build((env, pnp) => ({
                    toValidate: pnp.pnp.toValidate
                }))).toThrowErrorMatchingSnapshot();
            });

            it("throws an error trying to access a plug and play environment that doesn't exist", () => {
                expect(() => (new ConfigBuilder()).build((env, pnpEnvs) => ({
                    prop: pnpEnvs.doesntExist.test
                }))).toThrow("Plug and Play environment with name \"doesntExist\" has not been loaded.");
            });

            it("throws an error when trying to set a property of a plug and play environment", () => {
                const pnp: Environment = {name: "pnp", properties: []};

                expect(() => (new ConfigBuilder()).loadPlugAndPlayEnv(pnp).build((env, pnp) => {
                    pnp.pnp = {};
                    return {};
                })).toThrow("Plug and Play environments are immutable, use \"loadPlugAndPlayEnv\" instead.");
            });

            it("does not allow duplicate properties", () => {
                const pnp: Environment = {
                    name: "pnp",
                    properties: Array.from(new Array(2), () => ({
                        name: "test",
                        envKey: "TEST_KEY",
                        secret: false,
                        type: ConfigValueType.STRING
                    }))
                };

                expect(() => (new ConfigBuilder()).loadPlugAndPlayEnv(pnp).build(() => ({})))
                    .toThrow("pnp PnP environment already has a definition for \"test\"");
            });

            it("supports preconfigured (plug and play) environments", () => {
                const pnpKafka: Environment = {
                    name: "kafka",
                    properties: [
                        {
                            name: "brokers",
                            type: ConfigValueType.STRING,
                            envKey: "KAFKA_BROKERS",
                            secret: false,
                            splitOn: ";"
                        },
                        {
                            name: "auth",
                            type: ConfigValueType.STRING,
                            envKey: "KAFKA_AUTH",
                            secret: true
                        },
                        {name: "boolArray", type: ConfigValueType.BOOLEAN, envKey: "BOOL_ARRAY", secret: false, splitOn: ","},
                        {name: "intArray", type: ConfigValueType.NUMBER, envKey: "INT_ARRAY", secret: false, splitOn: ","},
                        {name: "objArray", type: ConfigValueType.OBJECT, envKey: "OBJECT_ARRAY", secret: false, splitOn: ","},
                        {name: "bool", type: ConfigValueType.BOOLEAN, envKey: "BOOL", secret: false},
                        {name: "int", type: ConfigValueType.NUMBER, envKey: "INT", secret: false},
                        {name: "obj", type: ConfigValueType.OBJECT, envKey: "OBJECT", secret: false}
                    ]
                };

                const pnpMongo: Environment = {
                    name: "mongo",
                    properties: [
                        {name: "host", type: ConfigValueType.STRING, envKey: "MONGO_HOST", secret: false},
                        {name: "password", type: ConfigValueType.STRING, envKey: "MONGO_PWD", secret: true},
                        {name: "database", type: ConfigValueType.STRING, envKey: "MONGO_DB", secret: false, default: "db_name"}
                    ]
                };

                createEnvVars({
                    "KAFKA_BROKERS": "one;two;three",
                    "KAFKA_AUTH": "shhh-some-secret",
                    "MONGO_HOST": "mongo://etc",
                    "MONGO_PWD": "password",
                    "BOOL_ARRAY": "true,false",
                    "INT_ARRAY": "1,2,3",
                    "OBJECT_ARRAY": "{}, {}",
                    "BOOL": "true",
                    "INT": "1",
                    "OBJECT": "{}",
                });
                const config = (new ConfigBuilder())
                    .loadPlugAndPlayEnv(pnpKafka)
                    .loadPlugAndPlayEnv(pnpMongo)
                    .build((env: InjectedEnvironment, {kafka, mongo}): ConfigReturnType => ({
                        mongo: {
                            host: mongo.host,
                            pass: mongo.password,
                            database: mongo.database
                        },
                        kafka: {
                            brokers: kafka.brokers,
                            auth: kafka.auth
                        },
                        parsed: {
                            // Test parsing of various types
                            boolArray: kafka.boolArray,
                            bool: kafka.bool,
                            intArray: kafka.intArray,
                            int: kafka.int,
                            objArray: kafka.objArray,
                            obj: kafka.obj
                        }
                    }));

                expect(config).toEqual({
                    kafka: {
                        auth: "shhh-some-secret",
                        brokers: ["one", "two", "three"]
                    },
                    mongo: {
                        host: "mongo://etc",
                        pass: "password",
                        database: "db_name"
                    },
                    parsed: {
                        bool: true,
                        boolArray: [true, false],
                        int: 1,
                        intArray: [1, 2, 3],
                        obj: {},
                        objArray: [{}, {}]
                    }
                });
            });
        });
    });

    describe("Runtime", () => {
        it("is immutable", () => {
            const config = (new ConfigBuilder())
                .build((env: InjectedEnvironment): ConfigReturnType => ({
                    a: env.value("TEST", [1, 2, 3]).asArray(",").ofNumbers(),
                    nested: {
                        b: "hello-world"
                    }
                }));

            expect(() => config.a.push(4)).toThrow("Cannot change array a. Config is immutable.");
            expect(() => {config.nested.b = "bob";}).toThrow("Cannot change property nested.b. Config is immutable.");
            expect(config.a).toEqual([1, 2, 3]);
            expect(config.nested.b).toBe("hello-world");
        });

        it("throws an error trying to get a property that doesn't exist", () => {
            const config = (new ConfigBuilder()).build(() => ({a: []}));

            expect(() => config.test).toThrow("Cannot get property test because it does not exist in the built config.");
            expect(() => config.a[1]).toThrow("Cannot get property a[1] because it does not exist in the built config.");
        });

        it("throws an error when setting a property on the default exported config", () => {
            (new ConfigBuilder()).build(() => ({}));

            expect(() => singletonConfig.test = "bob").toThrow(
                "Singleton export not available. Are you sure you've configured it, or perhaps build() hasn't been called?"
            );

            (new ConfigBuilder()).singleton().build(() => ({}));

            expect(() => singletonConfig.test = "bob").toThrow(
                "Cannot change property test. Config is immutable."
            );
        });

        it("returns the underlying object when calling toJSON", () => {
            const objectValue = {some: {complex: {object: "value"}}};
            const config = (new ConfigBuilder())
                .build((): ConfigReturnType => ({object: {value: objectValue}}));

            expect(config.object.value.toJSON()).toEqual(objectValue);
        });

        it("does not throw an exception when accessing non-existent properties on a object obtained via toJSON()", () => {
            const objectValue = {some: {complex: {object: "value"}}};
            const config = (new ConfigBuilder())
                .build((): ConfigReturnType => ({object: {value: objectValue}}));

            expect(() => config.object.toJSON().unknown).not.toThrow();
            expect(() => config.object.toJSON().value.unknown).not.toThrow();
            expect(() => config.object.toJSON().value.some.complex.unknown).not.toThrow();
        });
    });

    describe("Support Utilities", () => {
        describe("isProduction()", () => {
            it.each([
                [true, "production"],
                [true, " pRoDuCtion "],
                [false, "prod"],
                [false, "dev"]
            ])("returns %j for the environment determined by NODE_ENV = %s", (result, envValue) => {
                createEnvVars({NODE_ENV: envValue});

                expect((new ConfigBuilder().build(env => ({isProd: env.isProduction()})))).toEqual({
                    isProd: result
                });
            });
        });

        describe("isDevelopment()", () => {
            it.each([
                [false, "production"],
                [false, " pRoDuCtion "],
                [true, "prod"],
                [true, "dev"],
                [true, "development"]
            ])("returns %j for the environment determined by NODE_ENV = %s", (result, envValue) => {
                createEnvVars({NODE_ENV: envValue});

                expect((new ConfigBuilder().build(env => ({isDev: env.isDevelopment()})))).toEqual({
                    isDev: result
                });
            });
        });

        it("details all required environment properties of a configuration", () => {
            createEnvVars({"FIVE": "5"});
            const builder = new ConfigBuilder();
            builder.build((env: InjectedEnvironment): ConfigReturnType => ({
                one: env.value("ONE", 1).asNumber(),
                two: env.value("TWO", "2"),
                three: env.value("THREE", 3).asNumber().validate(env.validators.isPort),
                four: env.secret("SECRET", "shhh"),
                five: env.value("FIVE").asNumber(),
                six: env.value("SIX", []).asArray(";").ofNumbers(),
                seven: env.value("ONE", 1).asNumber() // Same as one to test for deduping
            }));

            const result = builder.getRequiredEnvironmentVariables();

            expect(result).toEqual([
                {name: "ONE", isSecret: false, default: "1", type: "NUMBER"},
                {name: "TWO", isSecret: false, default: "2", type: "STRING"},
                {name: "THREE", isSecret: false, default: "3", type: "NUMBER", validator: "isPort"},
                {name: "SECRET", isSecret: true, default: "shhh", type: "STRING"},
                {name: "FIVE", isSecret: false, type: "NUMBER"},
                {name: "SIX", isSecret: false, default: "", type: "NUMBER[]", separator: ";"}
            ]);
        });

        it("sets environment variables in an environment other than production", () => {
            // Test with NODE_ENV set to test (by jest)
            ConfigBuilder.setDevelopmentEnvironmentVariables({
                TEST: "123"
            });

            expect(process.env.TEST).toBe("123");
            delete process.env.TEST;

            // Now test with it unset
            delete process.env.NODE_ENV;
            ConfigBuilder.setDevelopmentEnvironmentVariables({
                TEST: "123"
            });

            expect(process.env.TEST).toBe("123");
            delete process.env.TEST;
        });

        it("refuses to set environment variables in production", () => {
            createEnvVars({
                NODE_ENV: " ProdUcTioN " // Deliberately poorly formed to see if it still detects production env
            });

            expect(() => ConfigBuilder.setDevelopmentEnvironmentVariables({TEST: "hmm"})).toThrow(
                "Setting environment variables from code in production environment is forbidden."
            );
        });

        describe("Obfuscation", () => {
            it("obfuscates secret values when getting the loggable object", () => {
                createEnvVars({
                    "SECRET": "shhh",
                    "SECRET_ARRAY": "shh1, shhh2, shhh3"
                });

                const builder = new ConfigBuilder();
                builder.build((env: InjectedEnvironment): ConfigReturnType => ({
                    secret: env.secret("SECRET_1", "defaultSecret"),
                    secretFromEnv: env.secret("SECRET"),
                    secretArray: env.secret("SECRET_ARRAY").asArray(","),
                    nonSecret: "hello"
                }));
                const loggable = builder.getLoggableConfigObject();

                expect(loggable).toEqual({
                    secret: "****",
                    secretFromEnv: "****",
                    nonSecret: "hello",
                    secretArray: ["****", "****", "****"]
                });
            });
        });
    });
});
