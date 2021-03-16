import {CoreResolver} from "./resolvers/core";
import {
    ConfigValueType,
    PlugAndPlayEnvironment,
    PublicArrayResolverInterface,
    PublicCoreResolverInterface
} from "./types/config";
import {Environment, EnvironmentArrayProperty, EnvironmentProperty} from "./types/environment";

type ResolverObject = {
    [key: string]: PublicCoreResolverInterface|PublicArrayResolverInterface
};

function isArrayType(resolver: EnvironmentProperty|EnvironmentArrayProperty): resolver is EnvironmentArrayProperty {
    return typeof (resolver as EnvironmentArrayProperty).splitOn !== "undefined";
}

export class PlugAndPlayEnvironmentImpl {
    private propertiesUsed: (PublicCoreResolverInterface|PublicArrayResolverInterface)[] = [];
    private environment: Environment;
    private resolvers: ResolverObject = {};

    constructor(env: Environment) {
        this.environment = env;
        this.buildResolvers();
    }

    private buildResolvers(): void {
        this.resolvers = this.environment.properties.reduce((acc, prop) => {
            if (acc[prop.name]) {
                throw new Error(
                    `${this.environment.name} PnP environment already has a definition for "${prop.name}"`
                );
            }

            let resolver: PublicCoreResolverInterface|PublicArrayResolverInterface =
                new CoreResolver(prop.envKey, prop.default, prop.secret);

            if (isArrayType(prop)) {
                resolver = resolver.asArray(prop.splitOn);
                switch (prop.type) {
                case ConfigValueType.BOOLEAN: resolver.ofBooleans(); break;
                case ConfigValueType.NUMBER: resolver.ofNumbers(); break;
                case ConfigValueType.OBJECT: resolver.ofObjects(); break;
                }
            } else {
                switch (prop.type) {
                case ConfigValueType.BOOLEAN: resolver.asBoolean(); break;
                case ConfigValueType.NUMBER: resolver.asNumber(); break;
                case ConfigValueType.OBJECT: resolver.asObject(); break;
                }
            }

            if (prop.validator) {
                resolver.validate(prop.validator);
            }

            return {
                ...acc,
                [prop.name]: resolver
            };
        }, {} as ResolverObject);
    }

    getValue(property: string): PublicCoreResolverInterface|PublicArrayResolverInterface {
        const resolver = this.resolvers[property];
        if (!resolver) {
            throw new Error(
                `${this.environment.name} PnP environment does not have "${property}" defined.`
            );
        }

        this.propertiesUsed.push(resolver);
        return resolver;
    }

    getPropertiesUsed(): (PublicCoreResolverInterface|PublicArrayResolverInterface)[] {
        return this.propertiesUsed;
    }
}

export function createPlugAndPlayEnvironment(env: Environment): {
    env: PlugAndPlayEnvironment, impl: PlugAndPlayEnvironmentImpl
} {
    const impl = new PlugAndPlayEnvironmentImpl(env);
    const envProxy = new Proxy({} as PlugAndPlayEnvironment, {
        get(target: PlugAndPlayEnvironment, p: PropertyKey, receiver: unknown): unknown {
            if (Reflect.has(target, p)) {
                return Reflect.get(target, p, receiver);
            }
            return impl.getValue(p.toString());
        },
        set(): boolean {
            throw new Error(`The PnP environment, ${env.name}, is immutable.`);
        }
    });

    return {impl, env: envProxy};
}
