# Events reconnect and authentication recovery

Decision date: 2026-10-26.

An expired token reported as HTTP 500 bypasses token refresh and previously caused
repeated SSE connection attempts at a fixed interval. The production API must still
return 401 for rejected credentials; frontend backoff only reduces transient-failure
traffic.

## Implemented behavior

- SSE reconnect delays grow from 3 to 6, 12, 24, then 30 seconds. Each delay adds
  up to 20% jitter, capped at 30 seconds. Reconnection continues during an outage.
- Incoming stream traffic or a connection lasting at least 30 seconds resets the
  delay. Successful headers alone do not reset it, preventing rapid empty streams
  from defeating backoff. SSE `retry:` directives set the base delay, clamped to
  1–30 seconds.
- A 401 refreshes credentials once. Refresh failure or another 401 clears credentials
  through the existing Cognito logout flow, which returns to the login page. The SSE
  connection stops retrying. A 403 stops reconnecting without logging out.
- Network errors and 5xx responses after successful refresh do not cause logout.
- Unmount, identity changes, and endpoint changes cancel the pending connection and
  reconnect timer through the existing cleanup.

The shared HTTP transport owns terminal-401 recovery for ordinary API requests as
well as SSE. Interpreting all 500s as authentication failures was rejected because
it would log users out during genuine server failures.

## Stage acceptance checks before production promotion

Use a dedicated test session and controlled stage responses. Never record bearer
tokens in screenshots, exported network logs, or tickets.

1. Deploy a fresh `npm run build:stage` artifact and reload the browser. Confirm the
   expected build and stage API URL; existing tabs continue using their loaded code.
2. Return 401 on the first events request, allow refresh, and accept the retry.
   Confirm one refresh and a working event stream with the new token.
3. Reject refresh. Confirm login recovery and no further events reconnection loop.
4. Return 401 again after successful refresh. Confirm only one refresh, login recovery,
   and no further events requests from that session.
5. Return 403. Confirm no refresh, no automatic logout, and no reconnect loop.
6. Return repeated 500/503 responses. Confirm increasing delays of approximately
   3–3.6, 6–7.2, 12–14.4, 24–28.8, then 30 seconds, plus request duration.
   Confirm no token refresh or logout solely because of these responses.
7. Restore the stream and send a heartbeat or event. Drop it again and confirm the
   delay resets. Confirm normal notification delivery after recovery.
8. Navigate away or log out while a retry is pending. Confirm the old session sends
   no more events requests. Check stage API logs for expected 401s rather than the
   public-key fallback 500 once the separate backend fix is deployed.

Local verification on 2026-10-26:

- `npm test -- --run src/hooks/useSSE.test.tsx src/app/providers/EventsProvider.test.tsx src/auth/authService.test.ts src/shared/api/apiBaseUrl.test.ts`: 31 tests passed.
- `npm run typecheck`: passed.
- `npm run build:stage`: passed; generated staging build 1.0.215.

Live stage acceptance remains pending deployment access and an authenticated stage
test session. Local tests and a staging build do not establish live stage success.
