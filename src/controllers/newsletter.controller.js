const Newsletter = require('../../Database/models/newsletter.model');
const { body, validationResult } = require('express-validator');
const { sendEmail, getEmailTemplate } = require('../services/emailService');

// Subscribe to newsletter
exports.subscribe = async (req, res) => {
    try {
        console.log('📧 Newsletter subscription request:', {
            email: req.body.email,
            firstName: req.body.firstName || 'N/A',
            source: req.body.source || 'unknown',
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, firstName, lastName, source = 'website' } = req.body;

        // Additional email validation
        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid email address is required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Check if already subscribed
        const existingSubscription = await Newsletter.findOne({ email: email.toLowerCase() });

        if (existingSubscription) {
            if (existingSubscription.subscribed) {
                return res.status(409).json({
                    success: false,
                    message: 'Email is already subscribed to our newsletter'
                });
            } else {
                // Reactivate subscription
                existingSubscription.subscribed = true;
                existingSubscription.subscribedAt = new Date();
                existingSubscription.unsubscribedAt = null;
                await existingSubscription.save();

                return res.status(200).json({
                    success: true,
                    message: 'Successfully reactivated your newsletter subscription!'
                });
            }
        }

        // Create new subscription
        const subscription = new Newsletter({
            email: email.toLowerCase(),
            firstName: firstName || '',
            lastName: lastName || '',
            source,
            subscribed: true,
            subscribedAt: new Date()
        });

        await subscription.save();

        console.log('✅ Newsletter subscription successful:', {
            email: subscription.email,
            firstName: subscription.firstName,
            source: subscription.source,
            timestamp: new Date().toISOString()
        });

        // Send welcome email
        try {
            await sendWelcomeEmail(subscription.email, subscription.firstName || 'Valued Customer');
            console.log('📧 Welcome email sent to:', subscription.email);
        } catch (emailError) {
            console.error('📧❌ Failed to send welcome email:', emailError.message);
            // Don't fail the subscription if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing to our newsletter!',
            data: {
                email: subscription.email,
                subscribedAt: subscription.subscribedAt
            }
        });

    } catch (error) {
        console.error('📧❌ Newsletter subscription error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email is already subscribed'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to subscribe to newsletter. Please try again.',
            error: process.env.NODE_ENV ? error.message : undefined
        });
    }
};

