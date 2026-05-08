import axios from "axios";

const WHAPI_API_URL = (process.env.WHAPI_API_URL || "https://gate.whapi.cloud").replace(/\/$/, "");
const WHAPI_TOKEN = process.env.WHAPI_TOKEN || process.env.WHAPI_API_TOKEN;
const WHAPI_TIMEOUT_MS = Number(process.env.WHAPI_TIMEOUT_MS || 15000);

export const normalizeWhapiPhoneNumber = (phoneNumber) => {
  let digits = String(phoneNumber || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("92")) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `92${digits}`;
  }

  return digits;
};

const isValidWhapiPhoneNumber = (normalizedPhone) => /^\d{10,15}$/.test(String(normalizedPhone || ""));

const formatPhoneForLogs = (normalizedPhone) => {
  if (!normalizedPhone) return "<missing>";
  return normalizedPhone.startsWith("+") ? normalizedPhone : `+${normalizedPhone}`;
};

export const sendWhapiTextMessage = async ({ to, body }) => {
  console.log("[WAPI] Reminder flow started");

  if (!WHAPI_API_URL) {
    console.error("[WAPI] Missing WHAPI_API_URL environment variable");
    throw new Error("Missing WHAPI_API_URL in environment.");
  }

  if (!WHAPI_TOKEN) {
    console.error("[WAPI] Missing WHAPI_TOKEN / WHAPI_API_TOKEN environment variable");
    throw new Error("Missing WHAPI_TOKEN or WHAPI_API_TOKEN in environment.");
  }

  const recipient = normalizeWhapiPhoneNumber(to);
  const recipientForLogs = formatPhoneForLogs(recipient);

  console.log(`[WAPI] WhatsApp reminder triggered for ${recipientForLogs}`);

  if (!recipient) {
    console.error("[WAPI] Invalid recipient: phone number missing after normalization", {
      originalPhone: to,
    });
    throw new Error("Recipient phone number is required.");
  }

  if (!isValidWhapiPhoneNumber(recipient)) {
    console.error("[WAPI] Invalid recipient phone number format", {
      originalPhone: to,
      normalizedPhone: recipient,
    });
    throw new Error(`Invalid recipient phone number format: ${recipient}`);
  }

  if (!body || !String(body).trim()) {
    console.error("[WAPI] Message body missing or empty", { recipient: recipientForLogs });
    throw new Error("Message body is required.");
  }

  const payload = {
    to: recipient,
    body: String(body),
  };

  const endpoint = `${WHAPI_API_URL}/messages/text`;
  console.log(`[WAPI] Sending WhatsApp message to ${recipientForLogs}`);
  console.log("[WAPI] Payload prepared", payload);
  console.log("[WAPI] Sending request", {
    endpoint,
    timeoutMs: WHAPI_TIMEOUT_MS,
    hasAuthorizationHeader: Boolean(WHAPI_TOKEN),
  });

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${WHAPI_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: WHAPI_TIMEOUT_MS,
    });

    console.log("[WAPI] WAPI response received", {
      status: response.status,
      statusText: response.statusText,
      recipient: recipientForLogs,
    });
    console.log("[WAPI] WhatsApp message sent successfully", {
      recipient: recipientForLogs,
      responseData: response.data,
    });
    console.log("[WAPI] WhatsApp reminder flow completed successfully");
    return response.data;
  } catch (error) {
    const isAxiosError = Boolean(error?.isAxiosError);
    const responseStatus = error?.response?.status;
    const responseData = error?.response?.data;
    const errorCode = error?.code;
    const isTimeout = errorCode === "ECONNABORTED";
    const isNetworkFailure = isAxiosError && !error?.response;

    if (isTimeout) {
      console.error("[WAPI] Request timeout while sending WhatsApp message", {
        recipient: recipientForLogs,
        timeoutMs: WHAPI_TIMEOUT_MS,
        code: errorCode,
        message: error?.message,
      });
    } else if (isNetworkFailure) {
      console.error("[WAPI] Network failure while calling WAPI", {
        recipient: recipientForLogs,
        code: errorCode,
        message: error?.message,
      });
    } else if (responseStatus) {
      console.error("[WAPI] WAPI API returned an error response", {
        recipient: recipientForLogs,
        status: responseStatus,
        responseData,
        message: error?.message,
      });
    } else {
      console.error("[WAPI] Unexpected exception while sending WhatsApp message", {
        recipient: recipientForLogs,
        message: error?.message,
        stack: error?.stack,
      });
    }

    console.error("[WAPI] Failed to send WhatsApp message");
    console.error("[WAPI] WhatsApp reminder flow failed");
    throw error;
  }
};
