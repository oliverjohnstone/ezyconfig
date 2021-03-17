module.exports = {
    name: "mongo",
    properties: [
        {
            name: "host",
            envKey: "MONGO_HOST",
            secret: false,
            type: "STRING"
        }
    ]
};
