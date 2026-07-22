import type { ApplicationDetail } from "@/types/application";
import { AlertCircle, Beaker, CheckCircle, Download, FileText, Package } from "lucide-react";

export default function FilesList({ application }: { application: ApplicationDetail }) {
  const uploadedFiles = application.files || [];

  const downloadFile = (filePath: string) => {
    if (!filePath) {
      return;
    }

    window.open(filePath, "_blank", "noopener,noreferrer");
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
                              href={file.FilePath}
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

                            {file.IsProcessed ? (
                              <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-medium">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Processed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full text-xs font-medium">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </span>
                            )}

                            <button
                              onClick={() => downloadFile(file.FilePath)}
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
    </div>
  );
}
