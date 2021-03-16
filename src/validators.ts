import validators from "validator";
import fs from "fs";
import {ConfigValue, Validator} from "./types/config";

export function isPort(port: ConfigValue): boolean {
    return typeof port === "number" && port > 0 && port < 65535;
}

export function fileExists(filename: ConfigValue): boolean {
    return filename ? fs.existsSync(filename.toString()) : false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapper(fn: (value: string, ...args: any[]) => boolean, name: string): {name: string, fn: Validator} {
    return {
        name,
        fn: (value: ConfigValue) => value ? fn(value.toString()) : false
    };
}

const validatorObj = {
    isAlpha: wrapper(validators.isAlpha, "isAlpha"),
    isAlphanumeric: wrapper(validators.isAlphanumeric, "isAlphanumeric"),
    isAscii: wrapper(validators.isAscii, "isAscii"),
    isBase32: wrapper(validators.isBase32, "isBase32"),
    isBase64: wrapper(validators.isBase64, "isBase64"),
    isBIC: wrapper(validators.isBIC, "isBIC"),
    isBtcAddress: wrapper(validators.isBtcAddress, "isBtcAddress"),
    isByteLength: wrapper(validators.isByteLength, "isByteLength"),
    isCurrency: wrapper(validators.isCurrency, "isCurrency"),
    isDataURI: wrapper(validators.isDataURI, "isDataURI"),
    isDate: wrapper(validators.isDate, "isDate"),
    isDecimal: wrapper(validators.isDecimal, "isDecimal"),
    isDivisibleBy: wrapper(validators.isDivisibleBy, "isDivisibleBy"),
    isEAN: wrapper(validators.isEAN, "isEAN"),
    isEmail: wrapper(validators.isEmail, "isEmail"),
    isFQDN: wrapper(validators.isFQDN, "isFQDN"),
    isHash: wrapper(validators.isHash, "isHash"),
    isHexadecimal: wrapper(validators.isHexadecimal, "isHexadecimal"),
    isHexColor: wrapper(validators.isHexColor, "isHexColor"),
    isHSL: wrapper(validators.isHSL, "isHSL"),
    isIBAN: wrapper(validators.isIBAN, "isIBAN"),
    isIP: wrapper(validators.isIP, "isIP"),
    isIPRange: wrapper(validators.isIPRange, "isIPRange"),
    isISO8601: wrapper(validators.isISO8601, "isISO8601"),
    isISO31661Alpha2: wrapper(validators.isISO31661Alpha2, "isISO31661Alpha2"),
    isISO31661Alpha3: wrapper(validators.isISO31661Alpha3, "isISO31661Alpha3"),
    isJWT: wrapper(validators.isJWT, "isJWT"),
    isLocale: wrapper(validators.isLocale, "isLocale"),
    isLowercase: wrapper(validators.isLowercase, "isLowercase"),
    isMACAddress: wrapper(validators.isMACAddress, "isMACAddress"),
    isMD5: wrapper(validators.isMD5, "isMD5"),
    isMimeType: wrapper(validators.isMimeType, "isMimeType"),
    isMongoId: wrapper(validators.isMongoId, "isMongoId"),
    isMultibyte: wrapper(validators.isMultibyte, "isMultibyte"),
    isNumeric: wrapper(validators.isNumeric, "isNumeric"),
    isOctal: wrapper(validators.isOctal, "isOctal"),
    isRFC3339: wrapper(validators.isRFC3339, "isRFC3339"),
    isRgbColor: wrapper(validators.isRgbColor, "isRgbColor"),
    isSemVer: wrapper(validators.isSemVer, "isSemVer"),
    isUppercase: wrapper(validators.isUppercase, "isUppercase"),
    isSlug: wrapper(validators.isSlug, "isSlug"),
    isURL: wrapper(validators.isURL, "isURL"),
    isUUID: wrapper(validators.isUUID, "isUUID"),
    isVariableWidth: wrapper(validators.isVariableWidth, "isVariableWidth"),
    isPort: {name: "isPort", fn: isPort},
    fileExists: {name: "fileExists", fn: fileExists}
};

export default validatorObj;
