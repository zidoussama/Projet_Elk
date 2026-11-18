
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";

export function createAuth(mongoDatabase) {

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
        }

    });
}
