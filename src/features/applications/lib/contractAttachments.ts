export const formatAttachmentReference = (fileName: string, fileUrl?: string | null) =>
  fileUrl ? `${fileName}<${fileUrl}>` : fileName

export const getContractPackageAttachmentUrl = (
  filePath?: string | null,
  pdfUrl?: string | null,
  downloadUrl?: string | null,
) => filePath?.trim() || pdfUrl || downloadUrl

export const getContractInvoiceAttachmentUrl = (
  invoicePdfUrl?: string | null,
  downloadUrl?: string | null,
  displayUrl?: string | null,
) => invoicePdfUrl?.trim() || downloadUrl || displayUrl
