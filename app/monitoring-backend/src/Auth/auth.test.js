const nodemailer = require("nodemailer");
const { sendResetPasswordEmail } = require("./auth");

describe("sendResetPasswordEmail", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it("sends a reset link through the configured SMTP server", async () => {
        const sendMail = vi.fn().mockResolvedValue({});
        vi.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail });
        vi.stubEnv("SMTP_HOST", "smtp.example.com");
        vi.stubEnv("SMTP_PORT", "465");
        vi.stubEnv("SMTP_SECURE", "true");
        vi.stubEnv("SMTP_USER", "mailer");
        vi.stubEnv("SMTP_PASSWORD", "secret");
        vi.stubEnv("SMTP_FROM", "Monitoring Backend <noreply@example.com>");

        await sendResetPasswordEmail({
            user: { email: "user@example.com" },
            url: "https://example.com/reset/token"
        });

        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: "smtp.example.com",
            port: 465,
            secure: true,
            auth: { user: "mailer", pass: "secret" }
        });
        expect(sendMail).toHaveBeenCalledWith({
            from: "Monitoring Backend <noreply@example.com>",
            to: "user@example.com",
            subject: "Reset your Monitoring Backend password",
            text: "Use this link to reset your password: https://example.com/reset/token"
        });
    });

    it("fails clearly when required SMTP settings are missing", async () => {
        vi.stubEnv("SMTP_HOST", "");
        vi.stubEnv("SMTP_FROM", "");

        await expect(sendResetPasswordEmail({
            user: { email: "user@example.com" },
            url: "https://example.com/reset/token"
        })).rejects.toThrow("Password reset email requires SMTP_HOST and SMTP_FROM");
    });
});
