const {singleton: config} = require("../lib/index");

module.exports = () => {
    return config.envVars.bool;
};
