const nodemailer = require('nodemailer');

let cachedTransporter = null;

function envBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function envNumber(value, defaultValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function buildTransportOptions() {
  const port = envNumber(process.env.MAIL_PORT, 587);
  const timeout = envNumber(process.env.MAIL_SMTP_TIMEOUT, 5000);
  const writeTimeout = envNumber(process.env.MAIL_SMTP_WRITE_TIMEOUT, timeout);

  return {
    host: process.env.MAIL_HOST,
    port,
    secure: port === 465,
    auth: envBoolean(process.env.MAIL_SMTP_AUTH, true)
      ? {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        }
      : undefined,
    requireTLS: envBoolean(process.env.MAIL_SMTP_STARTTLS_REQUIRED, false),
    ignoreTLS: !envBoolean(process.env.MAIL_SMTP_STARTTLS, true),
    connectionTimeout: envNumber(process.env.MAIL_SMTP_CONNECTION_TIMEOUT, 5000),
    greetingTimeout: timeout,
    socketTimeout: Math.max(timeout, writeTimeout),
    tls: {
      minVersion: 'TLSv1.2',
    },
  };
}

function ensureMailConfig() {
  const required = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME'];
  const missing = required.filter((key) => !process.env[key]);

  if (envBoolean(process.env.MAIL_SMTP_AUTH, true) && !process.env.MAIL_PASSWORD) {
    missing.push('MAIL_PASSWORD');
  }

  if (missing.length) {
    throw new Error(`Missing mail configuration: ${missing.join(', ')}`);
  }
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  ensureMailConfig();
  cachedTransporter = nodemailer.createTransport(buildTransportOptions());
  return cachedTransporter;
}

function getDefaultFrom() {
  return process.env.MAIL_FROM || `Invigo Security <${process.env.MAIL_USERNAME}>`;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();

  return transporter.sendMail({
    from: getDefaultFrom(),
    to,
    subject,
    html,
    text,
  });
}

module.exports = {
  sendMail,
};
