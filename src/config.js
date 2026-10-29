require('dotenv').config();

const env = process.env

module.exports = {
    PORT: Number(env.PORT) || 3000,
    NODE_ENV: env.NODE_ENV || 'development',
    mongoUri: env.MONGODB_URI,
    adminApiKey: env.ADMIN_API_KEY,
};