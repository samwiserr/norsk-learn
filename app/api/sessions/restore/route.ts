import { NextRequest } from "next/server";
import {
  runPublicGet,
  jsonWithRequestId,
  apiErrorResponse,
  getDeviceIdOrNull,
} from "@/lib/api/publicRoute";
import { ErrorType } from "@/lib/error-handling";
import {
  loadSessionSnapshot,
  loadUserSessionSnapshot,
} from "@/src/server/persistence/sessionSnapshotStore";
import { verifyFirebaseIdTokenFromRequest } from "@/lib/firebase/firebaseAdmin";

export async function GET(request: NextRequest) {
  return runPublicGet(request, async ({ requestId }) => {
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

    // Prefer user scope when token is provided.
    if (authUser) {
      const userSnapshot = await loadUserSessionSnapshot(authUser.uid);
      if (userSnapshot) {
        return jsonWithRequestId({ found: true, snapshot: userSnapshot }, requestId);
      }
    }

    if (!deviceId) {
      return jsonWithRequestId({ found: false, snapshot: null }, requestId);
    }

    const snapshot = await loadSessionSnapshot(deviceId);
    if (!snapshot) return jsonWithRequestId({ found: false, snapshot: null }, requestId);
    return jsonWithRequestId({ found: true, snapshot }, requestId);
  });
}
