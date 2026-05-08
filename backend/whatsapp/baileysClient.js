import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, "..", ".baileys-auth");

let sock = null;
let connecting = null;

export function toJid(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (!digits) throw new Error("Phone number is empty");
  return `${digits}@s.whatsapp.net`;
}

async function waitForConnectionOpen(s) {
  if (s?.user) return;

  await new Promise((resolve, reject) => {
    const onUpdate = (update) => {
      const { connection, lastDisconnect } = update ?? {};
      if (connection === "open") {
        cleanup();
        resolve();
        return;
      }
      if (connection === "close") {
        const err = lastDisconnect?.error;
        const statusCode = err?.output?.statusCode;
        cleanup();
        // 515 restart required after pairing is expected; caller should retry.
        if (statusCode === 515) {
          reject(err);
          return;
        }
        reject(err ?? new Error("WhatsApp connection closed before opening"));
      }
    };
    const cleanup = () => s.ev.off("connection.update", onUpdate);
    s.ev.on("connection.update", onUpdate);
  });
}

export async function initWhatsAppSocket() {
  if (sock) return sock;
  if (connecting) return await connecting;

  connecting = (async () => {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const s = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
    });

    s.ev.on("creds.update", saveCreds);

    s.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        const err = lastDisconnect?.error;
        const statusCode = err?.output?.statusCode;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut &&
          statusCode !== 440; // conflict/replaced -> requires user action

        console.error("[WA] connection closed", { statusCode, shouldReconnect, error: err });

        sock = null;
        connecting = null;

        if (shouldReconnect) {
          void initWhatsAppSocket().catch((e) => console.error("[WA] reconnect failed", e));
        }
      } else if (connection === "open") {
        console.log("[WA] connection opened");
      } else if (connection === "connecting") {
        console.log("[WA] connecting... scan QR if prompted");
      }
    });

    sock = s;
    return s;
  })();

  return await connecting;
}

export async function ensureConnected() {
  const startedAt = Date.now();
  const maxWaitMs = 90_000;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const s = await initWhatsAppSocket();
      if (s?.user) return s;
      await waitForConnectionOpen(s);
      return s;
    } catch (e) {
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

export async function sendText(jid, text, logLabel) {
  try {
    const s = await ensureConnected();
    await s.sendMessage(jid, { text });
    console.log(`[SENT] ${logLabel}`);
    return;
  } catch (error) {
    const statusCode = error?.output?.statusCode;

    // One retry for transient close/timeouts. Never retry on conflict (440) or logout.
    if (statusCode && [408, 428].includes(statusCode) && statusCode !== 440) {
      console.warn("[WA] transient send failure, retrying once", { logLabel, statusCode });
      sock = null;
      connecting = null;
      const s = await ensureConnected();
      await s.sendMessage(jid, { text });
      console.log(`[SENT] ${logLabel} (retry)`);
      return;
    }

    console.error(`[ERROR] ${logLabel}`, error);
    throw error;
  }
}

