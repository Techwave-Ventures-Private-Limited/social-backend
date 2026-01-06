const crypto = require("crypto");

function generateReferralCode() {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();
}

module.exports = generateReferralCode;