import {ConfigValue, ConfigValueType, Validator} from "./config";

type EnvironmentProperty = {
    name: string;
    envKey: string;
    secret: boolean;
    type: ConfigValueType;
    default?: ConfigValue;
    validator?: {name: string, fn: Validator};
};

type EnvironmentArrayProperty = EnvironmentProperty & {
    splitOn: string;
}

type Environment = {
    name: string;
    properties: (EnvironmentProperty|EnvironmentArrayProperty)[];
};
