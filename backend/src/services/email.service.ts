import nodemailer from 'nodemailer';

const createTransporter = async () => {
  // Using Ethereal for dummy email testing, you can change to SendGrid or SES later
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });
};

export const sendVerificationEmail = async (to: string, token: string) => {
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
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
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
