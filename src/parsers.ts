export function parseBoolean(value: string, isSecret: boolean): boolean|string {
    switch (value.toUpperCase().trim()) {
    case "TRUE":
    case "1":
    case "T": return true;
    case "FALSE":
    case "0":
    case "F": return false;
    default:
        return isSecret
            ? "Unable to parse secret value into boolean"
            : `Unable to parse value "${value}" into boolean`;
    }
}

export function parseNumber(value: string, isSecret: boolean): number|string {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        return isSecret
            ? "Unable to parse secret value into number"
            : `Unable to parse value "${value}" into number`;
    }
    return num;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseObject(value: string, isSecret: boolean): any|string {
    try {
        return JSON.parse(value);
    } catch (e) {
        return isSecret
            ? "Unable to parse secret value into JSON"
            : `Unable to parse value "${value}" into JSON`;
    }
}
