import type { ApplicationDetail, QuoteData } from "@/types/application";
import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, Check } from "lucide-react";
type ValidationCheck = { valid: boolean; message: string };
type ValidationChecks = { quote?: ValidationCheck; [key: string]: ValidationCheck | undefined };

export default function QuoteInfo({ application, quoteData, setValidationChecks }: { application: ApplicationDetail, quoteData: QuoteData, setValidationChecks: Dispatch<SetStateAction<ValidationChecks>> }) {
  //const quoteData = application.quote || {};
  console.log("Application Data:", application);
  console.log("Application Data:", application);
  return (
    <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Quote Information</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
                <h3 className="font-medium text-yellow-800">Quote Requires Verification</h3>
                <p className="text-yellow-700 text-sm mt-1">
                Quote found in system but needs verification before application can be marked complete.
                </p>
            </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
            <h3 className="font-medium text-gray-900 mb-4">Quote Details</h3>
            <div className="space-y-3">
                <div className="flex justify-between">
                <span className="text-gray-600">Quote Number:</span>
                <span className="font-medium">{quoteData.quoteNumber}</span>
                </div>
                <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium text-green-600 text-lg">{quoteData.amount}</span>
                </div>
                <div className="flex justify-between">
                <span className="text-gray-600">Valid Until:</span>
                <span className="font-medium">{quoteData.validUntil}</span>
                </div>
                <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                    Pending Acceptance
                </span>
                </div>
            </div>
            </div>

            <div>
            <h3 className="font-medium text-gray-900 mb-4">Quote Breakdown</h3>
            <div className="space-y-3">
                {quoteData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{item.description}</span>
                    <span className="font-medium text-gray-900">{item.amount}</span>
                </div>
                ))}
            </div>
            </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
            <button
            onClick={() => {
                setValidationChecks(prev => ({
                ...prev,
                quote: { valid: true, message: 'Quote verified and accepted' }
                }));
            }}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
            <Check className="h-4 w-4 mr-2" />
            Verify Quote
            </button>
            <div className="text-sm text-gray-600">
            Last updated: July 17, 2025
            </div>
        </div>
        </div>
  );
}