const Meetup = require('../modules/meetup');
const Job = require('../modules/job');

// exports.getJobs = async (req, res) => {
//   try {
//     // --- 1. Pagination ---
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 12;
//     const skip = (page - 1) * limit;

//     // --- 2. Build Filter Object ---
//     const filters = {};
//     const { 
//       keyword,   // ?keyword=React
//       location,  // ?location=Bengaluru
//       type,      // ?type=Remote
//       startDate, // ?startDate=2025-11-01
//       endDate,   // ?endDate=2025-11-07
//       search,    // ?search=frontend
//       recentDays // ?recentDays=7 (gets jobs from last 7 days)
//     } = req.query;

//     // Filter by Keyword (checks if the keyword is in the array)
//     if (keyword) {
//       filters.Search_Keywords = keyword;
//     }

//     // Filter by Location
//     // Handles one ?location=Pune
//     // or multiple ?location=Pune&location=Mumbai
//     if (location) {
//       filters.location = { $in: Array.isArray(location) ? location : [location] };
//     }

//     // Filter by Type (e.g., 'In - Office' or 'Remote')
//     if (type) {
//       filters.type = type;
//     }

//     // --- 3. Date/Time Filtering ---
//     // Use an object for postedDate to allow range queries
//     if (startDate || endDate) {
//       filters.postedDate = {};
      
//       // Get jobs *after* or *on* this date
//       if (startDate) {
//         filters.postedDate.$gte = new Date(startDate);
//       }
      
//       // Get jobs *before* or *on* this date
//       if (endDate) {
//         filters.postedDate.$lte = new Date(endDate);
//       }
//     } 
//     // Get jobs from the last X days
//     else if (recentDays) {
//       const days = parseInt(recentDays);
//       const fromDate = new Date();
//       fromDate.setDate(fromDate.getDate() - days);
//       filters.postedDate = { $gte: fromDate };
//     }
    
//     // --- 4. Text Search ---
//     // Uses the text index (title, companyName, skills)
//     if (search) {
//       filters.$text = { $search: search };
//     }

//     // --- 5. Sorting ---
//     // ?sort=postedDate&order=asc
//     // Default sort is by postedDate descending (newest jobs first)
//     const sortQuery = req.query.sort || 'postedDate';
//     const sortOrder = req.query.order === 'asc' ? 1 : -1;
//     const sort = { [sortQuery]: sortOrder };

//     // --- 6. Execute Query ---
//     const jobs = await Job.find(filters)
//       .sort(sort)
//       .skip(skip)
//       .limit(limit);

//     // Get total count of documents *with* the filters applied
//     const totalJobs = await Job.countDocuments(filters);

//     // --- 7. Send Response ---
//     res.status(200).json({
//       totalJobs,
//       totalPages: Math.ceil(totalJobs / limit),
//       currentPage: page,
//       jobs,
//     });

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

exports.getMeetups = async (req, res) => {
  try {
    // --- 1. Pagination (My Suggestion) ---
    // /api/meetups?page=1&limit=10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // --- 2. Build Filter Object ---
    const filters = {};
    const { 
      keyword,   // ?keyword=startups
      location,  // ?location=Pune
      mode,      // ?mode=Offline
      startDate, // ?startDate=2025-11-10 (YYYY-MM-DD)
      endDate,   // ?endDate=2025-11-30
      search,    // ?search=funding
      upcoming   // ?upcoming=true
    } = req.query;

    // Filter by Keyword (checks if the keyword is in the array)
    if (keyword) {
      filters.Search_Keywords = keyword;
    }

    // Filter by Location (checks if the location is in the array)
    if (location) {
      filters.Search_Locations = location;
    }

    // Filter by Mode (e.g., 'Online' or 'Offline')
    if (mode) {
      filters.Mode = mode;
    }

    // --- 3. Date/Time Filtering ---
    // Use an object for Date to allow range queries
    if (startDate || endDate || upcoming === 'true') {
      filters.Date = {};
      
      // Get events *after* or *on* this date
      if (startDate) {
        filters.Date.$gte = new Date(startDate);
      }
      
      // Get events *before* or *on* this date
      if (endDate) {
        filters.Date.$lte = new Date(endDate);
      }
      
      // Get events from *now* onwards
      if (upcoming === 'true' && !startDate) {
        filters.Date.$gte = new Date();
      }
    }
    
    // --- 4. Text Search (My Suggestion) ---
    // Uses the text index we created in the model
    if (search) {
      // This will search the 'Name' and 'Description_Snippet' fields
      filters.$text = { $search: search };
    }

    // --- 5. Sorting (My Suggestion) ---
    // ?sort=Date&order=desc  (Sorts by Date descending)
    // Default sort is by Date ascending
    const sortQuery = req.query.sort || 'Date';
    const sortOrder = req.query.order === 'desc' ? -1 : 1;
    const sort = { [sortQuery]: sortOrder };


    // --- 6. Execute Query ---
    const meetups = await Meetup.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count of documents *with* the filters applied
    const totalEvents = await Meetup.countDocuments(filters);

    // --- 7. Send Response ---
    res.status(200).json({
      totalEvents,
      totalPages: Math.ceil(totalEvents / limit),
      currentPage: page,
      meetups,
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};