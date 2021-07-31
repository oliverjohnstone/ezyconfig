import {wrapInProxiesRecursive} from "./configWrapper";
import {InjectedEnvironment} from "./injectedEnvironment";
import {createPlugAndPlayEnvironment, PlugAndPlayEnvironmentImpl} from "./plugAndPlayEnvironment";
import {ArrayResolver} from "./resolvers/array";
import {CoreResolver} from "./resolvers/core";
import {
    ConfigFunction,
    ConfigReturnType,
    ConfigValue,
    ConfigValueType,
    PlugAndPlayEnvironment,
    ResolvedConfig
} from "./types/config";
import {Environment} from "./types/environment";
import {createObjectPath, isProduction, isRecursableObject} from "./utils";
import {ValueBuilder} from "./valueBuilder";
import azurePnP from "./pnp/azure";
import kafkaPnP from "./pnp/kafka";
import launchDarklyPnP from "./pnp/launchDarkly";
import mongoPnP from "./pnp/mongo";

type ValueBuilderConfig = {
    [key: string]: ValueBuilder|ValueBuilderConfig
}

export type RequiredEnvironmentVariableDescription = {
    name: string;
    default?: string;
    type: string;
    isSecret: boolean;
    validator?: string;
    separator?: string;
}

type PlugAndPlayEnvs = {
    [key: string]: {
        env: PlugAndPlayEnvironment,
        impl: PlugAndPlayEnvironmentImpl
    }
};

let singletonConfigInstance: ResolvedConfig|null = null;

class ConfigBuilder {
    private readonly plugAndPlayEnvs: PlugAndPlayEnvs = {};
    private setupSingleton = false;
    private requiredEnvironmentVariables: RequiredEnvironmentVariableDescription[] = [];
    private builtConfig: ResolvedConfig|null = null;
    private builtWithErrors = false;
    private obfuscatedConfig: ResolvedConfig|null = null;

    public getRequiredEnvironmentVariables(): RequiredEnvironmentVariableDescription[] {
        if (!this.builtWithErrors && !this.builtConfig) {
            throw new Error("Config should be built before getting the required environment variables.");
        }
        const keys: {[key: string]: boolean} = {};
        return this.requiredEnvironmentVariables.filter(envVar => {
            if (keys[envVar.name]) {
                return false;
            }
            keys[envVar.name] = true;
            return true;
        });
    }

    public getLoggableConfigObject(): ResolvedConfig {
        if (!this.builtConfig) {
            throw new Error("Config should be built before getting the loggable config object.");
        }
        return this.obfuscatedConfig as ResolvedConfig;
    }

    public static setDevelopmentEnvironmentVariables(envVars: {[key: string]: string}): void {
        if (isProduction()) {
            throw new Error("Setting environment variables from code in production environment is forbidden.");
        }

        Object.entries(envVars).forEach(([key, value]) =>
            process.env[key] = value.toString()
        );
    }

    public loadPlugAndPlayEnv(env: Environment): ConfigBuilder {
        if (this.builtConfig) {
            throw new Error("Config has already been built. Try creating a new ConfigBuilder");
        }
        this.plugAndPlayEnvs[env.name] = createPlugAndPlayEnvironment(env);
        return this;
    }

    public singleton(): ConfigBuilder {
        if (this.builtConfig) {
            throw new Error("Config has already been built. Try creating a new ConfigBuilder");
        }
        this.setupSingleton = true;
        return this;
    }

    private createPlugAndPlayProxy(): PlugAndPlayEnvironment {
        const envs = this.plugAndPlayEnvs;
        return new Proxy({} as PlugAndPlayEnvironment, {
            get(target: PlugAndPlayEnvironment, p: PropertyKey, receiver: unknown): unknown {
                if (typeof envs[p.toString()] === "undefined") {
                    throw new Error(`Plug and Play environment with name "${p.toString()}" has not been loaded.`);
                }
                return Reflect.get(envs, p, receiver).env;
            },
            set(): boolean {
                throw new Error("Plug and Play environments are immutable, use \"loadPlugAndPlayEnv\" instead.");
            }
        });
    }

    public build(configFn: ConfigFunction): ResolvedConfig {
        if (this.builtConfig) {
            throw new Error("Config has already been built");
        }

        const valueBuilders = this.mapIntoValueBuildersRecursive(
            "",
            configFn(new InjectedEnvironment(), this.createPlugAndPlayProxy())
        );

        // Collect all environment properties declared in the config function
        Object.values(this.plugAndPlayEnvs).forEach(({impl}) =>
            impl.getPropertiesUsed().forEach(resolver => {
                this.addRequiredEnvFromResolver(resolver instanceof CoreResolver
                    ? resolver
                    : resolver as ArrayResolver
                );
            })
        );

        const errors: string[] = [];
        const {resolvedConfig, obfuscatedConfig} =
            this.resolveValuesRecursive(valueBuilders as ValueBuilderConfig, errors);

        if (errors.length) {
            this.builtWithErrors = true;
            throw new Error(errors.join(`\n\n${"-".repeat(100)}\n\n`));
        }

        const wrapped = wrapInProxiesRecursive("", resolvedConfig);

        if (this.setupSingleton) {
            // Allows subsequent usage by import at the top of the file rather than passing the config
            // around between functions.
            singletonConfigInstance = wrapped;
        }

        this.builtConfig = wrapped;
        this.obfuscatedConfig = obfuscatedConfig;

        return wrapped;
    }

