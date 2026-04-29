function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPasswordResetEmail({ name, otp, expiresInMinutes = 10 }) {
  const safeName = escapeHtml(name || 'Invigo user');
  const safeOtp = escapeHtml(otp);
  const subject = 'Invigo password reset OTP';

  const text = [
    `Hello ${name || 'Invigo user'},`,
    '',
    'We received a request to reset your Invigo password.',
    `Your one-time password is: ${otp}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    '',
    'If you did not request this, you can ignore this email.',
    '',
    'Invigo Security Team',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#eef2ea;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef2ea;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid rgba(15,23,42,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#0f172a 0%,#007a5e 100%);padding:28px 32px;color:#ffffff;">
                    <div style="font-size:12px;letter-spacing:2px;font-weight:700;text-transform:uppercase;opacity:0.84;">Invigo Security</div>
                    <div style="margin-top:12px;font-size:30px;line-height:1.2;font-weight:700;">Password reset verification</div>
                    <div style="margin-top:10px;font-size:15px;line-height:1.7;opacity:0.92;">
                      Use the one-time password below to continue resetting your Invigo account password.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <div style="font-size:16px;line-height:1.7;">Hello ${safeName},</div>
                    <div style="margin-top:14px;font-size:15px;line-height:1.8;color:#334155;">
                      We received a password reset request for your Invigo account. Enter this 6-digit code in the app to continue.
                    </div>
                    <div style="margin-top:28px;padding:24px;border-radius:22px;background:#f7faf7;border:1px solid #d8e5d8;text-align:center;">
                      <div style="font-size:12px;letter-spacing:1.8px;font-weight:700;text-transform:uppercase;color:#007a5e;">One-time password</div>
                      <div style="margin-top:14px;font-size:34px;letter-spacing:10px;font-weight:700;color:#0f172a;">${safeOtp}</div>
                    </div>
                    <div style="margin-top:18px;padding:16px 18px;border-radius:18px;background:#fff7ed;color:#9a3412;font-size:14px;line-height:1.7;border:1px solid #fed7aa;">
                      This code expires in <strong>${expiresInMinutes} minutes</strong>. For your security, do not share it with anyone.
                    </div>
                    <div style="margin-top:24px;font-size:14px;line-height:1.8;color:#475569;">
                      If you did not request this password reset, you can safely ignore this email. Your current password will remain unchanged.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px 32px;">
                    <div style="border-top:1px solid #e2e8f0;padding-top:18px;font-size:12px;line-height:1.7;color:#64748b;">
                      Sent by Invigo Security Team. This is an automated message, so replies to this email may not be monitored.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return {
    subject,
    text,
    html,
  };
}

module.exports = buildPasswordResetEmail;
