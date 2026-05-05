"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const createTransporter = async () => {
    // Using Ethereal for dummy email testing, you can change to SendGrid or SES later
    const testAccount = await nodemailer_1.default.createTestAccount();
    return nodemailer_1.default.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};
const sendVerificationEmail = async (to, token) => {
    try {
        const transporter = await createTransporter();
        const verificationUrl = `http://localhost:4000/api/auth/verify-email?token=${token}`;
        const info = await transporter.sendMail({
            from: '"StudyShare Admin" <noreply@studyshare.com>',
            to,
            subject: 'Verify your StudyShare account ✔',
            html: `<b>Hello!</b><br>Please verify your email by clicking <a href="${verificationUrl}">here</a>.`,
        });
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer_1.default.getTestMessageUrl(info));
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (to, token) => {
    try {
        const transporter = await createTransporter();
        const resetUrl = `http://localhost:4000/api/auth/reset-password?token=${token}`;
        const info = await transporter.sendMail({
            from: '"StudyShare Admin" <noreply@studyshare.com>',
            to,
            subject: 'Reset your StudyShare password',
            html: `<b>Hello!</b><br>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset it.`,
        });
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer_1.default.getTestMessageUrl(info));
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
//# sourceMappingURL=email.service.js.map