    private resolveValuesRecursive(intermediate: ValueBuilderConfig|ConfigValue, errors: string[]): {
        resolvedConfig: ResolvedConfig;
        obfuscatedConfig: ResolvedConfig;
    } {
        return Object.entries(intermediate as ValueBuilderConfig).reduce((acc, [key, valueBuilder]) => {
            let resolvedValue;
            let obfuscatedValue;

            if (valueBuilder instanceof ValueBuilder) {
                const result = valueBuilder.build();
                if (result === true) {
                    const {value, logValue} = valueBuilder.value;
                    resolvedValue = value;
                    obfuscatedValue = logValue;
                } else {
                    errors.push(result);
                    resolvedValue = null;
                    obfuscatedValue = null;
                }
            } else {
                if (typeof valueBuilder === "function") {
                    try {
                        const result = (valueBuilder as () => unknown)();
                        resolvedValue = result;
                        obfuscatedValue = result;
                    } catch (e) {
                        errors.push(`An error occurred whilst executing a configuration function: ${e.toString()}`);
                        resolvedValue = null;
                        obfuscatedValue = null;
                    }
                } else if (isRecursableObject(valueBuilder)) {
                    const {resolvedConfig, obfuscatedConfig} = this.resolveValuesRecursive(valueBuilder, errors);
                    resolvedValue = resolvedConfig;
                    obfuscatedValue = obfuscatedConfig;
                } else {
                    resolvedValue = valueBuilder;
                    obfuscatedValue = valueBuilder;
                }
            }

            return {
                resolvedConfig: {
                    ...acc.resolvedConfig,
                    [key]: resolvedValue
                },
                obfuscatedConfig: {
                    ...acc.obfuscatedConfig,
                    [key]: obfuscatedValue
                }
            };
        }, {resolvedConfig: {}, obfuscatedConfig: {}});
    }

    private mapIntoValueBuildersRecursive(path: string, intermediate: ConfigReturnType): ValueBuilderConfig|ConfigValue {
        return Object.entries(intermediate).reduce((acc, [key, value]) => {
            const newPath = createObjectPath(path, key);

            if (value instanceof CoreResolver || value instanceof ArrayResolver) {
                this.addRequiredEnvFromResolver(value);
            }

            return isRecursableObject(value) ?
                {
                    ...acc,
                    [key]: this.mapIntoValueBuildersRecursive(newPath, value as ConfigReturnType)
                } :
                {
                    ...acc,
                    [key]: ValueBuilder.canWrap(value) ? new ValueBuilder(value as CoreResolver, newPath) : value
                };
        }, {});
    }

    private addRequiredEnvFromResolver(resolver: CoreResolver|ArrayResolver): void {
        const base = resolver instanceof ArrayResolver ? resolver.base : resolver;

        this.requiredEnvironmentVariables.push({
            name: base.envKey,
            type: `${resolver.type || ConfigValueType.STRING}${resolver instanceof ArrayResolver ? "[]" : ""}`,
            isSecret: base.isSecret,
            ...base.validator.name && {
                validator: base.validator.name
            },
            ...resolver instanceof ArrayResolver && {
                separator: resolver.splitOn
            },
            ...base.defaultValue !== undefined && {
                default: `${base.defaultValue}`
            }
        });
    }
}

function resetSingleton(): void {
    singletonConfigInstance = null;
}

const singleton = new Proxy({} as ResolvedConfig, {
    get(target: ResolvedConfig, p: PropertyKey): unknown|ConfigValue|ConfigValue[] {
        if (singletonConfigInstance === null) {
            throw new Error("Singleton export not available. Are you sure you've configured it, " +
                "or perhaps build() hasn't been called?"
            );
        } else {
            return singletonConfigInstance[p.toString()];
        }
    },

    set(target: ResolvedConfig, p: PropertyKey, value: ConfigValue|ConfigValue[]): boolean {
        if (singletonConfigInstance === null) {
            throw new Error("Singleton export not available. Are you sure you've configured it, " +
                "or perhaps build() hasn't been called?"
            );
        } else {
            singletonConfigInstance[p.toString()] = value;
            return true;
        }
    }
});

export {
    singleton,
    resetSingleton,
    ConfigBuilder,
    ResolvedConfig,
    PlugAndPlayEnvironment,
    InjectedEnvironment,
    ConfigValue,
    ConfigReturnType,
    azurePnP,
    mongoPnP,
    kafkaPnP,
    launchDarklyPnP
};
