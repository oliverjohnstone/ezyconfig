import {InjectedEnvironment} from "../injectedEnvironment";

export type ConfigValue = null|string|number|boolean|(() => unknown)|Record<string, unknown>;
export type ArrayConfigValue = ConfigValue[];
export type ConfigReturnType = {
    [key: string]: PublicCoreResolverInterface|PublicArrayResolverInterface|ConfigValue|ConfigReturnType|ArrayConfigValue;
};

type DefaultOnUnknown<T, D> =
    T extends ConfigValue ? T :
    T extends ArrayConfigValue ? T :
    D;

type MutableConfig<T extends Record<string, unknown>> = {
    -readonly [K in keyof T]: T[K] extends Record<string, unknown> ? MutableConfig<T[K]> : T[K];
}

export type Config<Fn extends ConfigFunction, T = ReturnType<Fn>> = {
    readonly [K in keyof T]:
        // Recursion on nested objects
        T[K] extends Record<string, unknown> ? Config<Fn, T[K]> :
        // Primitive resolver maps to the user specified type
        T[K] extends PublicCoreResolverInterface ? DefaultOnUnknown<ReturnType<T[K]["value"]>, string> :
        // Primitive array resolver maps to the user specified type as an array
        T[K] extends PublicArrayResolverInterface ? DefaultOnUnknown<ReturnType<T[K]["value"]>, string[]> :
        T[K];
} & {
    toJSON: () => MutableConfig<Config<Fn, T>>;
}

export type PlugAndPlayEnvironment = Record<string, Record<string, ConfigValue>>;
export type ConfigFunction = (environment: InjectedEnvironment, plugAndPlay: PlugAndPlayEnvironment) => ConfigReturnType;
export type Validator = (value: ConfigValue) => boolean;
export type Validators = {
    isAlpha: Validator,
    isAlphanumeric: Validator,
    isAscii: Validator,
    isBase32: Validator,
    isBase64: Validator,
    isBIC: Validator,
    isBtcAddress: Validator,
    isByteLength: Validator,
    isCurrency: Validator,
    isDataURI: Validator,
    isDate: Validator,
    isDecimal: Validator,
    isDivisibleBy: Validator,
    isEAN: Validator,
    isEmail: Validator,
    isFQDN: Validator,
    isHash: Validator,
    isHexadecimal: Validator,
    isHexColor: Validator,
    isHSL: Validator,
    isIBAN: Validator,
    isIP: Validator,
    isIPRange: Validator,
    isISO8601: Validator,
    isISO31661Alpha2: Validator,
    isISO31661Alpha3: Validator,
    isJWT: Validator,
    isLocale: Validator,
    isLowercase: Validator,
    isMACAddress: Validator,
    isMD5: Validator,
    isMimeType: Validator,
    isMongoId: Validator,
    isMultibyte: Validator,
    isNumeric: Validator,
    isOctal: Validator,
    isRFC3339: Validator,
    isRgbColor: Validator,
    isSemVer: Validator,
    isUppercase: Validator,
    isSlug: Validator,
    isURL: Validator,
    isUUID: Validator,
    isVariableWidth: Validator,
    isPort: Validator,
    isMongoConnectionString: Validator,
    fileExists: Validator
};

export enum ConfigValueType {
    STRING = "STRING",
    NUMBER = "NUMBER",
    INTERVAL = "INTERVAL",
    BOOLEAN = "BOOLEAN",
    OBJECT = "OBJECT"
}

export interface PublicArrayResolverInterface<T = unknown[]> {
    value(): T;
    ofIntervals(): PublicArrayResolverInterface<number[]>;
    ofNumbers(): PublicArrayResolverInterface<number[]>;
    ofBooleans(): PublicArrayResolverInterface<boolean[]>;
    ofObjects<O extends Record<string, unknown>>(): PublicArrayResolverInterface<O[]>;
    validate({name, fn}: {name: string, fn: Validator}): PublicArrayResolverInterface<T>
}

export interface PublicCoreResolverInterface<T = unknown> {
    value(): T;
    asInterval(): PublicCoreResolverInterface<number>;
    asNumber(): PublicCoreResolverInterface<number>;
    asBoolean(): PublicCoreResolverInterface<boolean>;
    asObject<O extends Record<string, unknown>>(): PublicCoreResolverInterface<O>;
    asArray(splitOn: string): PublicArrayResolverInterface;
    validate({name, fn}: {name: string, fn: Validator}): PublicCoreResolverInterface<T>;
}
