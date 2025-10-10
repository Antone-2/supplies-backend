const config = {
    jwtSecret: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_URL: process.env.BACKEND_URL,
    FRONTEND_URL: process.env.FRONTEND_URL
};

export default config;
