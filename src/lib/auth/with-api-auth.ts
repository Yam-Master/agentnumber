import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "./middleware";
import type { ApiContext } from "./types";

type ApiHandler = (
  request: NextRequest,
  context: ApiContext & { params?: Record<string, string> }
) => Promise<NextResponse>;

export function withApiAuth(handler: ApiHandler) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: { message: "Invalid or missing API key", code: "unauthorized" } },
        { status: 401 }
      );
    }

    const params = routeContext?.params ? await routeContext.params : undefined;
    return handler(request, { ...auth, params });
  };
}
