import { GeoApiError } from "@/lib/geo-api";

export type ActionError = { status: number; message: string };

const FALLBACK = "Unexpected error. Please try again.";

export function describeError(error: unknown): ActionError {
  if (error instanceof GeoApiError) {
    switch (error.status) {
      case 401:
      case 403:
        return {
          status: error.status,
          message: `Geo Hub rejected the admin credential (${error.status}). Check GEO_ADMIN_TOKEN on the server.`,
        };
      case 404:
        return { status: 404, message: error.message || "Not found." };
      case 409:
        return { status: 409, message: error.message || "Conflict." };
      case 422:
        return { status: 422, message: error.message || "Validation failed." };
      case 503:
        return { status: 503, message: "Geo API is unavailable." };
      default:
        return { status: error.status, message: error.message || FALLBACK };
    }
  }
  if (error instanceof Error) return { status: 0, message: error.message || FALLBACK };
  return { status: 0, message: FALLBACK };
}

export type ActionState = { error?: ActionError } | null;
