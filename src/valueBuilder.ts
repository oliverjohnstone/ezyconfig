import {ArrayResolver} from "./resolvers/array";
import {CoreResolver} from "./resolvers/core";
import {ConfigValue} from "./types/config";

export class ValueBuilder {
    private readonly resolver: CoreResolver|ArrayResolver;
    private readonly path: string;
    private built: boolean;

    constructor(resolver: CoreResolver|ArrayResolver, path: string) {
        this.resolver = resolver;
        this.path = path;
        this.built = false;
    }

    public static canWrap(value: unknown): boolean {
        return value ? value instanceof CoreResolver || value instanceof ArrayResolver : false;
    }

    public build(): string | true {
        this.resolver.build();
        const errors = this.resolver.getBuildErrors();
        if (errors.length) {
            return `The following errors occurred whilst building the config value at "${this.path}"\n\n\t- ` +
                errors.join("\n\t- ");
        }

        this.built = true;
        return true;
    }

    public get value(): {value: ConfigValue|ConfigValue[], logValue: ConfigValue|ConfigValue[]}  {
        return {
            value: this.resolver.value,
            logValue: this.resolver.logValue
        };
    }
}
