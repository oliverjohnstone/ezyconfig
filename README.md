# ezconfig

An environment variable based configuration loader for node projects.
The motivation for this project is to minimise magic, improve
communication and documentation in the form of self documenting
environment variables and to encourage best (and common) practices
around config loading, validation and consistency between different
environments. 

There are three distinct steps to using this module:

#### Definition

All configurations should be defined as a single function that returns
an object using the variable builders provided to the config builder
function. The variable builders should be used to define the type of the
environment variable and any validators that should be used to ensure
that the variable is of the correct type and format. 

#### Compilation

The compilation stage is where we take the config builder function and
compile it down into a real object. It is at this stage that we run the
type coercions, validators and transformer functions. Any malformed or
missing environment variables will throw an exception and will be
immediately obvious as soon as the service starts, rather than at some
point during service execution. After a config has been compiled, the
developer can be sure of the types and format of the loaded
configuration, freeing them up to build real business value without the
concern of type casting/validation etc.

#### Runtime

The returned config object from the ConfigBuilder is an object that has
been wrapped in proxies to provide more detailed error messages and to
ensure that the loaded config remains immutable, avoiding any
potentially strange behaviour.

It is recommended to dependency inject the returned config object from
the ConfigBuilder but we understand that it is not always practical
and/or doesn't necessarily lead to maintainable or neat code. We have
therefore included a way to export a singleton configuration object so
it can be imported like a normal node module.

Sometimes it is necessary to get the normal config object that has not
been wrapped in a proxy so that you can pass the object down into
dependencies without causing exceptions when accessing non-existent
properties. To do this, you can call `toJSON` at any level in the config
object and this will return the "real" object. Example:

```javascript
const {singleton: config} = require("@yupana/env-config");
const ExternalLib = require("some-external-library");

const lib = new ExternalLib(config.externalLibConfig.toJSON());

lib.doSomething();
```

## Support Utilities / Scripts

Because we have taken a declarative approach to config definition, we
are able to parse the config and compute a list of required environment
variables including their type, key, default value, validators etc. This
means that we can simply pass the config function to the script and pass
the output to the pipeline developer to configure the individual
environments.

You should install this module globally to use this script:

```bash
npm i -g @yupana/env-config
```

The script usage is as follows:

```bash
explain-config [options] <configFile> [plugAndPlayFiles...]
```

You have several output options available:

| Option   | Format                                                                         |
|----------|--------------------------------------------------------------------------------|
| -o table | A formatted table that is useful for copying into markdown, such as an ID Card |
| -o json  | A JSON stringified format of the environment variables                         |
| -o yml   | Key/Value pairs in YML format for copying into service charts                  |

## Plug and Play Environments

It is very common for multiple services to use the same resources, for
example kafka, mongo, sql etc. but we might not want to force the
developers of these services to keep the same config format. To support
this, we have a concept of plug and play environments, where you can
define a shared set of environment variables to inject into the config
builder function. The advantage of these plug and play environments are
as follows:

* Less risk of typos
* Less boilerplate in service configs
* Common environment variable names and formats across projects
* The developer can still craft their config as they wish
* Same validation as config value builders

Example:

```javascript
module.exports = (env, {kafka, mongo}) => ({
   mongo: {
       database: "my-project-db",
       host: mongo.host,
       user: mongo.user,
       password: mongo.password
   },
   kafka: {
       ...kafka
   },
   other: {
       variable: env.value("PROJECT_ENV_VAR", true).asBoolean()
   }
});
```

There are some default plug and play environments available in this
module. They can be loaded like so:

```javascript
const {mongo, kafka, azure, launchDarkly} = require("@yupana/env-config/lib/pnp");
const {ConfigBuilder} = require("@yupana/env-config");

const builder = new ConfigBuilder();

builder
    .loadPlugAndPlayEnv(mongo)
    .loadPlugAndPlayEnv(kafka)
    .loadPlugAndPlayEnv(azure)
    .loadPlugAndPlayEnv(launchDarkly);
```

## Usage

Please see the examples or tests folder for concrete examples of how to
use this module. For brevity, we have listed some common examples below:

### Declaring a secret value

```javascript
module.exports = (env) => ({
    secretValue: env.secret("SECRET_ENV_VAR")
});
``` 

### Declaring an ENV var with a default value

```javascript
module.exports = (env) => ({
    someValue: env.value("ENV_VAR_NAME", "default-value")
});
```

### Parsing into specified types

