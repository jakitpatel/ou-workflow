import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  consumeAuthRedirect,
  loadAuthenticatedSessionUserFromCognitoCallback,
  type AuthenticatedSessionUser,
} from "@/features/auth/model/sessionManager";
import { RouteErrorView } from "@/components/feedback/RouteErrorView";
import { useUser } from "@/context/UserContext";
import { useEffect } from "react";
import { isRedirect } from "@tanstack/react-router";

interface LoaderData {
  user: AuthenticatedSessionUser;
}

export const Route = createFileRoute("/_public/cognito-directcallback")({
  loader: async (): Promise<LoaderData> => {
    try {
      const user = await loadAuthenticatedSessionUserFromCognitoCallback({
        onClearUrl: (cleanPath) => {
          window.history.replaceState({}, document.title, cleanPath);
        },
      });

      if (!user) {
        throw redirect({
          to: "/login",
          search: { error: "oauth_callback_failed" },
        });
      }

      return { user };
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }

      throw redirect({
        to: "/login",
        search: {
          error: error instanceof Error ? error.message : "unknown_error",
        },
      });
    }
  },

  component: CognitoDirectCallback,
  errorComponent: CognitoDirectCallbackError,
});

function CognitoDirectCallback() {
  const { login } = useUser();
  const navigate = Route.useNavigate();
  const { user } = Route.useLoaderData();

  useEffect(() => {
    login(user, () => {
      navigate({ to: consumeAuthRedirect("/") });
    });
  }, [login, navigate, user]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-lg text-blue-700 font-medium">
          Completing authentication...
        </p>
        <p className="text-sm text-gray-500 mt-2">Setting up your session</p>
      </div>
    </div>
  );
}

function CognitoDirectCallbackError({
  error,
  reset,
}: {
  error: unknown;
  reset?: () => void;
}) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Authentication callback failed"
      description="We could not finish signing you in from Cognito. You can retry here or return to login."
      secondaryAction={
        <button
          type="button"
          onClick={() => window.location.assign("/login")}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back To Login
        </button>
      }
    />
  );
}
