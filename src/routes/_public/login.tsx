import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useAppPreferences } from "@/context/AppPreferencesContext";
import { saveStoredAppPreferences } from "@/context/appPreferencesStorage";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogIn, Server } from "lucide-react";
import { authlogin, isAuthenticated } from "@/auth/authService";
import { setupLocalDevSession } from "@/features/auth/model/sessionManager";

const config = (window as any).__APP_CONFIG__ || {};
const availableServers = Object.keys(config)
  .filter((k) => k.startsWith("API_CLIENT_URL"))
  .map((key) => config[key])
  .filter(Boolean);

const LOCAL_DEV_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MzkyNjg0NCwianRpIjoiOWI2OTQ4NTUtZTQxMi00OTNjLTgzYzktZjNkYTcwNzRmYTNhIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6ImM0NjgyNGU4LWQwMDEtNzAyOS0xM2Y4LTFiNjVkNmZhZDA2OSIsIm5iZiI6MTc2MzkyNjg5NCwiZXhwIjoxNzYzOTMwNDQ0LCJjb2duaXRvOmdyb3VwcyI6WyJ1cy1lYXN0LTFfZDM4aGlFMlFNX09rdGFPSURDIl0sImlzcyI6Imh0dHBzOi8vY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vdXMtZWFzdC0xX2QzOGhpRTJRTSIsInZlcnNpb24iOjIsImNsaWVudF9pZCI6IjQ0bnRmNDUyc2htbHRzbWR0cmF2bG81MmkiLCJvcmlnaW5fanRpIjoiODFmMTEwOWUtZTQ3MS00MzQ1LWEwYTUtNmQyMmFmNThlNmE4IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJwaG9uZSBvcGVuaWQgcHJvZmlsZSBlbWFpbCIsImF1dGhfdGltZSI6MTc2MzkyNjg0NCwiYXBwX3VzZXJuYW1lIjoiU0hPVUtJLkJFTkpBTUlOIiwidXNlcm5hbWUiOiJva3Rhb2lkY18wMHUxYzZsbzVsd2NhbWsyaTB4OCJ9.Y56b1q9aXWi4Zjr-DfCj9J-XUJknu5tqi3VwQalC9d4";

const LOCAL_DEV_ID_TOKEN =
  "eyJhbGciOiJub25lIn0.eyJzdWIiOiJkZW1vLXVzZXIiLCJlbWFpbCI6ImRlbW9AZXhhbXBsZS5jb20iLCJ1c2VyX2lkIjoiZGVtb191c2VyIiwicm9sZXMiOlsiQURNSU4iLCJVU0VSIl0sImV4cCI6MTk0NDc3NjgwMH0.";

export const Route = createFileRoute("/_public/login")({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { login } = useUser();
  const { apiBaseUrl, setApiBaseUrl, stageLayout, paginationMode } = useAppPreferences();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiBaseUrl && availableServers.length > 0) {
      setApiBaseUrl(availableServers[0]);
    }
  }, [apiBaseUrl, setApiBaseUrl]);

  const currentApiBaseUrl = apiBaseUrl || availableServers[0] || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentApiBaseUrl) {
      setError("Please select an API server before using Cognito login.");
      return;
    }

    if (currentApiBaseUrl === "http://localhost:3001") {
      setError("");
      try {
        const roles = [
          { name: "DISPATCH" },
          { name: "NCRC" },
          { name: "INSP" },
          { name: "LEGAL" },
        ];
        const delegated = [{ name: "S.Benjamin" }, { name: "Jakit" }];

        const localDevUser = setupLocalDevSession({
          accessToken: LOCAL_DEV_ACCESS_TOKEN,
          idToken: LOCAL_DEV_ID_TOKEN,
          username: "S.Benjamin",
          role: "ALL",
          roles,
          delegated,
        });

        login(
          {
            username: localDevUser.username,
            role: localDevUser.role,
            roles: localDevUser.roles,
            delegated: localDevUser.delegated,
          },
          () => navigate({ to: "/" }),
        );
      } catch (err: any) {
        setError("Login failed: " + err.message);
      }
      return;
    }

    try {
      saveStoredAppPreferences({
        apiBaseUrl: currentApiBaseUrl,
        stageLayout,
        paginationMode,
      });
    } catch (err) {
      console.warn("[handleCognito] Failed to persist apiBaseUrl:", err);
    }

    authlogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-blue-900">
        <LogIn className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Login</h1>
      </div>

      <Card className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Login Options</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-blue-800 mb-1 block">
              Select API Server
            </label>
            <Select value={currentApiBaseUrl} onValueChange={(val) => setApiBaseUrl(val)}>
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
  );
}
