const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    userId : {
        type: String
    },
    industry: {
      type: String,
      trim: true,
    },
    companySize: {
      type: String,
      trim: true,
    },
    foundedYear: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear(),
    },
    type: {
      type: String,
      enum: ["Private", "Public", "Government", "Non-Profit", "Other"],
    },
    specialties: [
      {
        type: String,
        trim: true,
      },
    ],
    teamMembers: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        role: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    contactInfo: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      location: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyDetails", companySchema);
