import {ConfigValueType} from "../types/config";
import {Environment} from "../types/environment";

export = {
    name: "azure",
    properties: [
        {
            name: "account",
            envKey: "AZURE_ACCOUNT",
            secret: false,
            type: ConfigValueType.STRING
        },
        {
            name: "key",
            envKey: "AZURE_ACCOUNT_KEY",
            secret: true,
            type: ConfigValueType.STRING
        },
        {
            name: "container",
            envKey: "AZURE_ACCOUNT_CONTAINER",
            secret: false,
            type: ConfigValueType.STRING
        }
    ]
} as Environment;
