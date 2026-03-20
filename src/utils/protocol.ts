import { randomUUID } from "node:crypto";

export interface BridgeRequest {
  id: string;
  type: "exec" | "eval" | "query";
  code?: string;
  expr?: string;
  handler?: string;
  args?: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  ok: boolean;
  result?: string;
  error?: string;
}

export function createRequest(
  type: BridgeRequest["type"],
  payload: Omit<BridgeRequest, "id" | "type">
): BridgeRequest {
  return { id: randomUUID(), type, ...payload };
}

export function parseResponse(raw: string): BridgeResponse {
  const parsed = JSON.parse(raw);
  if (typeof parsed.id !== "string" || typeof parsed.ok !== "boolean") {
    throw new Error("Invalid bridge response format");
  }
  return parsed as BridgeResponse;
}
