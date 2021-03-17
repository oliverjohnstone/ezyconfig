import {kafka, azure, launchDarkly, mongo} from "../src/pnp";

describe("Default Plug and Play Environments", () => {
    test("kafka is configured correctly", () => {
        expect(kafka).toMatchSnapshot();
    });

    test("mongo is configured correctly", () => {
        expect(mongo).toMatchSnapshot();
    });

    test("azure is configured correctly", () => {
        expect(azure).toMatchSnapshot();
    });

    test("launch darkly is configured correctly", () => {
        expect(launchDarkly).toMatchSnapshot();
    });
});
