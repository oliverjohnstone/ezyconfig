const {ukPostcode} = require("./validator");

module.exports = (env, {testPnP}) => ({
    envVars: {
        bool: env.value("BOOL").asBoolean(),
        number: env.value("NUMBER").asNumber(),
        string: env.value("STRING"),
        timeInterval: env.value("TIME").asInterval(),
        json: env.value("JSON").asObject()
    },

    fixedValues: {
        someFunction: () => "hello",
        bool: true
        // ...
    },

    arrayEnvVars: {
        bool: env.value("BOOL_ARRAY").asArray().ofBooleans(),
        number: env.value("NUMBER_ARRAY").asArray("|").ofNumbers(),
        string: env.value("STRING_ARRAY").asArray(),
        timeInterval: env.value("TIME_ARRAY").asArray(";").ofIntervals(),
        json: env.value("JSON_ARRAY").asArray("#").ofObjects()
    },

    pnp: {
        propOne: testPnP.propOne,
        propTwo: testPnP.propTwo
    },

    secrets: {
        password: env.secret("SECRET"),
        secretNumber: env.secret("SECRET_NUMBER")
    },

    defaultValues: {
        value: env.value("ENV_WITH_DEFAULT", "some default value"),
        boolDefault: env.value("BOOL_ENV_WITH_DEFAULT", true).asBoolean()
    },

    validators: {
        email: env.value("EMAIL").validate(env.validators.isEmail),
        iban: env.value("IBAN").validate(env.validators.isIBAN),
        postcode: env.value("POSTCODE").validate(ukPostcode)
    }
});
