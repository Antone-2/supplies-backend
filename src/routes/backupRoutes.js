const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');

router.get('/list', backupController.listBackups);
router.post('/create', backupController.createBackup);
router.post('/restore', backupController.restoreBackup);

module.exports = router;