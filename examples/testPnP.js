module.exports = {
    name: "testPnP",
    properties: [
        {
            name: "propOne",
            envKey: "PROP_ONE",
            secret: false,
            type: "STRING"
        },
        {
            name: "propTwo",
            envKey: "PROP_TWO",
            secret: true,
            type: "STRING"
        },
        {
            name: "propThree",
            envKey: "PROP_THREE",
            secret: false,
            type: "STRING"
        }
    ]
};
