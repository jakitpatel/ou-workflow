import type { ApplicationDetail, QuoteData, QuoteItem } from "@/types/application";
//import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle } from "lucide-react";
//type ValidationCheck = { valid: boolean; message: string };
//type ValidationChecks = { quote?: ValidationCheck; [key: string]: ValidationCheck | undefined };

export default function QuoteInfo({ application }: { application: ApplicationDetail }) {
  console.log("Application Data:", application);
  const quoteData = application.quotes || [];
  console.log("quote Data:", quoteData);

  function formatUSD(amount: number | string) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  }

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
        {quoteData.map((quote: QuoteData, index: number) => (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" key={index}>
            <div>
                <h3 className="font-medium text-gray-900 mb-4">Quote Details</h3>
                <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-gray-600">Quote Number:</span>
                    <span className="font-medium">{quote.QuoteNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium text-green-600 text-lg">{formatUSD(quote.TotalAmount)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Valid Until:</span>
                    <span className="font-medium">{quote.validUntil}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                    {quote.Status}
                    </span>
                </div>
                </div>
            </div>

            <div>
                <h3 className="font-medium text-gray-900 mb-4">Quote Breakdown</h3>
                <div className="space-y-3">
                {quote.items?.map((item: QuoteItem, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{item.Description}</span>
                    <span className="font-medium text-gray-900">{formatUSD(item.Amount)}</span>
                    </div>
                ))}
                </div>
            </div>
            </div>
        ))}

        {/*
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
        */}
        </div>
  );
}