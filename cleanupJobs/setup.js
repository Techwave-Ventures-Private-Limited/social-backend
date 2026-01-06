const cron = require("node-cron");
const expirePurchases = require("./purchaseTraker.job.js");

function startJobs() {
  cron.schedule("* * * * *", async () => {
    await expirePurchases();
  });

  console.log("Cron jobs started");
}

module.exports = startJobs;
