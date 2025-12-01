const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: String,
        required: true,
        unique: true, // e.g., "google.com", "connektx.tech"
        lowercase: true
    },
    logo: {
        type: String, 
        default: "" 
    },
    isVerified: { 
        type: Boolean, 
        default: true 
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Company", companySchema);