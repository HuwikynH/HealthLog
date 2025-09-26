const express = require('express');
const ctrl = require('../controllers/mifitController');

const router = express.Router();

router.get('/sleep', ctrl.getSleep);

module.exports = router;


