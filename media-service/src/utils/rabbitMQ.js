require("dotenv").config();
const amqp = require("amqplib");
const { logger } = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to rabbit mq");
    return channel;
  } catch (e) {
    logger.error("Error connection to rabbit mq", e);
    return null;
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );

  logger.info(`Event published ${routingKey}`);
}

// Consume events for a given routing key.
// Optional `callback` will be invoked with the parsed message content.
async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectRabbitMQ();
  }
  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());

      // Only call the callback if it is provided and is a function
      if (typeof callback === "function") {
        try {
          callback(content);
        } catch (err) {
          logger.error("Error in RabbitMQ consumer callback", err);
        }
      } else {
        logger.info(
          `Received event for routingKey "${routingKey}" with content: ${JSON.stringify(
            content
          )}`
        );
      }

      channel.ack(msg);
    }
  });

  logger.info(`Subscribed to event: ${routingKey}`);
}

module.exports = { connectRabbitMQ, publishEvent, consumeEvent };
