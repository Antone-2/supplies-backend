const express = require('express');
const router = express.Router();
const adminSettingController = require('../controllers/adminSettingController');

router.get('/', adminSettingController.getSettings);
router.put('/:key', adminSettingController.updateSetting);

module.exports = router;