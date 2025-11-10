const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  companyName: { type: String, required: true },
  location: { type: String, index: true }, // Index for fast location filtering
  imageUrl: String,
  type: { type: String, index: true }, // e.g., "In - Office", "Remote"
  salary: String,
  redirectLink: { type: String, required: true, unique: true },
  requiredExperience: String,
  skills: String,
  postedDate: { type: Date, default: Date.now, index: true }, // Index for sorting/filtering
  
  // From your scraper logic
  Search_Keywords: { type: [String], index: true },
  
  // API's original ID
  _id: { type: String, required: true },
}, {
  // Automatically add createdAt and updatedAt
  timestamps: true
});

// --- IMPORTANT: Text Index for ?search= ---
// This powers the $text search on these fields
jobSchema.index({
  title: 'text',
  companyName: 'text',
  skills: 'text'
});

const Job = mongoose.model('Job', jobSchema, 'ExternalJobs');

module.exports = Job;