// Get newsletter analytics (admin only)
exports.getAnalytics = async (req, res) => {
    try {
        // Get total subscriptions
        const totalSubscriptions = await Newsletter.countDocuments({ subscribed: true });
        const totalUnsubscribed = await Newsletter.countDocuments({ subscribed: false });

        // Get subscriptions by source
        const subscriptionsBySource = await Newsletter.aggregate([
            { $match: { subscribed: true } },
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get recent subscriptions (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentSubscriptions = await Newsletter.countDocuments({
            subscribed: true,
            subscribedAt: { $gte: thirtyDaysAgo }
        });

        // Get monthly growth
        const monthlyStats = await Newsletter.aggregate([
            { $match: { subscribed: true } },
            {
                $group: {
                    _id: {
                        year: { $year: '$subscribedAt' },
                        month: { $month: '$subscribedAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.json({
            success: true,
            data: {
                totalSubscriptions,
                totalUnsubscribed,
                recentSubscriptions,
                subscriptionsBySource,
                monthlyStats,
                generated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Newsletter analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch newsletter analytics'
        });
    }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res) => {
    try {
        const { email } = req.params;

        const subscription = await Newsletter.findOne({ email: email.toLowerCase() });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Email not found in our newsletter list'
            });
        }

        if (!subscription.subscribed) {
            return res.status(409).json({
                success: false,
                message: 'Email is already unsubscribed'
            });
        }

        subscription.subscribed = false;
        subscription.unsubscribedAt = new Date();
        await subscription.save();

        res.status(200).json({
            success: true,
            message: 'Successfully unsubscribed from newsletter'
        });

    } catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unsubscribe. Please try again.'
        });
    }
};

// Get newsletter statistics (admin only)
exports.getStats = async (req, res) => {
    try {
        const [totalSubscribers, activeSubscribers, recentSubscribers] = await Promise.all([
            Newsletter.countDocuments(),
            Newsletter.countDocuments({ subscribed: true }),
            Newsletter.countDocuments({
                subscribed: true,
                subscribedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            })
        ]);

        const subscriptionsBySource = await Newsletter.aggregate([
            { $match: { subscribed: true } },
            { $group: { _id: '$source', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalSubscribers,
                activeSubscribers,
                recentSubscribers,
                unsubscribedCount: totalSubscribers - activeSubscribers,
                subscriptionsBySource
            }
        });

    } catch (error) {
        console.error('Newsletter stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve newsletter statistics'
        });
    }
};

// Get all subscribers (admin only)
exports.getAllSubscribers = async (req, res) => {
    try {
        const { page = 1, limit = 50, status = 'active' } = req.query;

        const filter = status === 'all' ? {} : { subscribed: status === 'active' };

        const subscribers = await Newsletter.find(filter)
            .select('-__v')
            .sort({ subscribedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Newsletter.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                subscribers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalSubscribers: total,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subscribers'
        });
    }
};

// Send newsletter campaign (admin only)
exports.sendCampaign = async (req, res) => {
    try {
        const { subject, content, recipientType = 'active' } = req.body;

        // Validate required fields
        if (!subject || !content) {
            return res.status(400).json({
                success: false,
                message: 'Subject and content are required'
            });
        }

        // Get subscribers based on recipient type
        const query = recipientType === 'all' ? {} : { subscribed: true };
        const subscribers = await Newsletter.find(query, 'email');

        if (subscribers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No subscribers found'
            });
        }

        // In a real implementation, you would integrate with an email service like SendGrid, Mailgun, etc.
        // For now, we'll simulate sending emails

        console.log(`Sending campaign "${subject}" to ${subscribers.length} subscribers`);
        console.log('Content preview:', content.substring(0, 100) + '...');

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Here you would actually send emails
        // Example with nodemailer or email service:
        /*
        const transporter = nodemailer.createTransporter({
            // Your email configuration
        });

        const emailPromises = subscribers.map(subscriber => {
            return transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to: subscriber.email,
                subject: subject,
                html: content,
                text: content.replace(/<[^>]*>/g, '') // Strip HTML for text version
            });
        });

        await Promise.all(emailPromises);
        */

        res.json({
            success: true,
            message: 'Campaign sent successfully',
            sentCount: subscribers.length,
            recipients: recipientType
        });

    } catch (error) {
        console.error('Send campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send campaign'
        });
    }
};

// Welcome email function
const sendWelcomeEmail = async (email, firstName) => {
    const logoUrl = process.env.LOGO_URL;
    const unsubscribeUrl = `${process.env.FRONTEND_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;

    const welcomeContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; text-align: center; padding: 40px 20px; border-radius: 8px 8px 0 0;">
                <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 15px;" />
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Welcome to Medhelm Supplies!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your trusted healthcare partner</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px; background: #fff;">
                <h2 style="color: #2563eb; margin-top: 0;">Hello ${firstName}! 👋</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
                    Thank you for subscribing to the Medhelm Supplies newsletter! We're thrilled to have you join our community of healthcare professionals and wellness enthusiasts.
                </p>
                
                <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
                    <h3 style="color: #2563eb; margin-top: 0; font-size: 18px;">What to expect:</h3>
                    <ul style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>🏥 Latest healthcare products and medical supplies</li>
                        <li>💡 Health tips and wellness advice from experts</li>
                        <li>🎯 Exclusive promotions and early access to new products</li>
                        <li>📚 Industry insights and medical equipment guides</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/products" 
                       style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                        Browse Our Products
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #666; margin: 25px 0;">
                    We respect your privacy and will never share your information. You can update your preferences or unsubscribe at any time.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f1f5f9; padding: 25px; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                    <strong>${process.env.COMPANY_NAME || 'Medhelm Supplies'}</strong><br>
                    Your Trusted Healthcare Partner<br>
                    📧 Email: ${process.env.COMPANY_EMAIL || 'info@medhelmsupplies.co.ke'} | 📱 Phone: ${process.env.COMPANY_PHONE || '+254 XXX XXX XXX'}
                </p>
                
                <div style="margin: 15px 0;">
                    <a href="${unsubscribeUrl}" style="color: #666; font-size: 12px; text-decoration: underline;">
                        Unsubscribe from newsletter
                    </a>
                </div>
                
                <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Medhelm Supplies'}. All rights reserved.
                </p>
            </div>
        </div>
    `;

    return await sendEmail(email, '🎉 Welcome to Medhelm Supplies Newsletter!', welcomeContent);
};

