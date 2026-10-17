export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  // false = deliver without an alert sound (the user turned Sounds off)
  sound?: boolean;
}

export interface PushSendResult {
  invalidTokens: string[];
}

export interface PushProvider {
  send(tokens: string[], payload: PushPayload): Promise<PushSendResult>;
}
