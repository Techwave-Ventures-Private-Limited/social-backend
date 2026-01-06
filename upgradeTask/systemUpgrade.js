const Plan = require("../modules/plan");
const PLANS = require("../constants/PlanId");

async function createPlans() {
  try {
    for (const plan of PLANS) {
      await Plan.findOneAndUpdate(
        { name: plan.name },
        {
          $set: {
            price: plan.price,
            features: plan.features,
            isActive: true,
            version: plan.version || 1,
          },

          $setOnInsert: {
            name: plan.name,
            currency: "INR",
            durationInDays: plan.durationInDays,
            isRecurring: false,
          },
        },
        {
          upsert: true,
          new: false,
        }
      );
    }

    console.log("Subscription plans synced successfully");
  } catch (error) {
    console.error("Failed to sync plans:", error);
    throw error;
  }
}

module.exports = createPlans;
