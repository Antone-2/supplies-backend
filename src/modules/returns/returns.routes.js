// returns.routes.js
const express = require('express');
const router = express.Router();
const returnsController = require('./returns.controller');

// Get all returns
router.get('/', returnsController.getReturns);

// Get a single return by ID
router.get('/:id', returnsController.getReturnById);

// Create a new return
router.post('/', returnsController.createReturn);

// Update a return
router.put('/:id', returnsController.updateReturn);

// Delete a return
router.delete('/:id', returnsController.deleteReturn);

module.exports = router;