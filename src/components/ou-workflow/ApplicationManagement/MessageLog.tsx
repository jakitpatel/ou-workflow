import { User, Server, HelpCircle } from "lucide-react";
import type { ApplicationDetail } from "@/types/application";

const messageTypeStyles = {
  USER: {
    bg: "bg-green-100",
    icon: <User className="h-4 w-4 text-green-600" aria-label="User message" />,
  },
  SYSTEM: {
    bg: "bg-blue-100",
    icon: <Server className="h-4 w-4 text-blue-600" aria-label="System message" />,
  },
  DEFAULT: {
    bg: "bg-gray-100",
    icon: <HelpCircle className="h-4 w-4 text-gray-500" aria-label="Other message" />,
  },
};

export default function MessageLog({ application }: { application: ApplicationDetail }) {
  const messages = application.messages || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Message Log</h2>
      <div className="space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No messages yet.</p>
        ) : (
          messages.map((msg, index) => {
            const { bg, icon } =
              messageTypeStyles[msg?.messageType] || messageTypeStyles.DEFAULT;
            return (
              <div
                key={msg.id || index}
                className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50"
              >
                <div
                  className={`p-2 rounded-full flex items-center justify-center ${bg}`}
                  title={msg?.messageType}
                >
                  {icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 mt-1 font-medium">
                      {msg.toUser && <>Sent To: {msg.toUser}</>}
                    </span>
                    <div className="flex items-center space-x-2">
                      {msg.priority && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            msg.priority?.toLowerCase() === "high"
                              ? "bg-red-100 text-red-800"
                              : msg.priority?.toLowerCase() === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {msg.priority}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(msg.sentDate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">{msg.text}</h3>
                  {msg.fromUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Sent by:</span> {msg.fromUser}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
