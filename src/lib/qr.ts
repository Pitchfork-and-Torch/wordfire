/**
 * Client-side QR for room invite URLs (never sent to a third-party QR API).
 */
import QRCode from "qrcode";

export async function qrDataUrl(
  text: string,
  opts?: { width?: number; margin?: number },
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts?.width ?? 220,
    margin: opts?.margin ?? 2,
    color: {
      dark: "#1a0f0a",
      light: "#f5f0eb",
    },
    errorCorrectionLevel: "M",
  });
}
