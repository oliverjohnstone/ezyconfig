#!/usr/bin/env node

import {accessSync, constants} from "fs";
import {program, Option} from "commander";
import {ConfigBuilder, RequiredEnvironmentVariableDescription} from "../index";
import path from "path";

function fileExists(file: string) {
    try {
        accessSync(file, constants.F_OK);
    } catch (e) {
        return false;
    }
    return true;
}

function createYML(vars: RequiredEnvironmentVariableDescription[]): string {
    const ymlFrag = ({name}: RequiredEnvironmentVariableDescription): string => `- name: ${name}\n  value: "TODO"`;
    return vars.reduce((acc, envVar) => `${acc}\n\n${ymlFrag(envVar)}`, "");
}

function exec(configFile: string, plugAndPlayFiles: string[], {output}: {output: "table"|"json"|"yml"}) {
    let errors = null;

    const envFiles = plugAndPlayFiles.reduce(
        (acc, file) => [...acc, {file, exists: fileExists(file)}],
        [] as {file: string, exists: boolean}[]
    );

    if (!fileExists(configFile)) {
        console.log(`Config file "${configFile}" does not exist.`);
        return;
    }

    const missingEnvFiles = envFiles.filter(({exists}) => !exists);

    if (missingEnvFiles.length) {
        console.log(`Missing environment file(s):\n\n${missingEnvFiles.map(({file}) => file).join("\n")}`);
        return;
    }

    const builder = new ConfigBuilder();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    envFiles.forEach(({file}) => builder.loadPlugAndPlayEnv(require(path.resolve(file))));

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        let builderFn = require(path.resolve(configFile));

        // Check to see if the config file is compiled typescript and if it is use the default export instead
        if (builderFn.default) {
            builderFn = builderFn.default;
        }

        builder.build(builderFn);
    } catch (e) {
        errors = e;
    }

    try {
        switch (output) {
        case "yml": console.log(createYML(builder.getRequiredEnvironmentVariables())); break;
        case "json": console.log(JSON.stringify(builder.getRequiredEnvironmentVariables(), null, 2)); break;
        case "table": console.table(builder.getRequiredEnvironmentVariables()); break;
        }
    } catch (e) {
        // Log the errors from the build process if they exist, otherwise log this exception
        console.log(errors || e);
    }
}

program
    .arguments("<configFile> [plugAndPlayFiles...]")
    .addOption(
        new Option(
            "-o, --output [output]",
            "The output format to use"
        ).choices(["table", "yml", "json"]).default("table")
    )
    .action(exec)
    .parse(process.argv);
