const jwt = require('jsonwebtoken');

const REPORT_ATTACHMENT_TOKEN_TYPE = 'report_attachment';
const REPORT_ATTACHMENT_TOKEN_TTL_SECONDS = 60 * 60 * 12;

function signReportAttachmentToken(reportId) {
  if (!reportId) return '';

  return jwt.sign(
    {
      type: REPORT_ATTACHMENT_TOKEN_TYPE,
      reportId: String(reportId),
    },
    process.env.JWT_SECRET,
    { expiresIn: REPORT_ATTACHMENT_TOKEN_TTL_SECONDS }
  );
}

function verifyReportAttachmentToken(token, reportId) {
  if (!token || !reportId) return false;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return (
      payload?.type === REPORT_ATTACHMENT_TOKEN_TYPE
      && String(payload.reportId || '') === String(reportId)
    );
  } catch (error) {
    return false;
  }
}

function buildReportAttachmentPath(report) {
  const reportId = report?.id || report?._id?.toString?.() || report?._id;
  if (!reportId || !report?.attachmentFileId) return '';

  const attachmentToken = signReportAttachmentToken(reportId);
  const updatedAt = report.attachmentUpdatedAt
    ? new Date(report.attachmentUpdatedAt).toISOString()
    : '';

  const query = new URLSearchParams();
  if (attachmentToken) query.append('attachmentToken', attachmentToken);
  if (updatedAt) query.append('updatedAt', updatedAt);

  const suffix = query.toString();
  return suffix
    ? `/reports/${reportId}/attachment?${suffix}`
    : `/reports/${reportId}/attachment`;
}

module.exports = {
  buildReportAttachmentPath,
  verifyReportAttachmentToken,
};
