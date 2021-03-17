import pnp from "../src/pnp";

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
});
