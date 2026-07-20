import rateLimit from "express-rate-limit"

const json = (message) => (req, res) => res.status(429).json({ message })

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: json("Too many login attempts. Please try again in 15 minutes."),
})

export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json("Too many accounts created from this address. Please try again later."),
})

export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json("Too many password reset requests. Please try again later."),
})
