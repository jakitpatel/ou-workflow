import React from "react";
import type { ApplicationDetail, UploadedFile } from "./../../../types/application";
import { Beaker, CheckCircle, Download, FileText, Package, Tag, Upload } from "lucide-react";

export default function FilesList({ application, uploadedFiles }: { application: ApplicationDetail;  uploadedFiles: UploadedFile[] }) {
  const productData = application.products || [];
  const ingredientData = application.ingredients || [];

  const downloadFile = async (fileName: string) => {
    try {
      const fileContent = await window.fs.readFile(fileName);
      const blob = new Blob([fileContent]);
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
      alert('Download failed. Please try again.');
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
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">File Management</h2>
        <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Upload className="h-4 w-4 mr-2" />
          Upload Additional Files
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{uploadedFiles.length}</div>
          <div className="text-sm text-blue-700">Total Files</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{uploadedFiles.filter(f => f.processed).length}</div>
          <div className="text-sm text-green-700">Processed</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600">{uploadedFiles.filter(f => f.type === 'ingredients').length}</div>
          <div className="text-sm text-purple-700">Ingredient Files</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-600">{uploadedFiles.filter(f => f.type === 'products').length}</div>
          <div className="text-sm text-orange-700">Product Files</div>
        </div>
      </div>

      <div className="space-y-4">
        {uploadedFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              {getFileIcon(file.type)}
              <div>
                <h3 className="font-medium text-gray-900">{file.name}</h3>
                <p className="text-sm text-gray-600">
                  {file.size} • Uploaded {file.uploaded}
                  {file.recordCount && (
                    <span className="ml-2 text-green-600">
                      • {file.recordCount} records extracted
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  file.type === 'ingredients' ? 'bg-green-100 text-green-800' :
                  file.type === 'products' ? 'bg-purple-100 text-purple-800' :
                  file.type === 'application' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {file.tag}
                </span>
                {file.processed && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs ml-2">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Processed
                  </span>
                )}
              </div>
              <button
                onClick={() => downloadFile(file.name)}
                className="flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800">Processing Complete</h3>
              <p className="text-green-700 text-sm mt-1">
                All uploaded files have been successfully processed and normalized. 
                <br />
                <strong>Data extracted:</strong> {ingredientData.length} ingredients, {productData.length} products from {uploadedFiles.filter(f => f.processed).length} files.
                <br />
                <strong>Ready for NCRC review.</strong> All ingredient and product data has been cross-referenced and validated.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Document Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm text-blue-700">
                <div>
                  <strong>Application Documents:</strong>
                  <ul className="ml-4 list-disc">
                    <li>Main application form (PDF)</li>
                    <li>Quote documentation</li>
                  </ul>
                </div>
                <div>
                  <strong>Technical Documents:</strong>
                  <ul className="ml-4 list-disc">
                    <li>Ingredient specifications (2 Excel files)</li>
                    <li>Product/brand listings (2 Excel files)</li>
                    <li>Reference data matrices</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}