const mongoose = require('mongoose');

// This schema is built to match the data from your Python script
const meetupSchema = new mongoose.Schema({
  Name: String,
  
  // Mongoose can handle keys with spaces if you quote them
  'Image URL': String, 
  
  URL: { 
    type: String, 
    required: true, 
    unique: true // Matches the 'upsert' logic from your script
  },
  
  // Modeling as a Date object allows for powerful time/date queries
  Date: Date, 
  
  Organizer: String,
  Mode: String,
  Description_Snippet: String,
  
  // These are arrays of strings, matching your $addToSet logic
  Search_Keywords: [String],
  Search_Locations: [String]
}, {
  // Tells Mongoose to use the exact collection name "meetups"
  collection: 'meetups', 
  
  // Automatically adds `createdAt` and `updatedAt` timestamps
  timestamps: true 
});

// Create an index for text search on Name and Description
meetupSchema.index({ Name: 'text', Description_Snippet: 'text' });

module.exports = mongoose.model('Meetup', meetupSchema);