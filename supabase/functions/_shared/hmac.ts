// Shared HMAC helper for signing/verifying unsubscribe links.
// Requires the UNSUBSCRIBE_SECRET environment variable to be set on the project
// (Supabase Dashboard → Edge Functions → Secrets, or `supabase secrets set`).

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signUid(uid: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(uid)
  );
  return toHex(signature);
}

export async function verifyUidSignature(
  uid: string,
  sig: string,
  secret: string
): Promise<boolean> {
  const expected = await signUid(uid, secret);
  if (expected.length !== sig.length) return false;
  // Constant-time comparison to avoid timing side-channels.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return mismatch === 0;
}
