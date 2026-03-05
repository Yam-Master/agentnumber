import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function apiError(
  message: string,
  code: string,
  status: number
): NextResponse {
  return NextResponse.json({ error: { message, code } }, { status });
}

export function apiList<T>(
  items: T[],
  pagination?: { total?: number; offset?: number; limit?: number }
): NextResponse {
  return NextResponse.json({
    data: items,
    pagination: pagination
      ? {
          total: pagination.total ?? items.length,
          offset: pagination.offset ?? 0,
          limit: pagination.limit ?? items.length,
        }
      : undefined,
  });
}
