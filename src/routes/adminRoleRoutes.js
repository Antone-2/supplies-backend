const express = require('express');
const router = express.Router();
const adminRoleController = require('../controllers/adminRoleController');

router.post('/', adminRoleController.createRole);
router.get('/', adminRoleController.getRoles);
router.put('/:id', adminRoleController.updateRole);
router.delete('/:id', adminRoleController.deleteRole);

module.exports = router;