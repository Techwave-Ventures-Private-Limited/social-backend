const express = require('express');
const router = express.Router();
const { getMeetups, /* getJobs */  } = require('../controller/ScrapperController');

router.get('/meetups', getMeetups);
// router.get('/jobs', getJobs);

module.exports = router;