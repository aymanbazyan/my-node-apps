const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const bot = require("./files/bot.js");
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
