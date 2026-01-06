const PLAN_FEATURES = require("./PlanFeatures");

const BASIC_FEATURES = Object.values(PLAN_FEATURES.BASIC).map(feature => ({
  key: feature,
  value: true,
}));

const PLANS = [
  {
    name: "Basic Monthly",
    price: 99,
    durationInDays: 30,
    features: BASIC_FEATURES,
  },
  {
    name: "Basic 6 Months",
    price: 499,
    durationInDays: 180,
    features: BASIC_FEATURES,
  },
  {
    name: "Basic 12 Months",
    price: 999,
    durationInDays: 365,
    features: BASIC_FEATURES,
  },
];

module.exports = PLANS;
