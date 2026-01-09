import * as dotenv from 'dotenv'
dotenv.config()

export const ENVIRONMENT = {
    APP: {
        NAME: process.env.APP_NAME,
        PORT: process.env.PORT || 3000,
        ENV: process.env.APP_ENV,
        FRONTEND_URL: process.env.FRONTEND_URL,
    },
    DB: {
        URL: process.env.DB_URL,
    },
    JWT: {
        ACCESS_KEY: process.env.ACCESS_JWT_KEY,
        REFRESH_KEY: process.env.REFRESH_JWT_KEY,
    },
    JWT_EXPIRES_IN: {
        ACCESS: process.env.ACCESS_JWT_EXPIRES_IN,
        REFRESH: process.env.REFRESH_JWT_EXPIRES_IN,
    },
    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        API_KEY: process.env.CLOUDINARY_CLOUD_API_KEY,
        API_SECRET: process.env.CLOUDINARY_CLOUD_API_SECRET,
    },
    MAILER: {
        EMAIL: process.env.EMAIL,
        PASS: process.env.PASSWORD,
    },
}
