async function delay(ms) {
  await new Promise((res) => {
    setTimeout(() => {
      res();
    }, ms);
  });
}

module.exports = { delay };
