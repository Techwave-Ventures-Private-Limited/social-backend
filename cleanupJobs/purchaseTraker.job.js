const Purchase = require("../modules/purchase");
const User = require("../modules/user");


async function expirePurchases() {
  try {
    const now = new Date();

    // Find expired but still active purchases
    const expiredPurchases = await Purchase.find({
      status: "active",
      endDate: { $lte: now },
    });

    if (!expiredPurchases.length) return;

    const purchaseIds = expiredPurchases.map(p => p._id);
    const userIds = expiredPurchases.map(p => p.userId);

    await Purchase.updateMany(
      { _id: { $in: purchaseIds } },
      { $set: { status: "expired" } }
    );

    await User.updateMany(
      { activePurchase: { $in: purchaseIds } },
      { $set: { activePurchase: null } }
    );

    console.log(`Expired ${expiredPurchases.length} purchases`);
  } catch (error) {
    console.error("Purchase expiry job failed:", error);
  }
}

module.exports = expirePurchases;
