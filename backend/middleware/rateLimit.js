import rateLimit from "express-rate-limit"

const enabled = process.env.RATE_LIMIT_ENABLED !== "false"

const json = (message) => (req, res) => res.status(429).json({ message })

const passthrough = (req, res, next) => next()

const limiter = (options) => (enabled ? rateLimit(options) : passthrough)

if (!enabled) {
    console.warn("⚠️  Rate limiting is DISABLED (RATE_LIMIT_ENABLED=false). Do not run like this in production.")
}

export const loginLimiter = limiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: json("Too many login attempts. Please try again in 15 minutes."),
})

export const signupLimiter = limiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json("Too many accounts created from this address. Please try again later."),
})

export const passwordResetLimiter = limiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json("Too many password reset requests. Please try again later."),
})
