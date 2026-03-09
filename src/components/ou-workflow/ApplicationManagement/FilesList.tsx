import type { ApplicationDetail } from "@/types/application";
import { Beaker, CheckCircle, Download, FileText, Package, AlertCircle } from "lucide-react";

export default function FilesList({ application }: { application: ApplicationDetail }) {
  const productData = application.products || [];
  const ingredientData = application.ingredients || [];
  const uploadedFiles = application.files || [];
  
  const downloadFile = async (fileName: string, filePath: string) => {
    try {
      const response = await fetch(filePath, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Unable to download file. Please make sure you are logged into SharePoint.');
    }
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

  // Calculate statistics
  const stats = {
    total: uploadedFiles.length,
    processed: uploadedFiles.filter(f => f.IsProcessed).length,
    ingredients: uploadedFiles.filter(f => f.FileType === 'ingredients').length,
    products: uploadedFiles.filter(f => f.FileType === 'products').length
  };
  
  return (
    <div className="w-full min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">File Management</h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm font-medium text-blue-600 mt-1">Total Files</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-3xl font-bold text-green-700">{stats.processed}</div>
          <div className="text-sm font-medium text-green-600 mt-1">Processed Files</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-3xl font-bold text-purple-700">{stats.ingredients}</div>
          <div className="text-sm font-medium text-purple-600 mt-1">Ingredient Files</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="text-3xl font-bold text-orange-700">{stats.products}</div>
          <div className="text-sm font-medium text-orange-600 mt-1">Product Files</div>
        </div>
      </div>

      {/* Files List Section */}
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
                className="group flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 p-4 min-w-0 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 rounded-lg bg-slate-100 p-2.5 border border-slate-200">
                    {getFileIcon(file.FileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      <a
                        href={file.FilePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {file.FileName}
                      </a>
                    </h3>
                    {(leftMeta.length > 0 || rightMeta.length > 0) && (
                      <div className="mt-1 flex items-center justify-between gap-3 text-sm text-gray-600 overflow-hidden min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {leftMeta.map(item => (
                            <span key={item.label} className="inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 truncate">
                              <span className="font-semibold text-slate-700 shrink-0">{item.label}:</span>
                              <span className="truncate text-slate-600">{item.value}</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 min-w-0 justify-end">
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
                
                <div className="flex items-center flex-wrap gap-2 xl:gap-3 xl:justify-end xl:ml-4">
                  {/* File Type Badge */}
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
                  
                  {/* Processed Badge */}
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
                  
                  {/* Download Button */}
                  <button
                    onClick={() => downloadFile(file.FileName ?? "", file.FilePath)}
                    className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download file"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>
            )})
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

      {/* Processing Status Banner */}
      {stats.processed > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">Processing Complete</h3>
              <p className="text-sm text-green-800 leading-relaxed">
                All uploaded files have been successfully processed and normalized. 
                Data extracted: <strong>{ingredientData.length} ingredients</strong> and <strong>{productData.length} products</strong> from <strong>{stats.processed} files</strong>. 
                Ready for NCRC review. All ingredient and product data has been cross-referenced and validated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded"></span>
            Application Documents
          </h4>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Main application form (PDF)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Quote documentation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Supplementary submission materials</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-purple-600 rounded"></span>
            Technical Documents
          </h4>
          <div className="space-y-2 text-sm text-purple-800">
            <div className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>Ingredient specifications ({stats.ingredients} Excel files)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>Product/brand listings ({stats.products} Excel files)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>Reference data matrices and specifications</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
