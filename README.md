# ENV Config

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
