import { useState } from "react";
import type { ApplicationDetail } from "@/types/application";
import { AlertCircle, Beaker, CheckCircle, Download, FileText, LoaderCircle, Package, X } from "lucide-react";

const getFileExtension = (fileName?: string, filePath?: string) => {
  const value = String(fileName || filePath || '').split(/[?#]/)[0];
  return value.includes('.') ? value.split('.').pop()?.toLowerCase() ?? '' : '';
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const wrapPreviewHtml = (title: string, content: string, spreadsheet = false) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
body{margin:0;padding:24px;background:#f8fafc;color:#111827;font-family:Arial,sans-serif}
.document{max-width:${spreadsheet ? 'none' : '900px'};margin:auto;background:white;padding:32px;box-shadow:0 1px 4px #cbd5e1}
table{border-collapse:collapse;width:100%;margin-bottom:32px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;white-space:pre-wrap;vertical-align:top}
th{background:#e2e8f0}.sheet{margin:0 0 12px;color:#1e3a8a}img{max-width:100%;height:auto}
</style></head><body><main class="document">${content}</main></body></html>`;

type Props = {
  application: ApplicationDetail;
  showProcessingStatus?: boolean;
};

export default function FilesList({ application, showProcessingStatus = true }: Props) {
  const uploadedFiles = application.files || [];
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const openFile = (filePath: string) => {
    if (!filePath) {
      return;
    }

    window.open(filePath, "_blank", "noopener,noreferrer");
  };

  const previewOfficeFile = async (fileUrl: string, fileName: string, extension: string) => {
    setPreviewName(fileName);
    setPreviewHtml('');
    setPreviewError('');
    setPreviewLoading(true);

    try {
      const response = await fetch(fileUrl, { credentials: 'include' });
      if (!response.ok) throw new Error(`Unable to load file (${response.status})`);
      const arrayBuffer = await response.arrayBuffer();

      if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(wrapPreviewHtml(fileName, result.value));
      } else if (extension === 'xlsx') {
        const { default: readXlsxFile } = await import('read-excel-file/browser');
        const workbook = await readXlsxFile(arrayBuffer);
        const sheets = workbook.map(({ sheet, data }) => {
          const tableRows = data.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`);
          return `<h2 class="sheet">${escapeHtml(sheet)}</h2><div style="overflow:auto"><table><tbody>${tableRows.join('')}</tbody></table></div>`;
        });
        setPreviewHtml(wrapPreviewHtml(fileName, sheets.join(''), true));
      } else {
        throw new Error('In-app preview is available for DOCX and XLSX files.');
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Unable to preview this file.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewHtml('');
    setPreviewName('');
    setPreviewError('');
    setPreviewLoading(false);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'application': return <FileText className="h-5 w-5 text-blue-600" />;
      case 'ingredients': return <Beaker className="h-5 w-5 text-green-600" />;
      case 'products': return <Package className="h-5 w-5 text-purple-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

  return (
    <div className="w-full min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">File Management</h2>
      </div>

      <div className="w-full border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Uploaded Files</h3>
        </div>
        <div className="divide-y divide-gray-200 bg-white">
          {uploadedFiles.length > 0 ? (
            uploadedFiles.map((file, index) => {
              const previewFileUrl = file.FilePath || file.DownloadUrl || file.fileURL || '';
              const downloadUrl = file.DownloadUrl || file.FilePath || file.fileURL || '';
              const extension = getFileExtension(file.FileName, previewFileUrl);
              const canPreviewOfficeFile = extension === 'docx' || extension === 'xlsx';
              const leftMeta = [
                { label: 'FileSize', value: file.FileSize },
                { label: 'FileID', value: file.FileID ?? file.fileId }
              ].filter(item => hasValue(item.value));

              const rightMeta = [
                { label: 'Tag', value: file.Tag ?? file.tag },
                { label: 'CreatedBy', value: file.CreatedBy ?? file.createdBy }
              ].filter(item => hasValue(item.value));

              return (
                <div
                  key={index}
                  className="group flex items-start gap-4 p-4 min-w-0 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 rounded-lg bg-slate-100 p-2.5 border border-slate-200">
                      {getFileIcon(file.FileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
                          <h3 className="min-w-0 flex-1 font-medium text-gray-900 truncate">
                            <a
                              href={previewFileUrl}
                              onClick={canPreviewOfficeFile ? event => {
                                event.preventDefault();
                                void previewOfficeFile(previewFileUrl, file.FileName || 'Office document', extension);
                              } : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {file.FileName}
                            </a>
                          </h3>
                          <div className="flex items-center flex-wrap gap-2 sm:justify-end sm:ml-4">
                            {file.description && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                file.FileType === 'ingredients' ? 'bg-green-100 text-green-800 border border-green-200' :
                                file.FileType === 'products' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                file.FileType === 'application' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {file.description}
                              </span>
                            )}

                            {showProcessingStatus && (
                              file.IsProcessed ? (
                                <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-medium">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Processed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full text-xs font-medium">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending
                                </span>
                              )
                            )}

                            <button
                              type="button"
                              onClick={() => openFile(downloadUrl)}
                              className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-blue-700 underline-offset-2 transition-colors hover:text-blue-900 hover:underline focus:outline-none"
                              title="Download file"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                          </div>
                        </div>
                        {(leftMeta.length > 0 || rightMeta.length > 0) && (
                          <div className="flex flex-col gap-2 text-sm text-gray-600 min-w-0 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              {leftMeta.map(item => (
                                <span key={item.label} className="inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 truncate">
                                  <span className="font-semibold text-slate-700 shrink-0">{item.label}:</span>
                                  <span className="truncate text-slate-600">{item.value}</span>
                                </span>
                              ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 min-w-0 sm:justify-end">
                              {rightMeta.map(item => (
                                <span key={item.label} className="inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 truncate">
                                  <span className="font-semibold text-slate-700 shrink-0">{item.label}:</span>
                                  <span className="truncate text-slate-600">{item.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <div className="text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No files uploaded</p>
                <p className="text-xs mt-1">Upload files to begin processing</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {(previewLoading || previewHtml || previewError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${previewName}`}>
          <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div>
                <h3 className="font-semibold text-gray-900">{previewName}</h3>
                <p className="text-xs text-gray-500">Read-only in-browser preview</p>
              </div>
              <button type="button" onClick={closePreview} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close file preview">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-slate-100">
              {previewLoading && (
                <div className="flex h-full flex-col items-center justify-center text-gray-600">
                  <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-blue-600" />
                  Loading preview...
                </div>
              )}
              {previewError && !previewLoading && (
                <div className="flex h-full items-center justify-center p-8 text-center">
                  <div>
                    <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-500" />
                    <p className="font-medium text-red-700">{previewError}</p>
                    <p className="mt-2 text-sm text-gray-600">You can still use the Download action in the file list.</p>
                  </div>
                </div>
              )}
              {previewHtml && !previewLoading && (
                <iframe title={`Preview of ${previewName}`} srcDoc={previewHtml} sandbox="" className="h-full w-full border-0" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
