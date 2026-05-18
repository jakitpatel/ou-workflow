type HtmlEmailOptions = {
  preheader?: string
  title?: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const linkifyEscapedUrls = (escapedText: string) =>
  escapedText.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const trailingPunctuationMatch = url.match(/[)\].,;:!?]+$/)
    const trailingPunctuation = trailingPunctuationMatch?.[0] ?? ''
    const href = trailingPunctuation ? url.slice(0, -trailingPunctuation.length) : url
    const label = href.replace(/&amp;/g, '&')

    return `<a href="${href}" style="color:#1d4ed8;text-decoration:underline;">${label}</a>${trailingPunctuation}`
  })

const plainTextToEmailHtml = (plainText: string) =>
  escapeHtml(plainText)
    .split('\n')
    .map((line) => linkifyEscapedUrls(line))
    .join('<br>')

export const buildHtmlEmailFromPlainText = (
  plainText: string,
  { preheader = '', title }: HtmlEmailOptions = {},
) => {
  const safeTitle = title ? escapeHtml(title) : ''
  const safePreheader = preheader ? escapeHtml(preheader) : ''
  const htmlBody = plainTextToEmailHtml(plainText)

  return {
    html: `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle || 'OU Kosher Notification'}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    ${safePreheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;line-height:1px;font-size:1px;">${safePreheader}</div>` : ''}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f3f4f6;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background-color:#ffffff;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:22px 28px;background-color:#1f2937;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:18px;line-height:24px;font-weight:bold;">${safeTitle || 'OU Kosher Notification'}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#111827;">
                ${htmlBody}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#f9fafb;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
                This message was sent by OU Kosher Project Flow.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: plainText,
  }
}
