const User = require('../../Database/models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config/index');

// GET /api/v1/users/profile - Get logged-in user profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// PUT /api/v1/users/profile - Update logged-in user profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, password, phone } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email.toLowerCase();
        if (phone) user.phone = phone;

        if (password) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            addresses: user.addresses,
            role: user.role,
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// GET /api/v1/users/addresses - Get user addresses
exports.getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('addresses');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user.addresses || []);
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).json({ message: 'Server error fetching addresses' });
    }
};

// POST /api/v1/users/addresses - Add new address
exports.addAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, name, address, city, phone, isDefault } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // If this is the default address, unset other defaults
        if (isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        // If this is the first address, make it default
        const isFirstAddress = user.addresses.length === 0;

        const newAddress = {
            type: type || 'Home',
            name,
            address,
            city,
            phone,
            isDefault: isDefault || isFirstAddress
        };

        user.addresses.push(newAddress);
        await user.save();

        res.status(201).json(newAddress);
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ message: 'Server error adding address' });
    }
};

// PUT /api/v1/users/addresses/:addressId - Update address
exports.updateAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.addressId;
        const { type, name, address, city, phone, isDefault } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) return res.status(404).json({ message: 'Address not found' });

        // If this is being set as default, unset other defaults
        if (isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        user.addresses[addressIndex] = {
            ...user.addresses[addressIndex],
            type: type || user.addresses[addressIndex].type,
            name: name || user.addresses[addressIndex].name,
            address: address || user.addresses[addressIndex].address,
            city: city || user.addresses[addressIndex].city,
            phone: phone || user.addresses[addressIndex].phone,
            isDefault: isDefault !== undefined ? isDefault : user.addresses[addressIndex].isDefault
        };

        await user.save();

        res.json(user.addresses[addressIndex]);
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ message: 'Server error updating address' });
    }
};

// DELETE /api/v1/users/addresses/:addressId - Delete address
exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.addressId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) return res.status(404).json({ message: 'Address not found' });

        const wasDefault = user.addresses[addressIndex].isDefault;
        user.addresses.splice(addressIndex, 1);

        // If the deleted address was default and there are other addresses, make the first one default
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();

        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ message: 'Server error deleting address' });
    }
};

// POST /api/v1/users/register - Register new user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'customer',
        });

        await user.save();

        // Create JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
            expiresIn: config.JWT_EXPIRES_IN || '1h',
        });

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: 'Server error registering user' });
    }
};

// POST /api/v1/users/login - Authenticate user & issue token
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
            expiresIn: config.JWT_EXPIRES_IN || '1h',
        });

        res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({ message: 'Server error logging in' });
    }
};
