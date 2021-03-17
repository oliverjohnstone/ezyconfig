module.exports = (env, {mongo, kafka}) => ({
    one: env.value("ONE", 1).asNumber(),
    two: env.value("TWO", "2"),
    three: env.value("THREE", 3).asNumber().validate(env.validators.isPort),
    four: env.secret("SECRET", "shhh"),
    five: env.value("FIVE").asNumber(),
    six: env.value("SIX", []).asArray(";").ofNumbers(),
    seven: env.value("ONE", 1).asNumber(), // Same as one to test for deduping
    kafkaHost: kafka.host,
    kafkaPort: kafka.port,
    mongoHost: mongo.host,
    answerToTheUltimateQuestionOfLife: 42
});
