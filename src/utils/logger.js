const winston = require('winston');
const config = require('../../config');

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: config.app.name },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, service, ...meta }) => {
            let metaStr = '';
            if (Object.keys(meta).length > 0) {
              metaStr = ` ${JSON.stringify(meta)}`;
            }
            return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
          }
        )
      ),
    }),
  ],
});

module.exports = logger;