const {ConfigBuilder} = require("../lib/index");
const configFn = require("./config");
const pnp = require("./testPnP");
const singletonExample = require("./singleton");

// This can only be used in non production environments, to make it a little
// easier to test, for example. Attempting to use this in a production env
// will throw an exception, assuming NODE_ENV is configured correctly.
ConfigBuilder.setDevelopmentEnvironmentVariables({
    POSTCODE: "AL3 4JH",
    IBAN: "GB45BARC20040465335616",
    EMAIL: "bob@test.com",
    SECRET_NUMBER: "124",
    SECRET: "some-secret-api-key",
    PROP_TWO: "pnp-prop-two",
    PROP_ONE: "pnp-prop-one",
    JSON_ARRAY: [JSON.stringify({one: "one"}), JSON.stringify({two: "two"})].join("#"),
    TIME_ARRAY: ["1 hour", "2 days"].join(";"),
    STRING_ARRAY: ["hello", "world"].join(","),
    NUMBER_ARRAY: [1, 67, 9789].join("|"),
    BOOL_ARRAY: [true, false, 0, 1, "TRUE"].join(","),
    JSON: JSON.stringify({hello: "world"}),
    TIME: "3 hours",
    STRING: "some string value",
    NUMBER: "56",
    BOOL: "true"
});

// You only need to assign the builder object to a variable if you
// intend to call methods after the config has been built. For example
// when getting the loggable object
const builder = new ConfigBuilder();

// Build the config
const config = builder
    .loadPlugAndPlayEnv(pnp)
    .singleton()
    .build(configFn);

// Log the full config object - note that this will include full secret values
console.log("Non Obfuscated Log:");
console.log(JSON.stringify(config, null, 2));
console.log(`\n${"-".repeat(50)}\n`);

// Log the full config object with obfuscated secret values now
console.log("Obfuscated Log:");
console.log(JSON.stringify(builder.getLoggableConfigObject(), null, 2));
console.log(`\n${"-".repeat(50)}\n`);

// Property from file using singleton
console.log("Singleton Example:");
console.log(singletonExample());
console.log(`\n${"-".repeat(50)}\n`);

// Returning the underlying object for passing into dependent libraries
console.log("toJSON example:");
const clone = config.envVars.toJSON();
// Normally this will throw an error if you don't call toJSON()
const undef = clone.someUndefinedProperty;
console.log(typeof undef === "undefined");
console.log(`\n${"-".repeat(50)}\n`);