// Update notification preferences
exports.updatePreferences = async (req, res) => {
    try {
        const { email } = req.params;
        const { productUpdates, healthTips, promotions } = req.body;

        const subscription = await Newsletter.findOne({ email: email.toLowerCase() });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Email not found in our newsletter list'
            });
        }

        // Update preferences
        if (typeof productUpdates !== 'undefined') subscription.preferences.productUpdates = productUpdates;
        if (typeof healthTips !== 'undefined') subscription.preferences.healthTips = healthTips;
        if (typeof promotions !== 'undefined') subscription.preferences.promotions = promotions;

        await subscription.save();

        console.log('📧 Newsletter preferences updated:', {
            email: subscription.email,
            preferences: subscription.preferences,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Newsletter preferences updated successfully',
            data: {
                email: subscription.email,
                preferences: subscription.preferences
            }
        });

    } catch (error) {
        console.error('Newsletter preferences update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences'
        });
    }
};

// Get user preferences
exports.getPreferences = async (req, res) => {
    try {
        const { email } = req.params;

        const subscription = await Newsletter.findOne({ email: email.toLowerCase() });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Email not found in our newsletter list'
            });
        }

        res.json({
            success: true,
            data: {
                email: subscription.email,
                subscribed: subscription.subscribed,
                preferences: subscription.preferences,
                subscribedAt: subscription.subscribedAt
            }
        });

    } catch (error) {
        console.error('Get newsletter preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get preferences'
        });
    }
};

// Send targeted newsletter based on preferences
exports.sendTargetedNewsletter = async (req, res) => {
    try {
        const {
            subject,
            content,
            type = 'general', // 'productUpdates', 'healthTips', 'promotions', or 'general'
            testEmail
        } = req.body;

        if (!subject || !content) {
            return res.status(400).json({
                success: false,
                message: 'Subject and content are required'
            });
        }

        let query = { subscribed: true };

        // Filter by preference type
        if (type !== 'general') {
            query[`preferences.${type}`] = true;
        }

        // Get targeted subscribers
        const subscribers = testEmail ?
            [{ email: testEmail }] :
            await Newsletter.find(query, 'email firstName');

        if (subscribers.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No subscribers found for ${type} notifications`
            });
        }

        console.log(`📧 Sending ${type} newsletter to ${subscribers.length} subscribers`);

        // Send emails (in production, use a queue system)
        const emailPromises = subscribers.map(async subscriber => {
            try {
                const personalizedContent = content.replace(/\{firstName\}/g, subscriber.firstName || 'Valued Customer');
                const unsubscribeUrl = `${process.env.FRONTEND_URL}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;

                const emailTemplate = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                        ${personalizedContent}
                        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                You received this email because you're subscribed to Medhelm Supplies newsletter.
                            </p>
                            <a href="${unsubscribeUrl}" style="color: #666; font-size: 12px; text-decoration: underline;">
                                Unsubscribe
                            </a>
                        </div>
                    </div>
                `;

                return await sendEmail(subscriber.email, subject, emailTemplate);
            } catch (error) {
                console.error(`Failed to send email to ${subscriber.email}:`, error.message);
                return { success: false, email: subscriber.email, error: error.message };
            }
        });

        const results = await Promise.all(emailPromises);
        const successful = results.filter(r => r.success !== false).length;
        const failed = results.length - successful;

        res.json({
            success: true,
            message: `Newsletter sent successfully`,
            data: {
                totalSent: successful,
                totalFailed: failed,
                totalSubscribers: subscribers.length,
                type: type
            }
        });

    } catch (error) {
        console.error('Send targeted newsletter error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send newsletter'
        });
    }
};

// Validation middleware
exports.validateSubscription = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('firstName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('First name must be less than 50 characters'),
    body('lastName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Last name must be less than 50 characters')
];