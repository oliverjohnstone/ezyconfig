import {ConfigValueType} from "../types/config";
import {Environment} from "../types/environment";
import validators from "../validators";

export = {
    name: "kafka",
    properties: [
        {
            name: "clientId",
            envKey: "KAFKA_CLIENT_ID",
            type: ConfigValueType.STRING,
            secret: false,
            validator: validators.isAlphanumeric
        },
        {
            name: "saslMechanism",
            envKey: "KAFKA_SASL_MECHANISM",
            type: ConfigValueType.STRING,
            secret: false
        },
        {
            name: "username",
            envKey: "KAFKA_CLUSTER_API_KEY",
            type: ConfigValueType.STRING,
            secret: false
        },
        {
            name: "password",
            envKey: "KAFKA_CLUSTER_API_SECRET",
            type: ConfigValueType.STRING,
            secret: true
        },
        {
            name: "schemaRegistry",
            envKey: "KAFKA_SCHEMA_REGISTRY_URL",
            type: ConfigValueType.STRING,
            validator: validators.isURL,
            secret: false
        },
        {
            name: "schemaRegistryUser",
            envKey: "KAFKA_SCHEMA_REGISTRY_API_KEY",
            type: ConfigValueType.STRING,
            secret: false
        },
        {
            name: "schemaRegistryPass",
            envKey: "KAFKA_SCHEMA_REGISTRY_API_SECRET",
            type: ConfigValueType.STRING,
            secret: true
        },
        {
            name: "enableSSL",
            envKey: "KAFKA_SSL",
            type: ConfigValueType.BOOLEAN,
            secret: false
        },
        {
            name: "brokers",
            envKey: "KAFKA_BROKERS",
            type: ConfigValueType.STRING,
            secret: false,
            splitOn: ","
        },
        {
            name: "requestTimeout",
            envKey: "KAFKA_REQUEST_TIMEOUT",
            type: ConfigValueType.NUMBER,
            secret: false
        },
        {
            name: "maxRetries",
            envKey: "KAFKA_MAX_RETRIES",
            type: ConfigValueType.NUMBER,
            secret: false
        },
        {
            name: "consumerGroup",
            envKey: "KAFKA_CONSUMER_GROUP",
            type: ConfigValueType.STRING,
            secret: false
        },
        {
            name: "namespace",
            envKey: "KAFKA_NAMESPACE",
            type: ConfigValueType.STRING,
            secret: false
        },
        {
            name: "schemaRegistryClient",
            envKey: "KAFKA_COLLECTION_SERVICE_CLIENT",
            type: ConfigValueType.STRING,
            secret: false
        }
    ]
} as Environment;
