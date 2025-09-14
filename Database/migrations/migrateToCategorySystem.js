const mongoose = require('mongoose');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
require('dotenv').config({ path: '../../../.env' });

const defaultCategories = [
    {
        name: 'Medical Equipment',
        description: 'Essential medical equipment and devices',
        color: '#3B82F6',
        icon: '🏥',
        displayOrder: 1
    },
    {
        name: 'Diagnostics',
        description: 'Diagnostic tools and equipment',
        color: '#10B981',
        icon: '🔬',
        displayOrder: 2
    },
    {
        name: 'Protection',
        description: 'Personal protective equipment and supplies',
        color: '#F59E0B',
        icon: '🛡️',
        displayOrder: 3
    },
    {
        name: 'Personal Care',
        description: 'Personal care and hygiene products',
        color: '#EF4444',
        icon: '🧴',
        displayOrder: 4
    },
    {
        name: 'Consumables',
        description: 'Medical consumables and disposable supplies',
        color: '#10B981',
        icon: '💊',
        displayOrder: 5
    },
    {
        name: 'Walking Aids',
        description: 'Mobility aids and walking assistance equipment',
        color: '#3B82F6',
        icon: '♿',
        displayOrder: 6
    },
    {
        name: 'Hospital Furnitures',
        description: 'Hospital furniture and medical equipment',
        color: '#8B5CF6',
        icon: '🛏️',
        displayOrder: 7
    },
    {
        name: 'Orthopedics',
        description: 'Orthopedic supplies and rehabilitation equipment',
        color: '#F59E0B',
        icon: '🦴',
        displayOrder: 8
    },
    {
        name: 'Surgical Supplies',
        description: 'Surgical instruments and supplies',
        color: '#8B5CF6',
        icon: '⚕️',
        displayOrder: 9
    },
    {
        name: 'Laboratory',
        description: 'Laboratory equipment and supplies',
        color: '#06B6D4',
        icon: '🧪',
        displayOrder: 10
    },
    {
        name: 'Emergency',
        description: 'Emergency and first aid supplies',
        color: '#DC2626',
        icon: '🚑',
        displayOrder: 11
    }
];

async function migrateToCategorySystem() {
    try {
        console.log('Starting migration to category system...');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to database');

        // Create default categories
        console.log('Creating default categories...');
        const createdCategories = [];

        for (const categoryData of defaultCategories) {
            const existingCategory = await Category.findOne({ name: categoryData.name });

            if (!existingCategory) {
                const category = new Category(categoryData);
                await category.save();
                createdCategories.push(category);
                console.log(`Created category: ${category.name}`);
            } else {
                createdCategories.push(existingCategory);
                console.log(`Category already exists: ${existingCategory.name}`);
            }
        }

        // Create a mapping of old category names to new category IDs
        const categoryMap = {};
        createdCategories.forEach(category => {
            // Map common category names to the new categories
            if (category.name === 'Medical Equipment') {
                categoryMap['Medical Equipment'] = category._id;
            }
            if (category.name === 'Diagnostics') {
                categoryMap['Diagnostics'] = category._id;
            }
            if (category.name === 'Protection') {
                categoryMap['Protection'] = category._id;
            }
            if (category.name === 'Personal Care') {
                categoryMap['Personal Care'] = category._id;
            }
        });

        // Update existing products to use category references
        console.log('Updating existing products...');
        const products = await Product.find({});

        for (const product of products) {
            if (typeof product.category === 'string') {
                // Find the appropriate category for this product
                let categoryId = null;

                // Try to match by existing category name
                if (categoryMap[product.category]) {
                    categoryId = categoryMap[product.category];
                } else {
                    // If no exact match, try to find a suitable category
                    const matchingCategory = createdCategories.find(cat =>
                        product.category.toLowerCase().includes(cat.name.toLowerCase()) ||
                        cat.name.toLowerCase().includes(product.category.toLowerCase())
                    );

                    if (matchingCategory) {
                        categoryId = matchingCategory._id;
                    } else {
                        // Default to first category if no match found
                        categoryId = createdCategories[0]._id;
                    }
                }

                // Update the product
                await Product.findByIdAndUpdate(product._id, {
                    category: categoryId,
                    isActive: true // Ensure products are active
                });

                console.log(`Updated product: ${product.name} -> Category: ${categoryId}`);
            }
        }

        // Update category product counts
        console.log('Updating category product counts...');
        for (const category of createdCategories) {
            const productCount = await Product.countDocuments({
                category: category._id,
                isActive: true,
                countInStock: { $gt: 0 }
            });

            await Category.findByIdAndUpdate(category._id, { productCount });
            console.log(`Updated ${category.name} product count: ${productCount}`);
        }

        console.log('Migration completed successfully!');
        console.log('\nSummary:');
        console.log(`- Created ${createdCategories.length} categories`);
        console.log(`- Updated ${products.length} products`);
        console.log('\nAvailable categories:');
        createdCategories.forEach(cat => {
            console.log(`  - ${cat.name} (${cat.slug})`);
        });

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database');
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateToCategorySystem()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = migrateToCategorySystem;
