import cron from 'node-cron';
import { runDayBasedReminders } from '../services/cartAbandonmentService.js';
import { logger } from '../utils/logger.js';

const scheduledJobs = new Map();

const initializeScheduler = () => {
    // Run every 3 days at 9:00 AM (Africa/Nairobi)
    // Using interval-based scheduling (every 3 days)
    const threeDayJob = cron.schedule('0 9 */3 * *', async () => {
        logger.info('Running scheduled 3-day reminder job');
        try {
            const result = await runDayBasedReminders(3);
            logger.info('3-day reminder job completed:', result);
        } catch (error) {
            logger.error('3-day reminder job failed:', error);
        }
    }, {
        scheduled: true,
        timezone: 'Africa/Nairobi'
    });

    scheduledJobs.set('3-day-reminders', threeDayJob);
    logger.info('3-day reminder cron job scheduled (Africa/Nairobi)');

    // Also run at 5:00 PM for additional coverage
    const afternoonJob = cron.schedule('0 17 */3 * *', async () => {
        logger.info('Running afternoon 3-day reminder check');
        try {
            const result = await runDayBasedReminders(3);
            logger.info('Afternoon reminder job completed:', result);
        } catch (error) {
            logger.error('Afternoon reminder job failed:', error);
        }
    }, {
        scheduled: true,
        timezone: 'Africa/Nairobi'
    });

    scheduledJobs.set('afternoon-reminders', afternoonJob);
    logger.info('Afternoon reminder cron job scheduled (Africa/Nairobi)');

    return {
        threeDayReminders: threeDayJob,
        afternoonReminders: afternoonJob
    };
};

const startScheduler = () => {
    const jobs = initializeScheduler();
    logger.info('Cron scheduler started');
    return jobs;
};

const stopScheduler = () => {
    scheduledJobs.forEach((job, name) => {
        job.stop();
        logger.info(`Stopped cron job: ${name}`);
    });
    scheduledJobs.clear();
    logger.info('All cron jobs stopped');
};

const getSchedulerStatus = () => {
    const jobs = [];
    scheduledJobs.forEach((job, name) => {
        jobs.push({
            name,
            running: job.running || false
        });
    });
    return {
        active: scheduledJobs.size > 0,
        jobs
    };
};

const triggerJob = async (jobName, days = 3) => {
    switch (jobName) {
        case '3-day-reminders':
            return await runDayBasedReminders(days);
        default:
            throw new Error(`Unknown job: ${jobName}`);
    }
};

export {
    initializeScheduler,
    startScheduler,
    stopScheduler,
    getSchedulerStatus,
    triggerJob
};
