const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'no-reply@seoos.app';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/+$/, '');

function buildResetUrl(token) {
  return `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(email, token) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resetUrl = buildResetUrl(token);
  await resend.emails.send({
    from: FROM,
    to: [email],
    subject: 'Reset your SEO Operator password',
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;">
            Reset password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>Thanks,<br/>The SEO Operator team</p>
      </div>
    `,
  });
}

module.exports = {
  sendPasswordResetEmail,
};
