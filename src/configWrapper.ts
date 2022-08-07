import {ConfigFunction, ConfigValue, Config} from "./types/config";
import {createObjectPath, isPrimitive, isProxyWhitelist} from "./utils";
import cloneDeep from "lodash.clonedeep";

function wrap<T extends ConfigFunction>(path: string, config: Config<T>, clone: Config<T>): Config<T> {
    return new Proxy(config, {
        set(target: Config<T>, p: PropertyKey): boolean {
            if (Array.isArray(config)) {
                throw new Error(`Cannot change array ${path}. Config is immutable.`);
            } else {
                throw new Error(`Cannot change property ${createObjectPath(path, p.toString())}. Config is immutable.`);
            }
        },

        get(target: Config<T>, p: PropertyKey, receiver: unknown): unknown|ConfigValue|ConfigValue[] {
            if (p === "toJSON") {
                return () => clone;
            }

            if (Reflect.has(target, p) || isProxyWhitelist(p)) {
                return Reflect.get(target, p, receiver);
            }

            if (Array.isArray(config)) {
                throw new Error(
                    `Cannot get property ${path}[${p.toString()}] because it does not exist in the built config.`
                );
            } else {
                throw new Error(
                    `Cannot get property ${createObjectPath(path, p.toString())} because it does not exist in the built config.`
                );
            }
        }
    });
}

export function wrapInProxiesRecursive<T extends ConfigFunction>(path: string, config: Config<T>): Config<T> {
    const clone = cloneDeep(config);

    if (Array.isArray(config)) {
        return wrap(path, config, clone);
    }

    return wrap(path, Object.entries(config).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: isPrimitive(value)
            ? value
            : wrapInProxiesRecursive(createObjectPath(path, key), value as Config<T>)
    }), {} as Config<T>), clone);
}
