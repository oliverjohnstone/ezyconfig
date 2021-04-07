import {ConfigValue, ResolvedConfig} from "./types/config";
import {createObjectPath, isPrimitive, isProxyWhitelist} from "./utils";

function wrap(path: string, config: ResolvedConfig): ResolvedConfig {
    return new Proxy(config, {
        set(target: ResolvedConfig, p: PropertyKey): boolean {
            if (Array.isArray(config)) {
                throw new Error(`Cannot change array ${path}. Config is immutable.`);
            } else {
                throw new Error(`Cannot change property ${createObjectPath(path, p.toString())}. Config is immutable.`);
            }
        },
        get(target: ResolvedConfig, p: PropertyKey, receiver: unknown): unknown|ConfigValue|ConfigValue[] {
            if (p === "toJSON") {
                return () => config;
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

export function wrapInProxiesRecursive(path: string, config: ResolvedConfig): ResolvedConfig {
    if (Array.isArray(config)) {
        return wrap(path, config);
    }

    return wrap(path, Object.entries(config).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: isPrimitive(value)
            ? value
            : wrapInProxiesRecursive(createObjectPath(path, key), value as ResolvedConfig)
    }), {}));
}
