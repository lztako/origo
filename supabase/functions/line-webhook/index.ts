import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const MAX_TEXT_CHARS = 1200;
const LINK_TOKEN_TTL_MINUTES = 10;
const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
const AI_AGENT_PATH = "/functions/v1/ai-agent";
const AI_TIMEOUT_MS = 22000;
const DEFAULT_REPLAY_WINDOW_SECONDS = 300;
const DEFAULT_RATE_LIMIT_USER_PER_MINUTE = 20;
const DEFAULT_RATE_LIMIT_ENTITY_PER_MINUTE = 120;
const LINE_SHORT_REPLY_MAX_LINES = 6;
const LINE_SHORT_REPLY_MAX_CHARS = 520;
const LINE_SHORT_DETAIL_HINT = "พิมพ์ รายละเอียด หากต้องการข้อมูลเชิงลึกเพิ่มเติม";

type JsonRecord = Record<string, unknown>;

type LineUserLinkRow = {
  link_id: string;
  line_user_id: string;
  user_id: string;
  entity_id: string;
  status: "pending_link" | "active" | "suspended" | "revoked" | "terminated";
  updated_at?: string | null;
};

type LinkContext = {
  latest: LineUserLinkRow | null;
  active: LineUserLinkRow | null;
};

type ReplyDecision = {
  text: string;
  entityId: string | null;
  status: string;
};

type AiLineReply = {
  answer: string;
  requestId: string | null;
  status: string;
};

const COMMAND_LINK = new Set(["start", "link", "เริ่มใช้งาน"]);
const COMMAND_STATUS = new Set(["status", "สถานะ"]);
const COMMAND_HELP = new Set(["help", "ช่วยเหลือ"]);
const COMMAND_LOGOUT = new Set(["logout"]);
const COMMAND_LOGOUT_CONFIRM = new Set(["confirm logout", "confirm-logout", "ยืนยัน logout"]);
const COMMAND_CANCEL_SERVICE = new Set(["ยกเลิกบริการ"]);

const RESPONSES = {
  LINK_REQUIRED:
    "บัญชี LINE นี้ยังไม่ได้เชื่อมระบบ กรุณากดลิงก์เพื่อเชื่อมบัญชี: {link_url}",
  LINK_REQUIRED_NO_URL:
    "บัญชี LINE นี้ยังไม่ได้เชื่อมระบบ กรุณาติดต่อผู้ดูแลเพื่อขอลิงก์เชื่อมบัญชี",
  STATUS_ACTIVE: "สถานะ: เชื่อมต่อแล้ว (Active)",
  STATUS_PENDING: "สถานะ: รอเชื่อมบัญชี (Pending) กรุณาดำเนินการผ่านลิงก์ที่ได้รับ",
  STATUS_SUSPENDED: "สถานะ: ระงับชั่วคราว (Suspended) กรุณาติดต่อผู้ดูแลระบบ",
  STATUS_REVOKED: "สถานะ: ยังไม่ได้เชื่อมบัญชี (Revoked) พิมพ์ `เริ่มใช้งาน` เพื่อเชื่อมใหม่",
  LOGOUT_CONFIRM:
    "ต้องการยกเลิกการเชื่อมบัญชีใช่หรือไม่? พิมพ์ `ยืนยัน logout`",
  LOGOUT_SUCCESS:
    "ยกเลิกการเชื่อมบัญชีเรียบร้อยแล้ว หากต้องการใช้อีกครั้งพิมพ์ `เริ่มใช้งาน`",
  SERVICE_TERMINATED:
    "บริการ LINE OA ของบริษัทนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  SYSTEM_FALLBACK:
    "ระบบกำลังหนาแน่นชั่วคราว กรุณาลองใหม่ในอีก 10-30 วินาที",
  RATE_LIMITED:
    "ได้รับข้อความจำนวนมากในช่วงสั้น ๆ กรุณาลองใหม่ในอีก 30-60 วินาที",
  UNSAFE_BLOCKED:
    "ขออภัย ระบบไม่สามารถประมวลผลคำขอในรูปแบบนี้ได้ กรุณาถามเป็นคำถามธุรกิจโดยตรง",
  CANCEL_REQUEST_ACCEPTED:
    "รับคำขอยกเลิกบริการแล้ว ทีมงานจะติดต่อผู้ดูแลบัญชีของบริษัทต่อไป"
};

function toJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function trimText(value: unknown, maxChars = MAX_TEXT_CHARS): string {
  const text = String(value ?? "").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3)}...`;
}

function normalizeCommand(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function stripLineMarkdown(text: string): string {
  let output = String(text || "");
  output = output.replace(/```[\s\S]*?```/g, "");
  output = output.replace(/`([^`]*)`/g, "$1");
  output = output.replace(/\*\*([^*]+)\*\*/g, "$1");
  output = output.replace(/__([^_]+)__/g, "$1");
  output = output.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  output = output.replace(/^\s*>\s?/gm, "");
  output = output.replace(/^\s*[*•]\s+/gm, "- ");
  output = output.replace(/\*\*/g, "");
  output = output.replace(/__/g, "");
  output = output.replace(/\r/g, "");
  return output;
}

function shouldUseShortFirst(question: string): boolean {
  const normalized = normalizeCommand(question);
  if (!normalized) return true;
  return !/(รายละเอียด|detail|ละเอียด|full report|full|เจาะลึก|deep dive|table|ทั้งหมด|ทุกบรรทัด)/i.test(normalized);
}

function applyLineAnswerPolicy(answer: string, question: string): string {
  const cleaned = trimText(stripLineMarkdown(answer), MAX_TEXT_CHARS)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) return RESPONSES.SYSTEM_FALLBACK;
  if (!shouldUseShortFirst(question)) return cleaned;

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (!lines.length) return RESPONSES.SYSTEM_FALLBACK;

  let shortened = lines.slice(0, LINE_SHORT_REPLY_MAX_LINES).join("\n");
  const truncatedByLines = lines.length > LINE_SHORT_REPLY_MAX_LINES;
  const truncatedByChars = shortened.length > LINE_SHORT_REPLY_MAX_CHARS;

  if (truncatedByChars) {
    shortened = trimText(shortened, LINE_SHORT_REPLY_MAX_CHARS);
  }

  if (truncatedByLines || truncatedByChars) {
    shortened = trimText(`${shortened}\n${LINE_SHORT_DETAIL_HINT}`, MAX_TEXT_CHARS);
  }

  return shortened;
}

function parseCommand(text: string): "link" | "status" | "help" | "logout" | "confirm_logout" | "cancel_service" | "question" {
  const normalized = normalizeCommand(text);
  if (COMMAND_LINK.has(normalized)) return "link";
  if (COMMAND_STATUS.has(normalized)) return "status";
  if (COMMAND_HELP.has(normalized)) return "help";
  if (COMMAND_LOGOUT.has(normalized)) return "logout";
  if (COMMAND_LOGOUT_CONFIRM.has(normalized)) return "confirm_logout";
  if (COMMAND_CANCEL_SERVICE.has(normalized)) return "cancel_service";
  return "question";
}

function extractLineUserId(event: any): string | null {
  const lineUserId = String(event?.source?.userId || "").trim();
  return lineUserId || null;
}

function extractReplyToken(event: any): string | null {
  const replyToken = String(event?.replyToken || "").trim();
  return replyToken || null;
}

function extractTextMessage(event: any): string | null {
  if (String(event?.type || "").trim() !== "message") return null;
  if (String(event?.message?.type || "").trim() !== "text") return null;
  const text = trimText(event?.message?.text || "", MAX_TEXT_CHARS);
  return text || null;
}

