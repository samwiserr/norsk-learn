import { NextRequest } from "next/server";
import { sessionSyncRequestSchema } from "@/lib/contracts/sessionSync";
import {
  runPublicPostJson,
  jsonWithRequestId,
  apiErrorResponse,
  getDeviceIdOrNull,
} from "@/lib/api/publicRoute";
import { ErrorType } from "@/lib/error-handling";
import {
  saveSessionSnapshot,
  saveUserSessionSnapshot,
} from "@/src/server/persistence/sessionSnapshotStore";
import { verifyFirebaseIdTokenFromRequest } from "@/lib/firebase/firebaseAdmin";

export async function POST(request: NextRequest) {
  return runPublicPostJson(request, sessionSyncRequestSchema, async ({ requestId, data }) => {
    const deviceId = getDeviceIdOrNull(request);
    const authUser = await verifyFirebaseIdTokenFromRequest(request);

    if (!deviceId && !authUser) {
      return apiErrorResponse("Unauthorized: provide x-device-id or a valid Bearer token.", requestId, {
        code: "UNAUTHORIZED",
        status: 401,
        type: ErrorType.AUTH,
        retryable: false,
      });
    }

    const deviceOutcome = deviceId ? await saveSessionSnapshot(deviceId, data.snapshot) : null;
    const userOutcome = authUser ? await saveUserSessionSnapshot(authUser.uid, data.snapshot) : null;

    const ok = deviceOutcome?.ok || userOutcome?.ok;
    if (ok) return jsonWithRequestId({ ok: true, synced: true }, requestId);

    const noBackend =
      deviceOutcome?.reason === "no_backend" || userOutcome?.reason === "no_backend";

    if (noBackend) {
      return jsonWithRequestId(
        { ok: true, synced: false, reason: "persistence_not_configured" },
        requestId
      );
    }

    return jsonWithRequestId({ ok: false, synced: false, reason: "error" }, requestId, {
      status: 503,
    });
  });
}
