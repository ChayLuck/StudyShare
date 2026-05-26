import nodemailer from 'nodemailer';

let cachedTransporter: nodemailer.Transporter | null = null;

const createTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  // Using Ethereal for dummy email testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('[EMAIL] Created Ethereal test account:', testAccount.user);
    
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    return cachedTransporter;
  } catch (error) {
    console.error('[EMAIL] Failed to create test account:', error);
    // Fallback to a dummy transporter that just logs
    return {
      sendMail: async (mailOptions: any) => {
        console.log('[EMAIL] [DUMMY] Would send email:', mailOptions);
        return { messageId: 'dummy-id' };
      }
    } as any;
  }
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const verificationUrl = `http://localhost:4000/api/auth/verify-email?token=${token}`;
  console.log('[EMAIL] Verification URL:', verificationUrl);

  try {
    const transporter = await createTransporter();
    
    const info = await transporter.sendMail({
      from: '"StudyShare Admin" <noreply@studyshare.com>',
      to,
      subject: 'Verify your StudyShare account ✔',
      html: `<b>Hello!</b><br>Please verify your email by clicking <a href="${verificationUrl}">here</a>.`,
    });

    console.log('Message sent: %s', info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL: %s', previewUrl);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // We don't throw here to avoid blocking registration if email fails in dev
  }
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
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
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
