import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// 10 requests per minute
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 10,
  duration: 60,
});

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  rateLimiter.consume(req.ip as string)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send({ error: 'Too Many Requests' });
    });
};
