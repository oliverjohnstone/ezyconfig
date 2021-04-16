import {ConfigBuilder} from "../src";
import pnp from "../src/pnp";
import {ConfigReturnType} from "../src/types/config";

describe("Default Plug and Play Environments", () => {
    test("kafka is configured correctly", () => {
        expect(pnp.kafka).toMatchSnapshot();
    });

    test("mongo is configured correctly", () => {
        expect(pnp.mongo).toMatchSnapshot();
    });

    test("azure is configured correctly", () => {
        expect(pnp.azure).toMatchSnapshot();
    });

    test("launch darkly is configured correctly", () => {
        expect(pnp.launchDarkly).toMatchSnapshot();
    });

    describe("kafka", () => {
        test.each([
            ["KAFKA_CLIENT_ID", "client", "client" , "clientId"],
            ["KAFKA_SASL_MECHANISM", "plain", "plain", "saslMechanism"],
            ["KAFKA_CLUSTER_API_KEY", "some-api-key", "some-api-key", "username"],
            ["KAFKA_CLUSTER_API_SECRET", "secret", "secret", "password"],
            ["KAFKA_SCHEMA_REGISTRY_URL", "url", "url", "schemaRegistry"],
            ["KAFKA_SCHEMA_REGISTRY_API_KEY", "api-key", "api-key", "schemaRegistryUser"],
            ["KAFKA_SCHEMA_REGISTRY_API_SECRET", "secret", "secret", "schemaRegistryPass"],
            ["KAFKA_SSL", "false", false, "enableSSL"],
            ["KAFKA_BROKERS", "broker1,broker2,broker3", ["broker1", "broker2", "broker3"], "brokers"],
            ["KAFKA_REQUEST_TIMEOUT", "500", 500, "requestTimeout"],
            ["KAFKA_MAX_RETRIES", "50", 50, "maxRetries"],
            ["KAFKA_CONSUMER_GROUP", "group", "group", "consumerGroup"],
            ["KAFKA_NAMESPACE", "namespace", "namespace", "namespace"],
            ["KAFKA_COLLECTION_SERVICE_CLIENT", "service-client", "service-client", "schemaRegistryClient"]
        ])("the env key %s maps the value of '%s' to %j", (key, value, expected, prop) => {
            ConfigBuilder.setDevelopmentEnvironmentVariables({[key]: value});
            const config = (new ConfigBuilder())
                .loadPlugAndPlayEnv(pnp.kafka)
                .build((env, {kafka}): ConfigReturnType => ({[prop]: kafka[prop]}));

            expect(config[prop]).toEqual(expected);
        });
    });

    describe("mongo", () => {
        test.each([
            ["MONGO_USER", "user", "user", "user"],
            ["MONGO_PASSWORD", "pass", "pass", "password"],
            ["MONGO_CONNECTION_STRING", "conn-string", "conn-string", "connection"],
            ["MONGO_DATABASE", "db", "db", "database"]
        ])("the env key %s maps the value of '%s' to %j", (key, value, expected, prop) => {
            ConfigBuilder.setDevelopmentEnvironmentVariables({[key]: value});
            const config = (new ConfigBuilder())
                .loadPlugAndPlayEnv(pnp.mongo)
                .build((env, {mongo}): ConfigReturnType => ({[prop]: mongo[prop]}));

            expect(config[prop]).toEqual(expected);
        });
    });

    describe("azure", () => {
        test.each([
            ["AZURE_ACCOUNT", "account", "account", "account"],
            ["AZURE_ACCOUNT_KEY", "key", "key", "key"],
            ["AZURE_ACCOUNT_CONTAINER", "container-name", "container-name", "container"]
        ])("the env key %s maps the value of '%s' to %j", (key, value, expected, prop) => {
            ConfigBuilder.setDevelopmentEnvironmentVariables({[key]: value});
            const config = (new ConfigBuilder())
                .loadPlugAndPlayEnv(pnp.azure)
                .build((env, {azure}): ConfigReturnType => ({[prop]: azure[prop]}));

            expect(config[prop]).toEqual(expected);
        });
    });

    describe("launchDarkly", () => {
        test.each([
            ["LAUNCH_DARKLY_API_KEY", "key", "key", "apiKey"]
        ])("the env key %s maps the value of '%s' to %j", (key, value, expected, prop) => {
            ConfigBuilder.setDevelopmentEnvironmentVariables({[key]: value});
            const config = (new ConfigBuilder())
                .loadPlugAndPlayEnv(pnp.launchDarkly)
                .build((env, {launchDarkly}): ConfigReturnType => ({[prop]: launchDarkly[prop]}));

            expect(config[prop]).toEqual(expected);
        });
    });
});
