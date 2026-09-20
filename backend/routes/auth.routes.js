import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../config/database.js";
import { sendMail } from "../config/mailer.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, signupSchema, forgotSchema, resetSchema, checkEmailSchema } from "../schemas/auth.schema.js";
import { loginLimiter, signupLimiter, passwordResetLimiter, checkEmailLimiter } from "../middleware/rateLimit.js";

const router = Router();

const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Lets the signup form tell the user their email is already taken before they
// fill out the rest of the form. Unlike /login, revealing this on /signup is
// standard practice — an account's existence has to be knowable to sign up at
// all, and every email is unique to one account by design.
router.get("/check-email", checkEmailLimiter, async (req, res) => {
  const result = checkEmailSchema.safeParse({ email: req.query.email });
  if (!result.success) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  try {
    const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", [result.data.email]);
    res.status(200).json({ exists: rows.length > 0 });
  } catch (error) {
    console.error("Email check failed:", error);
    res.status(500).json({ message: "Could not check that email." });
  }
});

router.post("/signup", signupLimiter, validate(signupSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, verification_token)
       VALUES ($1, $2, $3, $4, $5, 'student', false, $6)`,
      [firstName, lastName, email, phone || null, passwordHash, hashToken(verificationToken)]
    );

    const verifyLink = `${process.env.API_URL}/auth/verify-email?token=${verificationToken}`;
    sendMail({
      to: email,
      subject: "Confirm your DrivEase account",
      html: `<h2>Welcome, ${firstName}!</h2>
             <p>Please confirm your email to activate your account:</p>
             <a href="${verifyLink}">Confirm my email</a>`,
    }).catch(err => console.error("Verification email failed:", err.message));

    res.status(201).json({ message: "Account created. Check your email to confirm before logging in." });
  } catch (error) {
    console.error("Signup failed:", error);
    res.status(500).json({ message: "Could not create your account. Please try again." });
  }
});

router.post("/login", loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role, school_id, password_hash, is_verified
         FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    const passwordIsValid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !passwordIsValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (!user.is_verified) {
      return res.status(403).json({ message: "Please confirm your email before logging in." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, school_id: user.school_id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).send("Invalid link.");
    }

    const result = await pool.query(
      "UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING id",
      [hashToken(token)]
    );
    if (result.rows.length === 0) return res.status(400).send("Invalid or expired link.");

    res.redirect(`${process.env.APP_URL}/login?verified=true`);
  } catch (error) {
    console.error("Email verification failed:", error);
    res.status(500).send("Verification failed.");
  }
});

router.post("/forgot-password", passwordResetLimiter, validate(forgotSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await pool.query("SELECT id, first_name FROM users WHERE email = $1", [email]);
    if (user.rows.length > 0) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query(
        "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3",
        [hashToken(token), expires, user.rows[0].id]
      );
      const link = `${process.env.APP_URL}/reset-password?token=${token}`;
      sendMail({
        to: email,
        subject: "Reset your DrivEase password",
        html: `<h2>Password reset</h2>
               <p>Hi ${user.rows[0].first_name}, we received a request to reset your password.</p>
               <p><a href="${link}">Choose a new password</a> — this link expires in 1 hour.</p>
               <p>If you didn't request this, you can ignore this email.</p>`,
      }).catch(err => console.error("Reset email failed:", err.message));
    }

    res.status(200).json({ message: "If an account exists for that email, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password failed:", error);
    res.status(500).json({ message: "Could not process that request. Please try again." });
  }
});

router.post("/reset-password", passwordResetLimiter, validate(resetSchema), async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await pool.query(
      "SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()",
      [hashToken(token)]
    );
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2",
      [passwordHash, user.rows[0].id]
    );
    res.status(200).json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error("Password reset failed:", error);
    res.status(500).json({ message: "Could not reset your password. Please try again." });
  }
});

export default router;
