import {ConfigValue, ConfigValueType, Validator} from "./config";

export type EnvironmentProperty = {
    name: string;
    envKey: string;
    secret: boolean;
    type: ConfigValueType;
    default?: ConfigValue;
    validator?: {name: string, fn: Validator};
};

export type EnvironmentArrayProperty = EnvironmentProperty & {
    splitOn: string;
}

export type Environment = {
    name: string;
    properties: (EnvironmentProperty|EnvironmentArrayProperty)[];
};
