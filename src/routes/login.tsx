import { useState, useEffect, useRef } from "react"
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
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
import { ShieldCheck, LogIn, Server } from "lucide-react"
import { authlogin } from "@/components/auth/authService"
import { fetchRoles } from "@/api"
//import type { QueryClient } from "@tanstack/react-query"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const queryClient = router.options.context?.queryClient;

  const {
    login,
    username,
    token,
    loginTime,
    apiBaseUrl,
    setApiBaseUrl,
  } = useUser()

  const navigate = useNavigate()

  const [strategy, setStrategy] = useState<"none" | "cognito">("cognito")
  const [error, setError] = useState("")
  const [availableServers, setAvailableServers] = useState<string[]>([])

  const usernameRef = useRef<HTMLInputElement>(null)

  // 🔹 Load API servers
  useEffect(() => {
    const config = (window as any).__APP_CONFIG__
    if (config) {
      const servers = Object.keys(config)
        .filter((key) => key.startsWith("API_CLIENT_URL"))
        .map((key) => config[key])
        .filter(Boolean)

      setAvailableServers(servers)

      if (!apiBaseUrl && servers.length > 0) {
        setApiBaseUrl(servers[0])
      }
    }
  }, [apiBaseUrl, setApiBaseUrl])

  // 🔹 Auto-redirect if session already valid
  useEffect(() => {
    if (username && token && loginTime) {
      const now = Date.now()
      const expiresIn = 24 * 60 * 60 * 1000 // 24 hrs
      if (now - loginTime < expiresIn) {
        console.log("[LoginPage] Existing session valid, redirecting...");
        navigate({ to: "/" })
      }
    }
  }, [username, token, loginTime, navigate])
  
  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  // 🔹 Handle login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiBaseUrl) {
      setError("Please select an API server first.")
      return
    }

    // -----------------------------
    // 🔹 No Security Flow (Just For Development/Testing)
    // -----------------------------
    if (strategy === "none") {
      setError("")
      try {
        const data: any = await queryClient.fetchQuery({
          queryKey: ["roles"],
          queryFn: () => fetchRoles({ token: "wiieowieo323232" }),
        })

        if (!data || !data.user_info) {
          setError("Unable to load user info.")
          return
        }

        const roles = Array.isArray(data.user_info.roles)
          ? data.user_info.roles.map((r: { role_name?: string }) => ({
              name: r.role_name || "",
            }))
          : []

        login({
          username: data.user_info.user_id,
          role: "ALL",
          roles,
          token: data.access_token,
          strategy: "none",
        },() => navigate({ to: "/" }))

        //navigate({ to: "/" })
      } catch (err: any) {
        setError("Login failed: " + err.message)
      }
    }

    // -----------------------------
    // 🔹 Cognito Flow
    // -----------------------------
    if (strategy === "cognito") {
      if (!apiBaseUrl) {
        setError("Please select an API server before using Cognito login.")
        return
      }

      try {
        const storedUser = localStorage.getItem("user")
        const parsed = storedUser ? JSON.parse(storedUser) : {}
        parsed.apiBaseUrl = apiBaseUrl
        localStorage.setItem("user", JSON.stringify(parsed))

        console.log("[handleCognito] Saved apiBaseUrl before redirect:", apiBaseUrl)
      } catch (err) {
        console.warn("[handleCognito] Failed to persist apiBaseUrl:", err)
      }

      authlogin()
    }
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
              value={apiBaseUrl || ""}
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

          {/* 🔹 Strategy Selector */}
          <Select
            value={strategy}
            onValueChange={(val) => setStrategy(val as "none" | "cognito")}
          >
            <SelectTrigger className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <SelectValue placeholder="Choose login strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Security</SelectItem>
              <SelectItem value="cognito">Cognito Security</SelectItem>
            </SelectContent>
          </Select>

          {/* 🔹 Submit */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-transform hover:scale-[1.02]"
          >
            Login
          </Button>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
        </form>
      </Card>
    </div>
  )
}
