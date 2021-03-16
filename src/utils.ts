import {ArrayResolver} from "./resolvers/array";
import {CoreResolver} from "./resolvers/core";

export function createObjectPath(path: string, key: string): string {
    return path.length ? `${path}.${key}`: key;
}

export function isPrimitive(value: unknown): boolean {
    return ["string", "number", "boolean", "undefined"].includes(typeof value) || value === null;
}

export function isRecursableObject(value: unknown): boolean {
    return typeof value === "object" &&
        !(value instanceof CoreResolver || value instanceof ArrayResolver || value === null || Array.isArray(value));
}

export function isProduction(): boolean {
    return (process.env.NODE_ENV || "").toLowerCase().trim() === "production";
}

export function isProxyWhitelist(p: PropertyKey): boolean {
    // List of methods/accessors to not throw exceptions on for proxy objects/arrays
    return  [
        "asymmetricMatch",
        "Symbol(Symbol.iterator)",
        "Symbol(Symbol.toStringTag)",
        "@@__IMMUTABLE_ITERABLE__@@",
        "@@__IMMUTABLE_RECORD__@@",
        "@@iterator",
        "$$typeof",
        "nodeType",
        "tagName",
        "hasAttribute",
        "forEach",
        "every",
        "filter",
        "find",
        "includes",
        "indexOf",
        "keys",
        "map",
        "reduce",
        "some",
        "values",
        "entries"
    ].includes(p.toString());
}
