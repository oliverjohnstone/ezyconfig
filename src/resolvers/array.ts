import {parseBoolean, parseNumber, parseObject, parseInterval} from "../parsers";
import {ArrayConfigValue, ConfigValue, ConfigValueType, PublicArrayResolverInterface, Validator} from "../types/config";
import {CoreResolver} from "./core";

// Create a decorator of CoreResolver with exclusive array based functions
export class ArrayResolver implements PublicArrayResolverInterface {
    public readonly base: CoreResolver;
    public readonly splitOn: string;
    private buildErrors: string[] = [];
    private parsedValue: ArrayConfigValue = [];
    public type: ConfigValueType = ConfigValueType.STRING;

    constructor(baseResolver: CoreResolver, splitOn: string) {
        this.base = baseResolver;
        this.splitOn = splitOn;
    }

    public get value(): ArrayConfigValue {
        return this.parsedValue.length ? this.parsedValue : (this.base.defaultValue as ArrayConfigValue);
    }

    public get logValue(): ArrayConfigValue {
        return this.base.isSecret ? this.value.map(() => "****") : this.value;
    }

    public ofIntervals(): PublicArrayResolverInterface {
        this.type = ConfigValueType.INTERVAL;
        return this;
    }

    public ofNumbers(): PublicArrayResolverInterface {
        this.type = ConfigValueType.NUMBER;
        return this;
    }

    public ofBooleans(): PublicArrayResolverInterface {
        this.type = ConfigValueType.BOOLEAN;
        return this;
    }

    public ofObjects():  PublicArrayResolverInterface {
        this.type = ConfigValueType.OBJECT;
        return this;
    }

    public validate(validator: {name: string, fn: Validator}): PublicArrayResolverInterface {
        this.base.validate(validator);
        return this;
    }

    public getBuildErrors(): string[] {
        return [
            ...this.base.getBuildErrors(),
            ...this.buildErrors
        ];
    }

    private validateDefaultValue(): boolean {
        if (!Array.isArray(this.base.defaultValue)) {
            this.buildErrors.push(`Expected default value to be ${this.type}[] but received ${typeof this.base.defaultValue}`);
            return false;
        }

        let expectedType = "string";

        switch (this.type) {
        case ConfigValueType.NUMBER: expectedType = "number"; break;
        case ConfigValueType.OBJECT: expectedType = "object"; break;
        case ConfigValueType.BOOLEAN: expectedType = "boolean"; break;
        }

        if (!this.base.defaultValue.every(v => typeof v === expectedType)) {
            this.buildErrors.push(`Expected every value in default array to be a ${this.type}`);
            return false;
        }

        return true;
    }

    build(): void {
        const envVar = this.base.envValue;
        if (envVar === null) {
            if (typeof this.base.defaultValue !== "undefined") {
                this.validateDefaultValue();
            } else {
                this.buildErrors.push(
                    `No environment variable found for ${this.base.envKey} and no default value specified.`
                );
            }

            return;
        }

        const parts = `${envVar}`.split(this.splitOn).map(v => v.trim()).filter(Boolean);

        if (!parts.length) {
            this.buildErrors.push(`Unable to find array elements in array value when splitting on "${this.splitOn}"`);
            return;
        }

        let parser: ((v: string, isSecret: boolean) => boolean|string|number)|null;

        switch (this.type) {
        case ConfigValueType.BOOLEAN: parser = parseBoolean; break;
        case ConfigValueType.NUMBER: parser = parseNumber; break;
        case ConfigValueType.OBJECT: parser = parseObject; break;
        case ConfigValueType.INTERVAL: parser = parseInterval; break;
        default: parser = null;
        }

        type ReduceType = {errors: string[], parsedValue: ConfigValue[]};
        const {errors, parsedValue} = parts.reduce((acc, part, i) => {
            let value: ConfigValue = part;

            if (parser) {
                const parsed = parser(part, this.base.isSecret);

                if (typeof parsed === "string") {
                    // Value failed to parse
                    acc.errors.push(`${parsed} at index ${i}`);
                    acc.parsedValue.push(null);
                    return acc;
                } else {
                    value = parsed;
                }
            }

            if (this.base.validator(value)) {
                // Value is parsed and validated
                acc.parsedValue.push(value);
            } else {
                // Value is parsed but invalid
                acc.errors.push(`Value as index ${i} did not pass validator check for ${this.base.validatorName}`);
                acc.parsedValue.push(null);
            }

            return acc;
        }, {errors: [], parsedValue: []} as ReduceType);

        errors.forEach(e => this.buildErrors.push(e));
        this.parsedValue = parsedValue;
    }
}
