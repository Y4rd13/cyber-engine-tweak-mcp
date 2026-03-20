import type { BridgeResponse } from "./protocol.js";

export function formatToolResult(response: BridgeResponse): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  if (response.ok) {
    return {
      content: [{ type: "text", text: response.result ?? "(no output)" }],
    };
  }
  return {
    content: [{ type: "text", text: `Error: ${response.error ?? "Unknown error"}` }],
    isError: true,
  };
}

export function formatError(message: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
} {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
