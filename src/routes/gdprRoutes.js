const express = require('express');
const router = express.Router();
const gdprController = require('../controllers/gdprController');

router.get('/export/:userId', gdprController.exportUserData);
router.post('/delete/:userId', gdprController.requestUserDeletion);

module.exports = router;