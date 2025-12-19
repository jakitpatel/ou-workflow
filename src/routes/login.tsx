import { useState, useEffect } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useUser } from "@/context/UserContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LogIn, Server } from "lucide-react"
import { authlogin, isAuthenticated } from "@/auth/authService"

// 🔹 Load servers once at module level
const config = (window as any).__APP_CONFIG__ || {}
const availableServers = Object.keys(config)
  .filter((k) => k.startsWith("API_CLIENT_URL"))
  .map((key) => config[key])
  .filter(Boolean)

export const Route = createFileRoute("/login")({
  // 🔹 Redirect if already authenticated (runs before component mounts)
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { apiBaseUrl, setApiBaseUrl } = useUser()
  const [error, setError] = useState("")

  // 🔹 Initialize apiBaseUrl if not set (moved to useEffect)
  useEffect(() => {
    if (!apiBaseUrl && availableServers.length > 0) {
      setApiBaseUrl(availableServers[0])
    }
  }, [apiBaseUrl, setApiBaseUrl])

  // 🔹 Use the current value or fall back to first server
  const currentApiBaseUrl = apiBaseUrl || availableServers[0] || ""

  // 🔹 Handle login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentApiBaseUrl) {
      setError("Please select an API server before using Cognito login.")
      return
    }
    
    // 🔹 Cognito Flow
    try {
      const storedUser = sessionStorage.getItem("user")
      const parsed = storedUser ? JSON.parse(storedUser) : {}
      parsed.apiBaseUrl = currentApiBaseUrl
      sessionStorage.setItem("user", JSON.stringify(parsed))

      console.log("[handleCognito] Saved apiBaseUrl before redirect:", currentApiBaseUrl)
    } catch (err) {
      console.warn("[handleCognito] Failed to persist apiBaseUrl:", err)
    }
    authlogin()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-blue-900">
        <LogIn className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Login</h1>
      </div>

      <Card className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Login Options</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 🔹 Server Selector */}
          <div>
            <label className="text-sm font-medium text-blue-800 mb-1 block">
              Select API Server
            </label>
            <Select
              value={currentApiBaseUrl}
              onValueChange={(val) => setApiBaseUrl(val)}
            >
              <SelectTrigger className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" />
                <SelectValue placeholder="Choose API server" />
              </SelectTrigger>
              <SelectContent>
                {availableServers.map((url, i) => (
                  <SelectItem key={i} value={url}>
                    {url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🔹 Submit */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-transform hover:scale-[1.02]"
          >
            Login
          </Button>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </form>
      </Card>
    </div>
  )
}