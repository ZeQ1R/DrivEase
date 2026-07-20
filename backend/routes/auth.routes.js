import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../config/database.js";
import { sendMail } from "../config/mailer.js";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, verification_token)
       VALUES ($1, $2, $3, $4, $5, 'student', false, $6)`,
      [firstName, lastName, email, phone || null, passwordHash, verificationToken]
    );

    const verifyLink = `${process.env.API_URL}/auth/verify-email?token=${verificationToken}`;
    sendMail({
      to: email,
      subject: "Confirm your DrivEase account",
      html: `<h2>Welcome, ${firstName}!</h2>
             <p>Please confirm your email to activate your account:</p>
             <a href="${verifyLink}">Confirm my email</a>`,
    }).catch(err => console.error("Verification email failed:", err));

    res.status(201).json({ message: "Account created. Check your email to confirm before logging in." });
  } catch (error) {
    res.status(500).json({ message: "Signup failed.", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const user = result.rows[0];
    const passwordIsValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordIsValid) {
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
    res.status(500).json({ message: "Login failed.", error: error.message });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid link.");

    const result = await pool.query("SELECT id FROM users WHERE verification_token = $1", [token]);
    if (result.rows.length === 0) return res.status(400).send("Invalid or expired link.");

    await pool.query(
      "UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1",
      [token]
    );
    res.redirect(`${process.env.APP_URL}/login?verified=true`);
  } catch (error) {
    res.status(500).send("Verification failed.");
  }
});

// Request a password reset link. Always responds 200 so it can't be used to
// probe which emails have accounts.
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await pool.query("SELECT id, first_name FROM users WHERE email = $1", [email]);
    if (user.rows.length > 0) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await pool.query(
        "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3",
        [token, expires, user.rows[0].id]
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
    res.status(500).json({ message: "Failed to process request.", error: error.message });
  }
});

// Complete the reset with the emailed token.
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and new password are required." });
    if (String(password).length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const user = await pool.query(
      "SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()",
      [token]
    );
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2",
      [passwordHash, user.rows[0].id]
    );
    res.status(200).json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password.", error: error.message });
  }
});

export default router;
