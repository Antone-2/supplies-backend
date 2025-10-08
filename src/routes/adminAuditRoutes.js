const express = require('express');
const admin = require('../middleware/admin');
const { getAuditLog } = require('../controllers/adminAuditController');
const router = express.Router();

router.get('/', admin, getAuditLog);

module.exports = router;
