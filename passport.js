// passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./Database/models/user.model');
require('dotenv').config({ path: './.env' });

// Only initialize Google strategy if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.BACKEND_URL + '/api/v1/auth/google/callback',
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find or create user logic here
                let user = await User.findOne({ googleId: profile.id });
                if (!user) {
                    user = await User.create({
                        googleId: profile.id,
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        avatar: profile.photos[0].value,
                        // Set default role for Google OAuth users
                        role: 'customer',
                        // Mark email as verified since it's from Google
                        isEmailVerified: true,
                    });
                }
                return done(null, user);
            } catch (err) {
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