function parsePostbackDataToCommandText(rawData: string): string | null {
  const raw = String(rawData || "").trim();
  if (!raw) return null;

  const candidates: string[] = [];
  candidates.push(normalizeCommand(raw));

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const keys = ["cmd", "command", "action", "intent", "text"];
      for (const key of keys) {
        const value = normalizeCommand((parsed as Record<string, unknown>)[key] || "");
        if (value) candidates.push(value);
      }
    }
  } catch (_error) {
    // Not JSON, continue with query-string parser.
  }

  try {
    const params = new URLSearchParams(raw);
    const keys = ["cmd", "command", "action", "intent", "text"];
    for (const key of keys) {
      const value = normalizeCommand(params.get(key) || "");
      if (value) candidates.push(value);
    }
  } catch (_error) {
    // Keep raw candidate only.
  }

  const normalizeCandidate = (value: string) =>
    normalizeCommand(value).replace(/^(cmd|command|action|intent|text)\s*=\s*/, "").trim();

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) continue;
    if (normalized === "link" || normalized === "start") return "เริ่มใช้งาน";
    if (normalized === "status") return "สถานะ";
    if (normalized === "help") return "ช่วยเหลือ";
    if (normalized === "summary" || normalized === "quick_summary" || normalized === "monthly_summary") {
      return "สรุป finance กับ operation ล่าสุด สั้นๆ";
    }
    if (normalized === "detail" || normalized === "detail_summary" || normalized === "deep_dive") {
      return "สรุป finance กับ operation ล่าสุด แบบละเอียด";
    }
    if (normalized === "logout") return "logout";
    if (normalized === "confirm_logout" || normalized === "confirm-logout" || normalized === "confirm logout") {
      return "ยืนยัน logout";
    }
    if (normalized === "cancel_service" || normalized === "cancel-service") return "ยกเลิกบริการ";
  }

  return null;
}

function extractInboundText(event: any): string | null {
  const textMessage = extractTextMessage(event);
  if (textMessage) return textMessage;

  if (String(event?.type || "").trim() === "postback") {
    const data = String(event?.postback?.data || "").trim();
    const parsed = parsePostbackDataToCommandText(data);
    if (parsed) return parsed;
  }

  return null;
}

function getLineEventType(event: any): string {
  return String(event?.type || "unknown").trim() || "unknown";
}

function getLineEventId(event: any, eventIndex: number, requestHash: string): string {
  const webhookEventId = String(event?.webhookEventId || "").trim();
  if (webhookEventId) return webhookEventId;

  const messageId = String(event?.message?.id || "").trim();
  if (messageId) return `message_${messageId}`;

  const timestamp = String(event?.timestamp || "").trim();
  if (timestamp) return `ts_${timestamp}_${eventIndex}`;

  return `fallback_${requestHash}_${eventIndex}`;
}

function buildHelpMessage(): string {
  return [
    "คำสั่งที่รองรับ:",
    "- เริ่มใช้งาน / link: เชื่อมบัญชี",
    "- สถานะ / status: ตรวจสถานะบัญชี",
    "- ช่วยเหลือ / help: แสดงคำสั่ง",
    "- logout: ยกเลิกการเชื่อมบัญชี",
    "- ยกเลิกบริการ: ส่งคำขอไปยังทีมดูแล"
  ].join("\n");
}

function getEnv(name: string): string {
  const value = String(Deno.env.get(name) || "").trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string): string | null {
  const value = String(Deno.env.get(name) || "").trim();
  return value || null;
}

function getEnvInt(name: string, fallback: number): number {
  const raw = Number(Deno.env.get(name));
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.floor(raw);
}

