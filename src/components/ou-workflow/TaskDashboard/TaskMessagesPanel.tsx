import React from "react";
import { MessageCircle, Send, CheckSquare } from "lucide-react";

type TaskMessagesPanelProps = {
  application: any;
  username: string;
  staff: { id: string; name: string; department: string }[];
  taskMessages: any;
  messageInputs: Record<string, string>;
  messageInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  showTaskAssignment: Record<string, boolean>;
  setShowTaskAssignment: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  taskAssignmentData: Record<string, any>;
  setTaskAssignmentData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  handleMessageInputChange: (taskId: string, value: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>, taskId: string) => void;
  handleSendMessage: (taskId: string) => void;
  handleCreateTaskFromMessage: (taskId: string) => void;
  handleConfirmTaskCreation: (taskId: string) => void;
};

export const TaskMessagesPanel: React.FC<TaskMessagesPanelProps> = ({
  application,
  username,
  staff,
  taskMessages,
  messageInputs,
  messageInputRefs,
  showTaskAssignment,
  setShowTaskAssignment,
  taskAssignmentData,
  setTaskAssignmentData,
  handleMessageInputChange,
  handleKeyPress,
  handleSendMessage,
  handleCreateTaskFromMessage,
  handleConfirmTaskCreation,
}) => {
  return (
    <tr>
      <td colSpan={4} className="px-0 py-0">
        <div className="bg-blue-50 border-t border-blue-200">
          <div className="px-6 py-4">
            {/* Header */}
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages & Communications
            </h4>

            {/* Messages List */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {(taskMessages || []).length === 0 ? (
                <p className="text-gray-500 text-sm italic">No messages yet</p>
              ) : (
                (taskMessages || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-sm ${
                      msg.isSystemMessage
                        ? "bg-yellow-50 border border-yellow-200"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      {/*<span className="font-medium text-gray-900">From:{msg.fromUser}, To:{msg.toUser}</span>*/}
                      <span className="font-medium text-gray-900">
                        From: {msg.fromUser}
                        {msg.toUser && <> , To: {msg.toUser}</>}
                      </span>
                      {msg.priority && (
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded 
                            ${
                              msg.priority === 'High'
                                ? 'bg-red-100 text-red-700'
                                : msg.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                        >
                          {msg.priority}
                        </span>
                      )}

                      {msg.messageType && (
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded 
                            ${
                              msg.messageType === 'Error'
                                ? 'bg-red-200 text-red-800'
                                : msg.messageType === 'Warning'
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                        >
                          {msg.messageType}
                        </span>
                      )}
                      {msg.sentDate && (
                        <span className="text-xs text-gray-500">
                          {new Date(msg.sentDate).toLocaleDateString()}{" "}
                          {new Date(msg.sentDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  ref={(el) => {
                    messageInputRefs.current[application.id] = el;
                  }}
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                  value={messageInputs[application.id] || ""}
                  onChange={(e) =>
                    handleMessageInputChange(application.id, e.target.value)
                  }
                  onKeyDown={(e) => handleKeyPress(e, application.id)}
                />
                {messageInputs[application.id]?.trim() && (
                  <button
                    onClick={() => handleCreateTaskFromMessage(application.id)}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
                    title="Create task from message"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleSendMessage(application.id)}
                  disabled={!messageInputs[application.id]?.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Press Enter to send message
                {messageInputs[application.id]?.trim()
                  ? ", Ctrl+Enter to create task, or click checkbox to create task"
                  : ", or Ctrl+Enter to create task"}
              </p>

              {/* Task Assignment Panel */}
              {showTaskAssignment[application.id] && (
                <div className="task-assignment-panel mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-400 rounded-lg shadow-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                      <CheckSquare className="w-4 h-4 text-white" />
                    </div>
                    <h5 className="text-lg font-semibold text-purple-900">
                      Create New Task
                    </h5>
                  </div>

                  <div className="bg-white p-3 rounded-lg mb-4 border-l-4 border-purple-500">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Task Description:
                    </div>
                    <div className="text-sm text-gray-900 italic">
                      "{taskAssignmentData[application.id]?.taskText}"
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      👤 Assign Task To:
                    </label>
                    <select
                      className="w-full text-sm border-2 border-purple-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none focus:border-purple-500 bg-white font-medium"
                      value={
                        taskAssignmentData[application.id]?.assignee || username
                      }
                      onChange={(e) => {
                        setTaskAssignmentData((prev) => ({
                          ...prev,
                          [application.id]: {
                            ...prev[application.id],
                            assignee: e.target.value,
                          },
                        }));
                      }}
                    >
                      {staff.map((person) => (
                        <option key={person.id} value={person.name}>
                          {person.name === username ? "🫵 You" : "👤"}{" "}
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => {
                        setShowTaskAssignment((prev) => ({
                          ...prev,
                          [application.id]: false,
                        }));
                        setTaskAssignmentData((prev) => ({
                          ...prev,
                          [application.id]: null,
                        }));
                      }}
                      className="px-4 py-2 text-sm text-purple-700 hover:text-purple-900 border-2 border-purple-300 rounded-lg hover:bg-purple-50 transition-colors font-medium"
                    >
                      ❌ Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmTaskCreation(application.id)}
                      className="px-6 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-bold transition-all shadow-lg border-2 border-purple-500"
                    >
                      ✨ Create Task
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};