```javascript
module.exports = (env) => ({
    boolValue: env.value("BOOL_ENV_VAR").asBoolean(), // BOOL_ENV_VAR=(1|0|true|false|TRUE|FALSE)
    intValue: env.value("INT_VAR").asNumber(), // INT_VAR=(1, 2, 3, ...)
    jsonObject: env.value("JSON_STRING").asObject(), // JSON_STRING={"some": "json"}
    timePeriod: env.value("TIME_PERIOD_VALUE").asInterval(), // TIME_PERIOD_VALUE=(5 seconds, 2 years, ...)
    
    // Arrays of values
    boolValueArray: env.value("ARR_BOOL_ENV_VAR").asArray(",").ofBooleans(), // ARR_BOOL_ENV_VAR=true, true, false, 0
    intValueArray: env.value("ARR_INT_VAR").asArray("|").ofNumbers(), // ARR_INT_VAR=1|2|656|4
    jsonObjectArray: env.value("ARR_JSON_STRING").asArray("|").ofObjects(), // ARR_JSON_STRING={"some": "json"}|{"hello": "world}
    timePeriodArray: env.value("ARR_TIME_PERIOD_VALUE").asArray(",").ofIntervals(), // ARR_TIME_PERIOD_VALUE=5 seconds, 2 years
});
```

### Validating parsed values

You can provide custom validators to the validate function in the form
of:

```javascript
{
    name: "validatorName", // Used to provide helpful error messages
    fn: (value) => /^[a-z]$/.test(value) // Return true if the value passes validation otherwise return false
}
```

Otherwise you can make use of the set of validators provided in this
library:

| Validator        | Description                                                                                                                      |
|------------------|----------------------------------------------------------------------------------------------------------------------------------|
| isAlpha          | Validates that the value contains only alpha chars                                                                               |
| isAlphanumeric   | Validates that the value contains only alphanumeric chars                                                                        |
| isAscii          | Validates that the string contains ASCII chars only                                                                              |
| isBase32         | Validates that the string is base32 encoded                                                                                      |
| isBase64         | Validates that the string is base64 encoded                                                                                      |
| isBIC            | Validates that the string is a BIC (Bank Identification Code) or SWIFT code                                                      |
| isBtcAddress     | Validates that the string is a bitcoin address                                                                                   |
| isCurrency       | Validates that the string is a valid currency amount                                                                             |
| isDataURI        | Validates that the string is a valid data URI format                                                                             |
| isDate           | Validates that the string is a valid date                                                                                        |
| isDecimal        | Validates that the string represents a decimal number, such as 0.1, .3, 1.1, 1.00003, 4.0, etc                                   |
| isDivisibleBy    | Validates that the string is a number that's divisible by another                                                                |
| isEAN            | Validates that the string is an EAN (European Article Number)                                                                    |
| isEmail          | Validates that the string is a valid email address                                                                               |
| isFQDN           | Validates that the string is a fully qualified domain name                                                                       |
| isHexadecimal    | Validates that the string is a hexadecimal number                                                                                |
| isHexColor       | Validates that the string is a hexadecimal color                                                                                 |
| isHSL            | Validates that the string is an HSL (hue, saturation, lightness, optional alpha) color based on CSS Colors Level 4 specification |
| isIBAN           | Validates that the string is a IBAN (International Bank Account Number)                                                          |
| isIP             | Validates that the string is an IP (version 4 or 6)                                                                              |
| isIPRange        | Validates that the string is an IP Range (version 4 or 6)                                                                        |
| isISO8601        | Validates that the string is a valid ISO 8601 date                                                                               |
| isISO31661Alpha2 | Validates that the string is a valid ISO 3166-1 alpha-2 officially assigned country code                                         |
| isISO31661Alpha3 | Validates that the string is a valid ISO 3166-1 alpha-3 officially assigned country code                                         |
| isJWT            | Validates that the string is valid JWT token                                                                                     |
| isLocale         | Validates that the string is a locale                                                                                            |
| isLowercase      | Validates that the string is lowercase                                                                                           |
| isMACAddress     | Validates that the string is a MAC address                                                                                       |
| isMD5            | Validates that the string is a MD5 hash                                                                                          |
| isMimeType       | Validates that string matches to a valid MIME type format                                                                        |
| isMongoId        | Validates that the string is a valid hex-encoded representation of a MongoDB ObjectId                                            |
| isMultibyte      | Validates that the string contains one or more multibyte chars                                                                   |
| isNumeric        | Validates that the string contains only numbers                                                                                  |
| isOctal          | Validates that the string is a valid octal number                                                                                |
| isRFC3339        | Validates that the string is a valid RFC 3339 date                                                                               |
| isRgbColor       | Validates that the string is a rgb or rgba color                                                                                 |
| isSemVer         | Validates that the string is a Semantic Versioning Specification (SemVer)                                                        |
| isUppercase      | Validates that the string is uppercase                                                                                           |
| isSlug           | Validates that the string is of type slug                                                                                        |
| isURL            | Validates that the string is an URL                                                                                              |
| isUUID           | Validates that the string is a UUID (version 3, 4 or 5)                                                                          |
| isVariableWidth  | Validates that the string contains a mixture of full and half-width chars                                                        |
| isPort           | Validates that the value given is a valid port number                                                                            |
| fileExists       | Validates that the file path described exists - This is useful for service dependencies such as certificates etc                 |

Example:

```javascript
module.exports = (env) => ({
    servicePort: env.value("SERVICE_PORT").validate(env.validators.isPort),
    certificatePath: env.value("CERT_PATH").validate(env.validators.fileExists)
});
```
