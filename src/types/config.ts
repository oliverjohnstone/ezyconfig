import {InjectedEnvironment} from "../injectedEnvironment";

export type ConfigValue = null|string|number|boolean|(() => unknown)|Record<string, unknown>;
export type ArrayConfigValue = ConfigValue[];
export type ConfigReturnType = {
    [key: string]: PublicCoreResolverInterface|PublicArrayResolverInterface|ConfigValue|ConfigReturnType|ArrayConfigValue;
};

// Really the following type should be a primitive rather than "any" but to avoid consumer
// typescript compilation issues with accessing a property of null etc, we set to "any"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResolvedConfig = Record<string, any>;

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

export interface PublicArrayResolverInterface {
    ofIntervals(): PublicArrayResolverInterface;
    ofNumbers(): PublicArrayResolverInterface;
    ofBooleans(): PublicArrayResolverInterface;
    ofObjects(): PublicArrayResolverInterface;
    validate({name, fn}: {name: string, fn: Validator}): PublicArrayResolverInterface
}

export interface PublicCoreResolverInterface {
    asInterval(): PublicCoreResolverInterface;
    asNumber(): PublicCoreResolverInterface;
    asBoolean(): PublicCoreResolverInterface;
    asObject(): PublicCoreResolverInterface;
    asArray(splitOn: string): PublicArrayResolverInterface;
    validate({name, fn}: {name: string, fn: Validator}): PublicCoreResolverInterface;
}
