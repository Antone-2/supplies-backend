import express from 'express';
import { forgotPassword, resetPassword } from '../modules/auth/password.controller.js';

const router = express.Router();

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;