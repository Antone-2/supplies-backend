const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');

router.post('/invite', adminUserController.inviteAdmin);
router.get('/', adminUserController.listAdmins);
router.put('/:id', adminUserController.updateAdmin);
router.delete('/:id', adminUserController.removeAdmin);

module.exports = router;