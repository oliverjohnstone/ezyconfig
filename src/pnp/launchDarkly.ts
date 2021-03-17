import {ConfigValueType} from "../types/config";
import {Environment} from "../types/environment";

export default {
    name: "launchDarkly",
    properties: [
        {
            name: "apiKey",
            envKey: "LAUNCH_DARKLY_API_KEY",
            secret: false,
            type: ConfigValueType.STRING
        }
    ]
} as Environment;
