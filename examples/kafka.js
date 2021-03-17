module.exports = {
    name: "kafka",
    properties: [
        {
            name: "host",
            envKey: "KAFKA_HOST",
            secret: false,
            type: "STRING"
        },
        {
            name: "port",
            envKey: "KAFKA_PORT",
            secret: false,
            type: "NUMBER"
        }
    ]
};
