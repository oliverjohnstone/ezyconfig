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
    Config
} from "./types/config";
import {Environment} from "./types/environment";
import {createObjectPath, isProduction, isRecursableObject} from "./utils";
import {ValueBuilder} from "./valueBuilder";

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

class ConfigBuilder {
    private readonly plugAndPlayEnvs: PlugAndPlayEnvs = {};
    private requiredEnvironmentVariables: RequiredEnvironmentVariableDescription[] = [];
    private builtConfig: Record<string, unknown>|null = null;
    private builtWithErrors = false;
    private obfuscatedConfig: Record<string, unknown>|null = null;

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

    public getLoggableConfigObject<T extends ConfigFunction>(): Config<T> {
        if (!this.builtConfig) {
            throw new Error("Config should be built before getting the loggable config object.");
        }
        return this.obfuscatedConfig as Config<T>;
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

    public build<T extends ConfigFunction>(configFn: T): Config<T> {
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
            this.resolveValuesRecursive<T>(valueBuilders as ValueBuilderConfig, errors);

        if (errors.length) {
            this.builtWithErrors = true;
            throw new Error(errors.join(`\n\n${"-".repeat(100)}\n\n`));
        }

        const wrapped = wrapInProxiesRecursive<T>("", resolvedConfig);

        this.builtConfig = wrapped;
        this.obfuscatedConfig = obfuscatedConfig;

        return wrapped;
    }

    private resolveValuesRecursive<T extends ConfigFunction>(intermediate: ValueBuilderConfig|ConfigValue, errors: string[]): {
        resolvedConfig: Config<T>;
        obfuscatedConfig: Config<T>;
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
        }, {resolvedConfig: {} as Config<T>, obfuscatedConfig: {} as Config<T>});
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

export { ConfigBuilder };

export default function build<T extends ConfigFunction>(configFn: T): Config<T> {
    return new ConfigBuilder().build(configFn);
}
