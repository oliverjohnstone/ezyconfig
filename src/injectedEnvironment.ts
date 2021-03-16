import {CoreResolver} from "./resolvers/core";
import {ConfigValue, PublicCoreResolverInterface, Validator} from "./types/config";
import validators from "./validators";

export class InjectedEnvironment {
    public secret(environmentKey: string, defaultValue?: ConfigValue): PublicCoreResolverInterface {
        return new CoreResolver(environmentKey, defaultValue, true);
    }

    public value(environmentKey: string, defaultValue?: ConfigValue|ConfigValue[]): PublicCoreResolverInterface {
        return new CoreResolver(environmentKey, defaultValue, false);
    }

    public get validators(): {[key: string]: {name: string, fn: Validator}} {
        return validators;
    }
}
