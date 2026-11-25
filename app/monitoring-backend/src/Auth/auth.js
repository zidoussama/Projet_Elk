
const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("@better-auth/mongo-adapter");
const { admin, openAPI, twoFactor } = require("better-auth/plugins");
const nodemailer = require("nodemailer");

async function sendResetPasswordEmail({ user, url }) {
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;

    if (!SMTP_HOST || !SMTP_FROM) {
        throw new Error("Password reset email requires SMTP_HOST and SMTP_FROM to be configured");
    }

    if ((SMTP_USER && !SMTP_PASSWORD) || (!SMTP_USER && SMTP_PASSWORD)) {
        throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together");
    }

    const port = Number(SMTP_PORT || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("SMTP_PORT must be a valid port number");
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: SMTP_SECURE === "true",
        ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASSWORD } } : {})
    });

    await transporter.sendMail({
        from: SMTP_FROM,
        to: user.email,
        subject: "Reset your Monitoring Backend password",
        text: `Use this link to reset your password: ${url}`
    });
}

function getAdminUserIds() {
    return (process.env.ADMIN_USER_IDS || "")
        .split(",")
        .map(userId => userId.trim())
        .filter(Boolean);
}

async function ensureUserRoles(mongoDatabase) {
    const result = await mongoDatabase.collection("user").updateMany(
        {
            $or: [
                { role: { $exists: false } },
                { role: null }
            ]
        },
        { $set: { role: "user" } }
    );

    if (result.modifiedCount > 0) {
        console.log(`Assigned default user role to ${result.modifiedCount} existing user(s)`);
    }
}

function createAuth(mongoDatabase) {

    if (!mongoDatabase) {
        throw new Error(
            "MongoDB database connection is required for Better Auth"
        );
    }

    if (!process.env.BETTER_AUTH_SECRET) {
        throw new Error("Better Auth configuration failed: BETTER_AUTH_SECRET is not configured");
    }

    if (!process.env.BETTER_AUTH_URL) {
        throw new Error("Better Auth configuration failed: BETTER_AUTH_URL is not configured");
    }

    return betterAuth({

        // ==========================
        // Application configuration
        // ==========================

        appName: "Monitoring Backend",

        baseURL: process.env.BETTER_AUTH_URL,

        secret: process.env.BETTER_AUTH_SECRET,

        trustedOrigins: (process.env.FRONTEND_URL || process.env.BETTER_AUTH_URL)
            .split(",")
            .map(origin => origin.trim())
            .filter(Boolean),

        // ==========================
        // MongoDB adapter
        // ==========================

        database: mongodbAdapter(mongoDatabase),

        // ==========================
        // Email / Password
        // ==========================

        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            minPasswordLength: 8,
            sendResetPassword: sendResetPasswordEmail
        },

        plugins: [
            admin({
                defaultRole: "user",
                adminRoles: ["admin"],
                adminUserIds: getAdminUserIds()
            }),
            twoFactor({
                issuer: "Monitoring Backend"
            }),
            openAPI({
                path: "/reference",
                theme: "default"
            })
        ]

    });
}

module.exports = { createAuth, ensureUserRoles, sendResetPasswordEmail };