function maskEmail(value: string): string {
  const text = String(value || "").trim();
  const [local, domain] = text.split("@");
  if (!local || !domain) return text;
  const maskedLocal = local.length <= 2
    ? `${local[0] || "*"}*`
    : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

function maskPhone(value: string): string {
  const digits = String(value || "").replace(/\D+/g, "");
  if (digits.length < 8) return value;
  const head = digits.slice(0, 3);
  const tail = digits.slice(-2);
  return `${head}${"*".repeat(Math.max(0, digits.length - 5))}${tail}`;
}

function maskLineUserId(lineUserId: string): string {
  const value = String(lineUserId || "").trim();
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

function maskSensitiveText(value: string): string {
  let text = String(value || "");
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (match) => maskEmail(match));
  text = text.replace(/(?:\+?\d[\d\s\-()]{6,}\d)/g, (match) => maskPhone(match));
  return text;
}

function sanitizeRawEventPayload(payload: any): JsonRecord {
  if (!payload || typeof payload !== "object") return {};
  let cloned: any = {};
  try {
    cloned = JSON.parse(JSON.stringify(payload));
  } catch (_error) {
    return {};
  }

  if (typeof cloned?.message?.text === "string") {
    cloned.message.text = trimText(maskSensitiveText(cloned.message.text), MAX_TEXT_CHARS);
  }
  if (typeof cloned?.postback?.data === "string") {
    cloned.postback.data = trimText(maskSensitiveText(cloned.postback.data), MAX_TEXT_CHARS);
  }
  if (typeof cloned?.source?.userId === "string") {
    cloned.source.userId = maskLineUserId(cloned.source.userId);
  }

  return cloned;
}

function isUnsafeInboundText(value: string): boolean {
  const text = String(value || "").toLowerCase();
  const patterns = [
    /ignore (all )?(previous|prior) instructions/,
    /reveal (system|hidden) prompt/,
    /prompt injection/,
    /you are now /,
    /bypass (policy|guard|safety)/,
    /act as developer/,
    /show me your instructions/
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function isWithinReplayWindow(event: any): boolean {
  const replayWindowSeconds = getEnvInt("LINE_REPLAY_WINDOW_SECONDS", DEFAULT_REPLAY_WINDOW_SECONDS);
  const eventTimestamp = Number(event?.timestamp || 0);
  if (!Number.isFinite(eventTimestamp) || eventTimestamp <= 0) return false;
  const now = Date.now();
  return Math.abs(now - eventTimestamp) <= replayWindowSeconds * 1000;
}

function createAdminClient() {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToBase64(new Uint8Array(signatureBuffer));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let diff = 0;
  for (let i = 0; i < leftBytes.length; i += 1) {
    diff |= leftBytes[i] ^ rightBytes[i];
  }
  return diff === 0;
}

async function verifyLineSignature(secret: string, rawBody: string, headerSignature: string | null): Promise<boolean> {
  if (!headerSignature) return false;
  const expected = await hmacSha256Base64(secret, rawBody);
  return timingSafeEqual(headerSignature.trim(), expected.trim());
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function loadLinkContext(adminClient: any, lineUserId: string): Promise<LinkContext> {
  const { data, error } = await adminClient
    .from("line_user_links")
    .select("link_id, line_user_id, user_id, entity_id, status, updated_at")
    .eq("line_user_id", lineUserId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    return { latest: null, active: null };
  }

  const rows = Array.isArray(data) ? (data as LineUserLinkRow[]) : [];
  return {
    latest: rows[0] || null,
    active: rows.find((row) => row.status === "active") || null
  };
}

async function issueLinkToken(adminClient: any, lineUserId: string): Promise<string | null> {
  const linkBaseUrl = getOptionalEnv("LINE_LINK_BASE_URL");
  if (!linkBaseUrl) return null;

  await adminClient
    .from("line_link_tokens")
    .update({
      status: "revoked"
    })
    .eq("line_user_id", lineUserId)
    .eq("status", "issued");

  const linkToken = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await adminClient.from("line_link_tokens").insert({
    link_token: linkToken,
    line_user_id: lineUserId,
    status: "issued",
    expires_at: expiresAt
  });

  if (error) return null;

  const separator = linkBaseUrl.includes("?") ? "&" : "?";
  return `${linkBaseUrl}${separator}token=${encodeURIComponent(linkToken)}`;
}

async function revokeActiveLink(adminClient: any, lineUserId: string): Promise<{ entityId: string | null; ok: boolean }> {
  const { data, error } = await adminClient
    .from("line_user_links")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoke_reason: "user_logout"
    })
    .eq("line_user_id", lineUserId)
    .eq("status", "active")
    .select("entity_id");

  if (error) return { entityId: null, ok: false };
  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return { entityId: row?.entity_id || null, ok: Boolean(row) };
}

async function insertWebhookEvent(
  adminClient: any,
  input: {
    lineEventId: string;
    lineUserId: string | null;
    entityId: string | null;
    eventType: string;
    rawPayload: JsonRecord;
    signatureValid: boolean;
    processed: boolean;
    errorMessage: string | null;
  }
): Promise<{ duplicate: boolean; ok: boolean }> {
  const { error } = await adminClient.from("line_webhook_events").insert({
    line_event_id: input.lineEventId,
    line_user_id: input.lineUserId,
    entity_id: input.entityId,
    event_type: input.eventType,
    raw_payload: input.rawPayload,
    signature_valid: input.signatureValid,
    processed: input.processed,
    error_message: input.errorMessage
  });

  if (!error) return { duplicate: false, ok: true };
  if (error.code === "23505") return { duplicate: true, ok: false };
  return { duplicate: false, ok: false };
}

async function updateWebhookEventState(
  adminClient: any,
  lineEventId: string,
  processed: boolean,
  errorMessage: string | null,
  entityId: string | null = null
) {
  const updatePayload: Record<string, unknown> = {
    processed,
    error_message: errorMessage
  };
  if (entityId) {
    updatePayload.entity_id = entityId;
  }

  await adminClient.from("line_webhook_events").update(updatePayload).eq("line_event_id", lineEventId);
}

async function insertMessageLog(
  adminClient: any,
  input: {
    lineUserId: string;
    entityId: string | null;
    direction: "inbound" | "outbound";
    contentText: string;
    status: string;
    requestId?: string | null;
  }
) {
  await adminClient.from("line_message_logs").insert({
    line_user_id: input.lineUserId,
    entity_id: input.entityId,
    direction: input.direction,
    channel: "line",
    request_id: input.requestId || null,
    content_text: trimText(maskSensitiveText(input.contentText), MAX_TEXT_CHARS),
    status: input.status
  });
}

async function checkRateLimit(
  adminClient: any,
  lineUserId: string,
  entityId: string | null
): Promise<{ limited: boolean; status: string }> {
  const windowSeconds = 60;
  const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const userLimit = getEnvInt("LINE_RATE_LIMIT_USER_PER_MINUTE", DEFAULT_RATE_LIMIT_USER_PER_MINUTE);
  const entityLimit = getEnvInt("LINE_RATE_LIMIT_ENTITY_PER_MINUTE", DEFAULT_RATE_LIMIT_ENTITY_PER_MINUTE);

  const { count: userCount, error: userCountError } = await adminClient
    .from("line_message_logs")
    .select("message_id", { head: true, count: "exact" })
    .eq("channel", "line")
    .eq("direction", "inbound")
    .eq("line_user_id", lineUserId)
    .gte("created_at", sinceIso);

  if (!userCountError && Number(userCount || 0) >= userLimit) {
    return { limited: true, status: "rate_limited_user" };
  }

  if (entityId) {
    const { count: entityCount, error: entityCountError } = await adminClient
      .from("line_message_logs")
      .select("message_id", { head: true, count: "exact" })
      .eq("channel", "line")
      .eq("direction", "inbound")
      .eq("entity_id", entityId)
      .gte("created_at", sinceIso);

    if (!entityCountError && Number(entityCount || 0) >= entityLimit) {
      return { limited: true, status: "rate_limited_entity" };
    }
  }

  return { limited: false, status: "rate_limit_ok" };
}

async function callAiAgentForLine(input: {
  question: string;
  lineUserId: string;
  entityId: string;
  userId: string;
}): Promise<AiLineReply> {
  const supabaseUrl = getOptionalEnv("SUPABASE_URL");
  const serviceRoleKey = getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  const internalSecret = getOptionalEnv("LINE_AI_INTERNAL_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !internalSecret) {
    return {
      answer: RESPONSES.SYSTEM_FALLBACK,
      requestId: null,
      status: "ai_config_missing"
    };
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("line_ai_timeout"), AI_TIMEOUT_MS);
    try {
      const response = await fetch(`${supabaseUrl}${AI_AGENT_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          "x-line-internal-secret": internalSecret
        },
        body: JSON.stringify({
          mode: "default",
          strict_server_only: true,
          channel: "line",
          internal_scope: {
            entity_id: input.entityId,
            user_id: input.userId
          },
          context: {
            channel: "line",
            line_user_id_masked: maskLineUserId(input.lineUserId)
          },
          messages: [
            {
              role: "user",
              content: trimText(input.question, MAX_TEXT_CHARS)
            }
          ]
        }),
        signal: controller.signal
      });

      let body: any = null;
      try {
        body = await response.json();
      } catch (_error) {
        body = null;
      }

      if (response.ok) {
        const answer = applyLineAnswerPolicy(String(body?.answer || ""), input.question);
        return {
          answer: answer || RESPONSES.SYSTEM_FALLBACK,
          requestId: String(body?.request_id || "").trim() || null,
          status: answer ? "ai_answered" : "ai_empty_fallback"
        };
      }

      if (attempt < 2 && Number(response.status || 0) >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }

      return {
        answer: RESPONSES.SYSTEM_FALLBACK,
        requestId: null,
        status: "ai_http_error"
      };
    } catch (_error) {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      return {
        answer: RESPONSES.SYSTEM_FALLBACK,
        requestId: null,
        status: "ai_exception_fallback"
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    answer: RESPONSES.SYSTEM_FALLBACK,
    requestId: null,
    status: "ai_exception_fallback"
  };
}

async function sendLineReply(channelAccessToken: string, replyToken: string, text: string): Promise<{ ok: boolean; error: string | null }> {
  const response = await fetch(LINE_REPLY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text: trimText(text, MAX_TEXT_CHARS)
        }
      ]
    })
  });

  if (response.ok) return { ok: true, error: null };

  const errorText = trimText(await response.text(), 600);
  return {
    ok: false,
    error: `LINE reply failed (${response.status}): ${errorText}`
  };
}

async function decideReply(adminClient: any, lineUserId: string, inboundText: string, linkContext: LinkContext): Promise<ReplyDecision> {
  const command = parseCommand(inboundText);

  if (command === "help") {
    return { text: buildHelpMessage(), entityId: linkContext.active?.entity_id || linkContext.latest?.entity_id || null, status: "help" };
  }

  if (command === "cancel_service") {
    return {
      text: RESPONSES.CANCEL_REQUEST_ACCEPTED,
      entityId: linkContext.active?.entity_id || linkContext.latest?.entity_id || null,
      status: "cancel_requested"
    };
  }

  if (linkContext.latest?.status === "terminated" && command !== "help") {
    return {
      text: RESPONSES.SERVICE_TERMINATED,
      entityId: linkContext.latest.entity_id || null,
      status: "service_terminated"
    };
  }

  if (command === "status") {
    if (linkContext.active) {
      return { text: RESPONSES.STATUS_ACTIVE, entityId: linkContext.active.entity_id, status: "status_active" };
    }
    if (linkContext.latest?.status === "pending_link") {
      return { text: RESPONSES.STATUS_PENDING, entityId: linkContext.latest.entity_id || null, status: "status_pending" };
    }
    if (linkContext.latest?.status === "suspended") {
      return { text: RESPONSES.STATUS_SUSPENDED, entityId: linkContext.latest.entity_id || null, status: "status_suspended" };
    }
    if (linkContext.latest?.status === "revoked") {
      return { text: RESPONSES.STATUS_REVOKED, entityId: linkContext.latest.entity_id || null, status: "status_revoked" };
    }

    const linkUrl = await issueLinkToken(adminClient, lineUserId);
    return {
      text: linkUrl
        ? RESPONSES.LINK_REQUIRED.replace("{link_url}", linkUrl)
        : RESPONSES.LINK_REQUIRED_NO_URL,
      entityId: null,
      status: "status_unlinked"
    };
  }

  if (command === "link") {
    if (linkContext.active) {
      return { text: RESPONSES.STATUS_ACTIVE, entityId: linkContext.active.entity_id, status: "already_active" };
    }
    if (linkContext.latest?.status === "suspended") {
      return {
        text: RESPONSES.STATUS_SUSPENDED,
        entityId: linkContext.latest.entity_id || null,
        status: "link_blocked_suspended"
      };
    }

    const linkUrl = await issueLinkToken(adminClient, lineUserId);
    return {
      text: linkUrl
        ? RESPONSES.LINK_REQUIRED.replace("{link_url}", linkUrl)
        : RESPONSES.LINK_REQUIRED_NO_URL,
      entityId: linkContext.latest?.entity_id || null,
      status: "link_required"
    };
  }

  if (command === "logout") {
    if (linkContext.active) {
      return {
        text: RESPONSES.LOGOUT_CONFIRM,
        entityId: linkContext.active.entity_id,
        status: "logout_confirm_requested"
      };
    }

    const linkUrl = await issueLinkToken(adminClient, lineUserId);
    return {
      text: linkUrl
        ? RESPONSES.LINK_REQUIRED.replace("{link_url}", linkUrl)
        : RESPONSES.LINK_REQUIRED_NO_URL,
      entityId: linkContext.latest?.entity_id || null,
      status: "logout_no_active_link"
    };
  }

  if (command === "confirm_logout") {
    if (!linkContext.active) {
      const linkUrl = await issueLinkToken(adminClient, lineUserId);
      return {
        text: linkUrl
          ? RESPONSES.LINK_REQUIRED.replace("{link_url}", linkUrl)
          : RESPONSES.LINK_REQUIRED_NO_URL,
        entityId: linkContext.latest?.entity_id || null,
        status: "logout_confirm_no_active_link"
      };
    }

    const revoked = await revokeActiveLink(adminClient, lineUserId);
    if (!revoked.ok) {
      return {
        text: RESPONSES.SYSTEM_FALLBACK,
        entityId: linkContext.active.entity_id,
        status: "logout_failed"
      };
    }

    return {
      text: RESPONSES.LOGOUT_SUCCESS,
      entityId: revoked.entityId || linkContext.active.entity_id,
      status: "logout_success"
    };
  }

  if (!linkContext.active) {
    const linkUrl = await issueLinkToken(adminClient, lineUserId);
    return {
      text: linkUrl
        ? RESPONSES.LINK_REQUIRED.replace("{link_url}", linkUrl)
        : RESPONSES.LINK_REQUIRED_NO_URL,
      entityId: linkContext.latest?.entity_id || null,
      status: "question_unlinked"
    };
  }

  if (linkContext.active.status === "suspended") {
    return {
      text: RESPONSES.STATUS_SUSPENDED,
      entityId: linkContext.active.entity_id,
      status: "question_suspended"
    };
  }

  return {
    text: "",
    entityId: linkContext.active.entity_id,
    status: "question_active"
  };
}

async function logInvalidSignatureEvents(adminClient: any, payload: any, requestHash: string) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  if (events.length === 0) {
    await insertWebhookEvent(adminClient, {
      lineEventId: `invalid_signature_${requestHash}`,
      lineUserId: null,
      entityId: null,
      eventType: "invalid_signature",
      rawPayload: { raw_body_available: true },
      signatureValid: false,
      processed: false,
      errorMessage: "invalid_signature"
    });
    return;
  }

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const lineUserId = extractLineUserId(event);
    const lineEventId = getLineEventId(event, index, requestHash);
    await insertWebhookEvent(adminClient, {
      lineEventId,
      lineUserId,
      entityId: null,
      eventType: getLineEventType(event),
      rawPayload: sanitizeRawEventPayload(event),
      signatureValid: false,
      processed: false,
      errorMessage: "invalid_signature"
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return toJson({ error: "Method not allowed" }, 405);
  }

  let adminClient: any;
  let channelSecret = "";
  let channelAccessToken = "";
  try {
    adminClient = createAdminClient();
    channelSecret = getEnv("LINE_CHANNEL_SECRET");
    channelAccessToken = getEnv("LINE_CHANNEL_ACCESS_TOKEN");
  } catch (error) {
    return toJson({ error: String((error as Error)?.message || "missing configuration") }, 500);
  }

  const rawBody = await req.text();
  const requestHash = (await sha256Hex(rawBody || "empty")).slice(0, 24);

  let payload: any = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (_error) {
    await insertWebhookEvent(adminClient, {
      lineEventId: `invalid_json_${requestHash}`,
      lineUserId: null,
      entityId: null,
      eventType: "invalid_json",
      rawPayload: { raw_body_hash: requestHash },
      signatureValid: false,
      processed: false,
      errorMessage: "invalid_json"
    });
    return toJson({ error: "Invalid JSON payload" }, 400);
  }

  const signatureHeader = req.headers.get("x-line-signature") || req.headers.get("X-Line-Signature");
  const signatureValid = await verifyLineSignature(channelSecret, rawBody, signatureHeader);
  if (!signatureValid) {
    await logInvalidSignatureEvents(adminClient, payload, requestHash);
    return toJson({ error: "Invalid signature" }, 401);
  }

  const events = Array.isArray(payload?.events) ? payload.events : [];
  if (events.length === 0) {
    return toJson({ ok: true, processed: 0 });
  }

  let processed = 0;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const lineEventId = getLineEventId(event, index, requestHash);
    const lineUserId = extractLineUserId(event);
    const eventType = getLineEventType(event);

    const inserted = await insertWebhookEvent(adminClient, {
      lineEventId,
      lineUserId,
      entityId: null,
      eventType,
      rawPayload: sanitizeRawEventPayload(event),
      signatureValid: true,
      processed: false,
      errorMessage: null
    });

    if (inserted.duplicate || !inserted.ok) {
      continue;
    }

    if (!isWithinReplayWindow(event)) {
      await updateWebhookEventState(adminClient, lineEventId, true, "replay_window_rejected", null);
      processed += 1;
      continue;
    }

    let resolvedEntityId: string | null = null;
    try {
      const replyToken = extractReplyToken(event);
      const inboundText = extractInboundText(event);

      if (!lineUserId || !replyToken || !inboundText) {
        await updateWebhookEventState(adminClient, lineEventId, true, null, null);
        processed += 1;
        continue;
      }

      const linkContext = await loadLinkContext(adminClient, lineUserId);
      const inboundEntityId = linkContext.active?.entity_id || linkContext.latest?.entity_id || null;
      resolvedEntityId = inboundEntityId;

      const rateLimitCheck = await checkRateLimit(adminClient, lineUserId, inboundEntityId);
      await insertMessageLog(adminClient, {
        lineUserId,
        entityId: inboundEntityId,
        direction: "inbound",
        contentText: inboundText,
        status: rateLimitCheck.limited ? rateLimitCheck.status : "received"
      });

      if (rateLimitCheck.limited) {
        const limitedReply = await sendLineReply(channelAccessToken, replyToken, RESPONSES.RATE_LIMITED);
        await insertMessageLog(adminClient, {
          lineUserId,
          entityId: inboundEntityId,
          direction: "outbound",
          contentText: RESPONSES.RATE_LIMITED,
          status: limitedReply.ok ? rateLimitCheck.status : `${rateLimitCheck.status}_send_error`
        });
        await updateWebhookEventState(
          adminClient,
          lineEventId,
          true,
          limitedReply.error,
          inboundEntityId
        );
        processed += 1;
        continue;
      }

      let replyDecision = await decideReply(adminClient, lineUserId, inboundText, linkContext);
      let outboundRequestId: string | null = null;

      if (replyDecision.status === "question_active" && isUnsafeInboundText(inboundText)) {
        replyDecision = {
          text: RESPONSES.UNSAFE_BLOCKED,
          entityId: linkContext.active?.entity_id || null,
          status: "unsafe_blocked"
        };
      }

      if (
        replyDecision.status === "question_active" &&
        linkContext.active?.entity_id &&
        linkContext.active?.user_id
      ) {
        const aiReply = await callAiAgentForLine({
          question: inboundText,
          lineUserId,
          entityId: linkContext.active.entity_id,
          userId: linkContext.active.user_id
        });
        replyDecision = {
          text: aiReply.answer,
          entityId: linkContext.active.entity_id,
          status: aiReply.status
        };
        outboundRequestId = aiReply.requestId;
      }

      if (replyDecision.status === "question_active") {
        replyDecision = {
          text: RESPONSES.SYSTEM_FALLBACK,
          entityId: linkContext.active?.entity_id || null,
          status: "question_fallback"
        };
      }

      const lineReply = await sendLineReply(channelAccessToken, replyToken, replyDecision.text);

      await insertMessageLog(adminClient, {
        lineUserId,
        entityId: replyDecision.entityId,
        direction: "outbound",
        contentText: replyDecision.text,
        status: lineReply.ok ? replyDecision.status : `${replyDecision.status}_send_error`,
        requestId: outboundRequestId
      });

      await updateWebhookEventState(
        adminClient,
        lineEventId,
        true,
        lineReply.error,
        replyDecision.entityId || resolvedEntityId || null
      );
      processed += 1;
    } catch (error) {
      await updateWebhookEventState(
        adminClient,
        lineEventId,
        false,
        trimText(String((error as Error)?.message || error || "processing_failed"), 1000),
        resolvedEntityId
      );
    }
  }

  return toJson({
    ok: true,
    processed
  });
});
