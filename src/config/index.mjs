"use strict";

// Import modules
import {
    existsSync,
    readFileSync,
} from "node:fs";

import {
    parse as parseTOML,
} from "toml";

let clientConfig = {};

export const loadConfig = () => {
    const {
        pathname: configFilename
    } = new URL('../../config.toml', import.meta.url);

    if (!existsSync(configFilename)) {
        throw Error("config.toml not exists");
    }

    const configFileContent = readFileSync(configFilename, "utf-8");
    if (!configFileContent) {
        throw Error("config.toml is invalid");
    }

    clientConfig = parseTOML(configFileContent);
};

export const useConfig = () => clientConfig;
