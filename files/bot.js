const { Telegraf } = require("telegraf");
const {
  handleForwaded,
  waitChannel,
  showInfo,
  cancelReset,
  startForwardig,
} = require("./controller.js");
const bot = new Telegraf(process.env.MY_TOKEN);

bot.start((ctx) => ctx.reply("مرحبا"));
bot.help((ctx) => ctx.reply("حدد قناة مصدر ثم قناة هدف ثم أعطي أمر للنسخ"));

bot.hears("/start_forward", startForwardig);
bot.hears("/source", (ctx) => waitChannel(ctx, "waitSrc"));
bot.hears("/target", (ctx) => waitChannel(ctx, "waitTrg"));

bot.hears("/show_info", showInfo);
bot.hears("/cancel_and_reset", cancelReset);

bot.use(async (ctx) => {
  // is forwaded
  console.log(ctx?.update?.message);
  if (ctx?.update?.message?.forward_origin) handleForwaded(ctx);
  else ctx.reply("لا");
});

module.exports = bot;
