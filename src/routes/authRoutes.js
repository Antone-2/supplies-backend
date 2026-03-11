import express from 'express';
import { register, login, logout, me, refreshToken, forgotPassword, verifyEmail, resetPassword } from '../modules/auth/auth.controller.js';
import { googleAuth, googleCallback } from '../modules/auth/socialAuth.controller.js';
import auth from '../middleware/auth.js';

/**
 * ================================================
 * INPUT VALIDATION IMPORTS
 * ================================================
 * Using express-validator for strict input validation
 * and sanitization on all user inputs
 */
import {
    validateRequest,
    registerValidation,
    loginValidation,
    emailValidation,
    passwordChangeValidation
} from '../middleware/enhancedSecurity.js';

const router = express.Router();

/**
 * ================================================
 * AUTHENTICATION ROUTES WITH VALIDATION
 * ================================================
 * All user input endpoints have:
 * - Schema-based validation
 * - Type checks
 * - Length limits
 * - Unexpected field rejection
 */

/**
 * POST /register
 * Register a new user account
 * Validation: email, password, firstName, lastName, phone
 */
router.post('/register', registerValidation, validateRequest, register);

/**
 * POST /signup
 * Alias for register (same validation)
 */
router.post('/signup', registerValidation, validateRequest, register);

/**
 * POST /login
 * Authenticate user and get JWT token
 * Validation: email, password (strict limits)
 */
router.post('/login', loginValidation, validateRequest, login);

/**
 * POST /logout
 * Invalidate session/token
 * No body required - uses cookies
 */
router.post('/logout', logout);

/**
 * GET /me
 * Get current authenticated user profile
 * Requires JWT token
 */
router.get('/me', auth, me);

/**
 * POST /refresh-token
 * Refresh JWT token pair
 */
router.post('/refresh-token', refreshToken);

/**
 * POST /forgot-password
 * Request password reset email
 * Validation: email only
 */
router.post('/forgot-password', emailValidation, validateRequest, forgotPassword);

/**
 * POST /reset-password
 * Reset password with token
 * Validation: email and newPassword handled in controller
 */
router.post('/reset-password', resetPassword);

/**
 * GET /verify-email
 * Verify user email address
 * Uses query parameter token
 */
router.get('/verify-email', verifyEmail);


/**
 * ================================================
 * SOCIAL AUTHENTICATION ROUTES
 * ================================================
 */

/**
 * GET /google
 * Initiate Google OAuth flow
 */
router.get('/google', googleAuth);

/**
 * GET /google/callback
 * Google OAuth callback handler
 */
router.get('/google/callback', googleCallback);

export default router;
