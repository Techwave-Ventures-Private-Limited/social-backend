const express = require('express');
const router = express.Router();

const { serveSharePage } = require('../controller/shareController');

router.get('/:type/:id', serveSharePage);

module.exports = router;