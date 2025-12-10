const express = require('express');
const router = express.Router();


router.get('/test-db', async (req, res) => {
    try {
        console.log(' Testing database connection...');


        const Newsletter = require('../../Database/models/newsletter.model');
        console.log(' Newsletter model imported successfully');


        const count = await Newsletter.countDocuments();
        console.log(' Database connection successful, existing newsletters:', count);


        const testDoc = new Newsletter({
            email: 'test@example.com',
            firstName: 'Test',
            source: 'test'
        });


        const validationError = testDoc.validateSync();
        if (validationError) {
            console.log(' Validation errors:', validationError.errors);
            return res.json({
                success: false,
                message: 'Model validation failed',
                errors: validationError.errors
            });
        }

        console.log(' Document validation successful');

        res.json({
            success: true,
            message: 'Database and model tests passed',
            stats: {
                existingNewsletters: count,
                modelFields: Object.keys(Newsletter.schema.paths),
                testDocument: testDoc.toObject()
            }
        });

    } catch (error) {
        console.error(' Test endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: {
                name: error.name,
                message: error.message,
                stack: process.env.NODE_ENV ? error.stack : undefined
            }
        });
    }
});

module.exports = router;