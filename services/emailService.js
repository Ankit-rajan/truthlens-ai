const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(to, subject, html) {
    const mailOptions = {
      from: `"TruthLens" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email error:', error);
      return false;
    }
  }

  async sendVerificationEmail(user, token) {
    const url = `${process.env.BASE_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
    const html = `
      <h1>Verify your email</h1>
      <p>Hi ${user.name},</p>
      <p>Please click the link below to verify your account:</p>
      <a href="${url}">${url}</a>
    `;
    return this.sendEmail(user.email, 'Verify your TruthLens account', html);
  }

  async sendResetPasswordEmail(user, token) {
    const url = `${process.env.BASE_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
    const html = `
      <h1>Reset your password</h1>
      <p>Hi ${user.name},</p>
      <p>You requested to reset your password. Click the link below:</p>
      <a href="${url}">${url}</a>
      <p>If you didn't request this, please ignore.</p>
    `;
    return this.sendEmail(user.email, 'Reset your TruthLens password', html);
  }
}

module.exports = new EmailService();