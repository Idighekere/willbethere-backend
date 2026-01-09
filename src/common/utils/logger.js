import winston from 'winston'
import { ENVIRONMENT } from '../config/environment'

// 1. Define the base transports (Console is always safe)
const transports = [new winston.transports.Console()]

// 2. Only add File transport if NOT on Vercel
// Vercel's file system is read-only, so 'logs/info.log' will always fail there.
if (ENVIRONMENT.APP.ENV.startsWith('dev')) {
    transports.push(
        new winston.transports.File({
            filename: 'logs/info.log',
            level: 'info',
        })
    )
}

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
            const logEntry = `${timestamp} ${level}: ${message}`
            // Removes ANSI color codes for clean logs
            return logEntry.replace(/\u001b\[0m/g, '')
        })
    ),
    transports: transports, // Use the conditional array here
})

export const stream = {
    write: (message) => {
        logger.info(message.trim())
    },
}
