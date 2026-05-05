"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const ioredis_1 = __importDefault(require("ioredis"));
const redisClient = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
// 300 requests per minute
const rateLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 300,
    duration: 60,
});
const rateLimitMiddleware = (req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => {
        next();
    })
        .catch(() => {
        res.status(429).send({ error: 'Too Many Requests' });
    });
};
exports.rateLimitMiddleware = rateLimitMiddleware;
//# sourceMappingURL=rateLimit.middleware.js.map