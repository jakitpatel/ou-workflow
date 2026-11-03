import type { ApplicationDetail, QuoteData, QuoteItem } from "@/types/application";
export default function QuoteInfo({ application }: { application: ApplicationDetail }) {
  const quoteData = Array.isArray(application.quotes) ? application.quotes : undefined;

  function formatUSD(amount: number | string) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Quote Information</h2>
        
        {!quoteData ? (
          <p className="text-gray-600">Quote information is unavailable for this application.</p>
        ) : quoteData.length === 0 ? (
          <p className="text-gray-600">No quotes were returned for this application.</p>
        ) : null}
        {quoteData?.map((quote: QuoteData, index: number) => (
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
                    {quote.Status?.trim() || 'Unknown'}
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


        </div>
  );
}
