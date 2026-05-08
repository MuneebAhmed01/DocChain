import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, "..", ".baileys-auth");

let sock: WASocket | null = null;
let connecting: Promise<WASocket> | null = null;

export type WhatsAppClient = {
  sock: WASocket;
  sendText: (jid: string, text: string, logLabel: string) => Promise<void>;
  toJid: (phoneNumber: string) => string;
};

export function toJid(phoneNumber: string): string {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (!digits) throw new Error("Phone number is empty");
  return `${digits}@s.whatsapp.net`;
}

async function waitForConnectionOpen(s: WASocket): Promise<void> {
  if ((s as any).user) return;

  await new Promise<void>((resolve, reject) => {
    const onUpdate = (update: any) => {
      const { connection, lastDisconnect } = update ?? {};
      if (connection === "open") {
        cleanup();
        resolve();
        return;
      }
      if (connection === "close") {
        const err = lastDisconnect?.error as Boom | undefined;
        const statusCode = err?.output?.statusCode;
        cleanup();
        // 515 "restart required" is expected right after pairing; caller should retry init.
        if (statusCode === 515) {
          reject(err);
          return;
        }
        reject(err ?? new Error("WhatsApp connection closed before opening"));
      }
    };
    const cleanup = () => {
      s.ev.off("connection.update", onUpdate);
    };
    s.ev.on("connection.update", onUpdate);
  });
}

async function ensureConnected(): Promise<WASocket> {
  const startedAt = Date.now();
  const maxWaitMs = 90_000;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const client = await initWhatsAppClient();
      if ((client.sock as any).user) return client.sock;
      // If not logged-in yet, wait for open event.
      await waitForConnectionOpen(client.sock);
      return client.sock;
    } catch (e: any) {
      const statusCode = e?.output?.statusCode;
      if (statusCode === 515) {
        // restart required after pairing: clear and retry
        sock = null;
        connecting = null;
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw e;
    }
  }

  throw new Error("WhatsApp connection did not become ready in time");
}

export async function initWhatsAppClient(): Promise<WhatsAppClient> {
  if (sock) {
    return {
      sock,
      sendText,
      toJid,
    };
  }
  if (connecting) {
    const s = await connecting;
    return { sock: s, sendText, toJid };
  }

  connecting = (async () => {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const s = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
    });

    s.ev.on("creds.update", saveCreds);

    s.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        const err = lastDisconnect?.error as Boom | undefined;
        const statusCode = err?.output?.statusCode;
        // 440 conflict (replaced) typically means this WhatsApp account is active elsewhere.
        // Auto-reconnecting aggressively just causes loops & crashes; require user action instead.
        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut &&
          statusCode !== 440;

        console.error("[WA] connection closed", { statusCode, shouldReconnect, error: err });

        sock = null;
        connecting = null;

        if (shouldReconnect) {
          // fire and forget reconnect
          void initWhatsAppClient().catch((e) => console.error("[WA] reconnect failed", e));
        }
      } else if (connection === "open") {
        console.log("[WA] connection opened");
      } else if (connection === "connecting") {
        console.log("[WA] connecting... scan QR if prompted");
      }
    });

    // Assign immediately; readiness is handled by ensureConnected() before sending.
    sock = s;
    return s;
  })();

  const s = await connecting;
  return { sock: s, sendText, toJid };
}

export async function sendText(jid: string, text: string, logLabel: string): Promise<void> {
  try {
    const s = await ensureConnected();
    await s.sendMessage(jid, { text });
    console.log(`[SENT] ${logLabel}`);
    return;
  } catch (error: any) {
    const statusCode = error?.output?.statusCode;

    // One retry for transient close/timeouts. Never retry on conflict (440) or logout.
    if (statusCode && [408, 428].includes(statusCode) && statusCode !== 440) {
      console.warn(`[WA] transient send failure, retrying once`, { logLabel, statusCode });
      sock = null;
      connecting = null;
      const client = await initWhatsAppClient();
      try {
        await client.sock.sendMessage(jid, { text });
        console.log(`[SENT] ${logLabel} (retry)`);
        return;
      } catch (retryError) {
        console.error(`[ERROR] ${logLabel} (retry)`, retryError);
        throw retryError;
      }
    }

    console.error(`[ERROR] ${logLabel}`, error);
    throw error;
  }
}

