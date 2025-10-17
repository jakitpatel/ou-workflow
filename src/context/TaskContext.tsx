import { createContext, useContext, useState } from 'react';

type TaskContextType = {
  applicationId: string | null;
  setApplicationId: (id: string | null) => void;
};

const TaskContext = createContext<TaskContextType>({
  applicationId: null,
  setApplicationId: () => {},
});

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [applicationId, setApplicationId] = useState<string | null>(null);

  return (
    <TaskContext.Provider value={{ applicationId, setApplicationId }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  return useContext(TaskContext);
}
