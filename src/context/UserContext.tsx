import React, { createContext, useContext, useState, ReactNode } from 'react'

type UserContextType = {
  username: string
  role: string
  setUsername: (name: string) => void
  setRole: (role: string) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string>('S. Benjamin') // default
  const [role, setRole] = useState<string>('NCRC') // default empty

  return (
    <UserContext.Provider value={{ username, role, setUsername, setRole }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}
