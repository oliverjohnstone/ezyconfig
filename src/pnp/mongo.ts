import {ConfigValueType} from "../types/config";
import {Environment} from "../types/environment";
import validators from "../validators";

export default {
    name: "mongo",
    properties: [
        {
            name: "user",
            envKey: "MONGO_USER",
            secret: false,
            type: ConfigValueType.STRING
        },
        {
            name: "password",
            envKey: "MONGO_PASSWORD",
            secret: true,
            type: ConfigValueType.STRING
        },
        {
            name: "connection",
            envKey: "MONGO_CONNECTION_STRING",
            secret: false,
            type: ConfigValueType.STRING
        },
        {
            name: "database",
            envKey: "MONGO_DATABASE",
            secret: false,
            type: ConfigValueType.STRING,
            validator: validators.isAlphanumeric
        },

    ]
} as Environment;
