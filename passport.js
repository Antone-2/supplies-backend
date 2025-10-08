const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('./Database/models/user.model');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

// Only initialize Google strategy if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
        scope: ['profile', 'email'],
        passReqToCallback: true
    },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                // Validate Google profile data
                if (!profile || !profile.id || !profile.emails || profile.emails.length === 0) {
                    console.error('Invalid Google profile data:', profile);
                    return done(new Error('Invalid Google profile data'), null);
                }

                const email = profile.emails[0].value;
                const displayName = profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName || 'Google User';
                const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    console.error('Invalid email format from Google:', email);
                    return done(new Error('Invalid email format'), null);
                }

                // Find or create user logic with enhanced security
                let user = await User.findOne({
                    $or: [
                        { googleId: profile.id },
                        { email: email }
                    ]
                });

                if (!user) {
                    // Create new user with Google profile data
                    user = await User.create({
                        googleId: profile.id,
                        email: email,
                        name: displayName,
                        avatar: avatar,
                        role: 'customer',
                        isEmailVerified: true,
                        authProvider: 'google', // Google OAuth credentials should be loaded from process.env in strategy config
                        createdAt: new Date(),
                        lastLogin: new Date()
                    });
                    console.log('New Google OAuth user created:', {
                        userId: user._id,
                        email: user.email,
                        name: user.name,
                        timestamp: new Date().toISOString()
                    });

                    // Send welcome email to new Google OAuth users
                    try {
                        const { sendEmail } = require('./src/utils/emailService');
                        const logoUrl = process.env.LOGO_URL;
                        const html = `
                                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                                    <div style="text-align: center; margin-bottom: 16px;">
                                        <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 8px;" />
                                        <h2 style="color: #2563eb; margin: 0;">Medhelm Supplies</h2>
                                    </div>
                                    <p>Hello ${user.name},</p>
                                    <p>🎉 Welcome to Medhelm Supplies! Your account has been successfully created using your Google account. You can now access your orders, wishlist, and enjoy a personalized shopping experience.</p>
                                    <p>With your Google account, you'll have seamless access to:</p>
                                    <ul>
                                        <li>✅ Order tracking and history</li>
                                        <li>✅ Personalized product recommendations</li>
                                        <li>✅ Secure checkout with saved preferences</li>
                                        <li>✅ Exclusive offers and updates</li>
                                    </ul>
                                    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                                    <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${new Date().getFullYear()} Medhelm Supplies</p>
                                </div>
                            `;
                        await sendEmail(user.email, '🎉 Welcome to Medhelm Supplies', html);
                    } catch (emailErr) {
                        console.error('Error sending welcome email to Google user:', emailErr);
                    }
                } else {
                    // Update existing user with latest Google info and login time
                    if (!user.googleId) {
                        user.googleId = profile.id;
                    }
                    if (!user.avatar && avatar) {
                        user.avatar = avatar;
                    }
                    user.lastLogin = new Date();
                    user.isEmailVerified = true; // Google emails are always verified

                    await user.save();

                    console.log('Existing Google OAuth user logged in:', {
                        userId: user._id,
                        email: user.email,
                        name: user.name,
                        timestamp: new Date().toISOString()
                    });
                }

                return done(null, user);
            } catch (err) {
                console.error('Google OAuth strategy error:', {
                    message: err.message,
                    stack: err.stack,
                    profileId: profile?.id,
                    email: profile?.emails?.[0]?.value,
                    timestamp: new Date().toISOString()
                });
                return done(err, null);
            }
        }
    ));
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
