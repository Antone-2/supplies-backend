const Newsletter = require('../../Database/models/newsletter.model');
const { body, validationResult } = require('express-validator');

// Subscribe to newsletter
exports.subscribe = async (req, res) => {
    try {
        console.log('📧 Newsletter subscription request:', req.body);

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

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing to our newsletter!'
        });

    } catch (error) {
        console.error('📧❌ Newsletter subscription error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });

        // Handle specific MongoDB errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email is already subscribed to our newsletter'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to subscribe. Please try again.'
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

        // Get daily subscription trend for last 7 days
        const subscriptionTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await Newsletter.countDocuments({
                subscribedAt: {
                    $gte: date,
                    $lt: nextDate
                },
                subscribed: true
            });

            subscriptionTrend.push({
                date: date.toISOString().split('T')[0],
                count
            });
        }

        res.status(200).json({
            success: true,
            data: {
                totalSubscribers,
                activeSubscribers,
                recentSubscribers,
                unsubscribedCount: totalSubscribers - activeSubscribers,
                subscriptionsBySource,
                subscriptionTrend
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