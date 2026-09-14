import type { ApprovalState } from "@/lib/types";

export const APPROVAL_STATES: ApprovalState[] = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "stale",
  "executed",
  "failed",
];

export function approvalStateLabel(state: ApprovalState): string {
  switch (state) {
    case "pending":
      return "Pending approval";
    case "approved":
      return "Approved — awaiting execution";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    case "stale":
      return "Stale";
    case "executed":
      return "Published";
    case "failed":
      return "Failed";
  }
}

export function approvalStateExplanation(state: ApprovalState): string | null {
  switch (state) {
    case "pending":
      return null;
    case "approved":
      return "This request is already approved and cannot be decided again.";
    case "rejected":
      return "This request was rejected and cannot later be approved.";
    case "expired":
      return "This request expired.";
    case "stale":
      return "Import changed after this request.";
    case "executed":
      return "Already executed.";
    case "failed":
      return "Publication failed for this request.";
  }
}

export function canDecideApproval(state: ApprovalState): boolean {
  return state === "pending";
}

export function shortFingerprint(fingerprint: string): string {
  if (fingerprint.length <= 16) return fingerprint;
  return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-4)}`;
}
