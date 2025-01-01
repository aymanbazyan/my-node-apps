const { delay } = require("./utils.js");

let srcObj = {};
let trgObj = {};

let waitingSrc = false;
let waitingTrg = false;

let firstMsg = null;

async function startForwardig(ctx) {
  if (!trgObj.id || !srcObj.id) {
    await ctx.reply("فش قنوات يزم");
    return;
  }

  for (let i = firstMsg; i < 63000; i++) {
    try {
      // check if canceled
      // if (!trgObj.id) return;

      await delay(300);
      // console.log(`Forwarding message ID ${i}`);
      await ctx.telegram.forwardMessage(trgObj.id, srcObj.id, i);
    } catch (error) {
      console.log(`Skipping message id: ${i}`);
      console.log(error);
      continue; // Skip the invalid message and continue the loop
    }
  }
}

async function handleForwaded(ctx) {
  const obj = ctx.update.message.forward_from_chat;
  if (waitingSrc) {
    waitingSrc = false;
    srcObj = obj;
    firstMsg = ctx.update.message.forward_from_message_id;
    console.log(obj);
  } else {
    waitingTrg = false;
    trgObj = obj;
  }

  ctx.reply(`تم حفظ القناة: ${obj.title}`);
}

async function waitChannel(ctx, command) {
  switch (command) {
    case "waitSrc":
      waitingSrc = true;
      return ctx.reply("ابعت اول رسالة من القناة المصدر");

    case "waitTrg":
      waitingTrg = true;
      return ctx.reply("ابعت رسالة من القناة الهدف");
  }
}

function showInfo(ctx) {
  ctx.reply(`
    الهدف: ${trgObj.title} ${trgObj.id}\n
    المصدر: ${srcObj.title} ${srcObj.id}

    هبلش من الرسالة: ${firstMsg}
    `);
}

function cancelReset(ctx) {
  srcObj = {};
  trgObj = {};
  waitingSrc = false;
  waitingTrg = false;
  firstMsg = null;

  ctx.reply("تم حذف كلشي");
}

module.exports = {
  handleForwaded,
  waitChannel,
  showInfo,
  cancelReset,
  startForwardig,
};
