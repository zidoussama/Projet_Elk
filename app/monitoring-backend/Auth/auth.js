
const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("@better-auth/mongo-adapter");
const { admin } = require("better-auth/plugins");

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
            minPasswordLength: 8
        },

        plugins: [
            admin({
                defaultRole: "user",
                adminRoles: ["admin"],
                adminUserIds: getAdminUserIds()
            })
        ]

    });
}

module.exports = { createAuth, ensureUserRoles };
