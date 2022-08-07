# Change Log

# Version 2.0.0

* Improved return type of compiled config
* Removed singleton support
* Exported default config builder for when you don't need to access loggable objects etc
* Updated CI pipeline
* NPM audit

# Version 1.1.2

* Rename module

# Version 1.1.1

* Fixes bug with using config inside an async block
* Improves documentation and examples
* Adds in missing default array split char

# Version 1.1.0

* Adds time intervals as a first class type
* Supports explaining typescript compiled config files

# Version 1.0.10

* Supports `null` default value with optional environment variable

# Version 1.0.9

* Adds checkout step to release pipeline
* Exports missing environment types

# Version 1.0.8

* Fixes bug parsing boolean values where the environment variable is
  falsy. It would previously return the default value rather than the
  set value because of the following condition: `return parsedValue ||
  defaultValue`

# Version 1.0.7

* Fixes bug with `toJSON` returning a nested proxy rather than the
  originally resolved config object.

# Version 1.0.6

* Adds isProduction and isDevelopment methods to injected environment

# Version 1.0.5

* Adds toJSON method to return the underlying object that is not wrapped
  in a proxy

# Version 1.0.4

* Make kafka env less strict on validation

# Version 1.0.3

* Add `schemaRegistryClient` to the kafka pnp env file

# Version 1.0.2

* Fix bug with export types for plug and play environments
* Don't use default export for singleton instance

# Version 1.0.1

* Initial working implementation
