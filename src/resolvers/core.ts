import {parseBoolean, parseNumber, parseObject} from "../parsers";
import {
    ConfigValue,
    ConfigValueType,
    PublicArrayResolverInterface,
    PublicCoreResolverInterface,
    Validator
} from "../types/config";
import {ArrayResolver} from "./array";

export class CoreResolver implements PublicCoreResolverInterface {
    public readonly defaultValue: ConfigValue | ConfigValue[] | undefined;
    public readonly envKey: string;
    readonly envValue: string|null;
    public readonly isSecret: boolean;
    public type: ConfigValueType|null = null;
    private buildErrors: string[] = [];
    private parsedValue: ConfigValue|null = null;
    public validator: Validator = () => true;
    public validatorName = "";

    constructor(envKey: string, defaultValue: ConfigValue|ConfigValue[]|undefined, isSecret: boolean) {
        this.envKey = envKey;
        this.envValue = process.env[envKey] !== undefined ? `${process.env[envKey]}` : null;
        this.defaultValue = defaultValue;
        this.isSecret = isSecret;
    }

    private setType(type: ConfigValueType) {
        if (this.type !== null) {
            this.buildErrors.push(`A type of "${this.type}" as already been specified.`);
            return;
        }

        this.type = type;
    }

    private validateDefaultValue(): void {
        let expectedType = "string";

        switch (this.type) {
        case ConfigValueType.NUMBER: expectedType = "number"; break;
        case ConfigValueType.OBJECT: expectedType = "object"; break;
        case ConfigValueType.BOOLEAN: expectedType = "boolean"; break;
        }

        if (typeof this.defaultValue !== expectedType) {
            this.buildErrors.push(
                `Expected default value to be of type ${this.type} but received ${typeof this.defaultValue}`
            );
        }
    }

    public build(): void {
        if (this.envValue === null) {
            if (this.defaultValue) {
                this.validateDefaultValue();
            } else {
                this.buildErrors.push(
                    `No environment variable found for ${this.envKey} and no default value specified.`
                );
            }

            return;
        }

        let parsed;

        switch (this.type) {
        case ConfigValueType.BOOLEAN: parsed = parseBoolean(this.envValue, this.isSecret); break;
        case ConfigValueType.NUMBER: parsed = parseNumber(this.envValue, this.isSecret); break;
        case ConfigValueType.OBJECT: parsed = parseObject(this.envValue, this.isSecret); break;
        default: {
            this.parsedValue = this.envValue;
            if (!this.validator(this.parsedValue as ConfigValue)) {
                this.buildErrors.push(`Value did not pass validator check for ${this.validatorName}`);
            }
            return;
        }
        }

        if (typeof parsed === "string") {
            this.buildErrors.push(parsed);
            this.parsedValue = null;
            return;
        }
        this.parsedValue = parsed;
        if (!this.validator(this.parsedValue as ConfigValue)) {
            this.buildErrors.push(`Value did not pass validator check for ${this.validatorName}`);
        }
    }

    public get parsedEnvValue(): ConfigValue|null {
        return this.parsedValue;
    }

    public get value(): ConfigValue|ConfigValue[] {
        return this.parsedEnvValue || (this.defaultValue as ConfigValue);
    }

    public get logValue(): ConfigValue|ConfigValue[] {
        return this.isSecret ? "****" : this.value;
    }

    public asNumber(): PublicCoreResolverInterface {
        this.setType(ConfigValueType.NUMBER);
        return this;
    }

    public asBoolean(): PublicCoreResolverInterface {
        this.setType(ConfigValueType.BOOLEAN);
        return this;
    }

    public asObject(): PublicCoreResolverInterface {
        this.setType(ConfigValueType.OBJECT);
        return this;
    }

    public asArray(splitOn: string): PublicArrayResolverInterface {
        if (![null, ConfigValueType.STRING].includes(this.type)) {
            this.buildErrors.push(`Can only convert string values to array, but ${this.type} was specified.`);
        }
        return new ArrayResolver(this, splitOn);
    }

    public getBuildErrors(): string[] {
        return this.buildErrors;
    }

    public validate({name, fn}: {name: string, fn: Validator}): PublicCoreResolverInterface {
        this.validator = fn;
        this.validatorName = name;
        return this;
    }
}
