// newsletterController.js
import Newsletter from '../../Database/models/newsletter.model.js';
import { sendEmail } from '../services/emailService.js';

const subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });
        let subscriber = await Newsletter.findOne({ email });
        if (subscriber && subscriber.subscribed) {
            return res.status(200).json({ message: 'Already subscribed.' });
        }
        if (subscriber) {
            subscriber.subscribed = true;
            subscriber.subscribedAt = new Date();
            subscriber.unsubscribedAt = undefined;
            await subscriber.save();
        } else {
            subscriber = await Newsletter.create({ email });
        }
        // Send welcome email (non-blocking)
        sendEmail(email, 'Newsletter Subscription', '<p>Thank you for subscribing to Medhelm Supplies updates!</p>')
            .catch(err => console.error('Newsletter welcome email failed:', err));
        res.status(201).json({ message: 'Subscribed successfully.' });
    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        res.status(500).json({ message: 'Failed to subscribe.' });
    }
};

const unsubscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });
        const subscriber = await Newsletter.findOne({ email });
        if (!subscriber || !subscriber.subscribed) {
            return res.status(404).json({ message: 'Not subscribed.' });
        }
        subscriber.subscribed = false;
        subscriber.unsubscribedAt = new Date();
        await subscriber.save();
        // Send goodbye email
        await sendEmail(email, 'Unsubscribed from Newsletter', '<p>You have been unsubscribed from Medhelm Supplies updates.</p>');
        res.status(200).json({ message: 'Unsubscribed successfully.' });
    } catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        res.status(500).json({ message: 'Failed to unsubscribe.' });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const totalSubscribers = await Newsletter.countDocuments({ subscribed: true });
        const totalUnsubscribers = await Newsletter.countDocuments({ subscribed: false });
        const recentSubscriptions = await Newsletter.find({ subscribed: true })
            .sort({ subscribedAt: -1 })
            .limit(10)
            .select('email subscribedAt');

        res.json({
            totalSubscribers,
            totalUnsubscribers,
            recentSubscriptions
        });
    } catch (error) {
        console.error('Newsletter analytics error:', error);
        res.status(500).json({ message: 'Failed to get analytics.' });
    }
};

export default { subscribe, unsubscribe, getAnalytics };
