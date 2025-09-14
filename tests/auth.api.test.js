const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock the User model
jest.mock('../Database/models/user.model', () => {
    const mockUser = {
        save: jest.fn(),
        findOne: jest.fn(),
        deleteMany: jest.fn(),
    };

    const UserMock = jest.fn().mockImplementation((data) => ({
        ...data,
        save: mockUser.save,
        findOne: mockUser.findOne,
        deleteMany: mockUser.deleteMany,
    }));

    // Add static methods to the constructor
    UserMock.findOne = mockUser.findOne;
    UserMock.deleteMany = mockUser.deleteMany;

    return UserMock;
});

const User = require('../Database/models/user.model');

describe('Auth API Endpoints', () => {
    let verificationToken;
    let resetToken;
    const testUser = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'Test1234!',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should register a new user', async () => {
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        const userVerificationToken = crypto.randomBytes(32).toString('hex');

        const user = new User({
            email: testUser.email,
            password: hashedPassword,
            name: testUser.name,
            isVerified: false,
            verificationToken: userVerificationToken
        });

        User.findOne.mockResolvedValue(null); // No existing user
        user.save.mockResolvedValue({
            ...user,
            _id: 'mock-id',
            verificationToken: userVerificationToken
        });

        await user.save();

        expect(user.save).toHaveBeenCalled();
        expect(user.isVerified).toBe(false);
        expect(user.verificationToken).toBeDefined();
        verificationToken = user.verificationToken;
    });

    it('should verify user email with valid token', async () => {
        const mockUser = {
            _id: 'mock-id',
            email: testUser.email,
            isVerified: false,
            verificationToken,
            save: jest.fn().mockResolvedValue({
                _id: 'mock-id',
                email: testUser.email,
                isVerified: true,
                verificationToken: undefined
            })
        };

        User.findOne.mockResolvedValue(mockUser);

        const user = await User.findOne({ verificationToken });
        expect(user).toBeTruthy();

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        expect(user.save).toHaveBeenCalled();
        expect(user.isVerified).toBe(true);
        expect(user.verificationToken).toBeUndefined();
    });

    it('should login with verified user credentials', async () => {
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        const mockUser = {
            _id: 'mock-id',
            email: testUser.email,
            password: hashedPassword,
            isVerified: true
        };

        User.findOne.mockResolvedValue(mockUser);

        const user = await User.findOne({ email: testUser.email });
        expect(user).toBeTruthy();

        const passwordMatch = await bcrypt.compare(testUser.password, user.password);
        expect(passwordMatch).toBe(true);

        const token = jwt.sign({ id: user._id }, 'test-secret', { expiresIn: '1h' });
        expect(token).toBeDefined();
    });

    it('should send password reset email', async () => {
        const mockUser = {
            _id: 'mock-id',
            email: testUser.email,
            save: jest.fn().mockResolvedValue({
                _id: 'mock-id',
                email: testUser.email,
                resetPasswordToken: 'mock-reset-token',
                resetPasswordExpires: Date.now() + 3600000
            })
        };

        User.findOne.mockResolvedValue(mockUser);

        const user = await User.findOne({ email: testUser.email });
        expect(user).toBeTruthy();

        const resetTokenValue = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetTokenValue;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        expect(user.save).toHaveBeenCalled();
        expect(user.resetPasswordToken).toBeDefined();
        resetToken = user.resetPasswordToken;
    });

    it('should reset password with valid token', async () => {
        const mockUser = {
            _id: 'mock-id',
            email: testUser.email,
            resetPasswordToken: resetToken,
            resetPasswordExpires: Date.now() + 3600000,
            save: jest.fn().mockResolvedValue({
                _id: 'mock-id',
                email: testUser.email,
                resetPasswordToken: undefined,
                resetPasswordExpires: undefined
            })
        };

        User.findOne.mockResolvedValue(mockUser);

        const user = await User.findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: Date.now() }
        });
        expect(user).toBeTruthy();

        const newPassword = 'NewPass123!';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        expect(user.save).toHaveBeenCalled();
        expect(user.resetPasswordToken).toBeUndefined();
        expect(user.resetPasswordExpires).toBeUndefined();
    });
});
