import crypto from "node:crypto";
import { cookies } from "next/headers";
import { MARKETPLACE_VIEW_ROLE_COOKIE } from "./view-role";

const SESSION_COOKIE_NAME = "marketplace_session";

function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === "production";
}

type MarketplaceSessionPayload = {
  sub: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  moodlePhotoUrl: string | null;
  isSchoolAdmin: boolean;
  managedSchoolIds: string[];
  moodleUserId: string;
  exp: number;
};

function requireServerEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function base64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  const secret = requireServerEnv(
    process.env.MARKETPLACE_SESSION_SECRET,
    "MARKETPLACE_SESSION_SECRET",
  );
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function deterministicUuidFromMoodleId(moodleUserId: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`moodle-user:${moodleUserId}`)
    .digest("hex")
    .slice(0, 32);

  const chars = hash.split("");
  chars[12] = "4";
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");

  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

export async function setMarketplaceSession(input: {
  email: string;
  moodleUserId: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  moodlePhotoUrl?: string | null;
  isSchoolAdmin?: boolean;
  managedSchoolIds?: string[];
  maxAgeSeconds?: number;
}) {
  const maxAgeSeconds = input.maxAgeSeconds ?? 60 * 60 * 8;
  const payload: MarketplaceSessionPayload = {
    sub: deterministicUuidFromMoodleId(input.moodleUserId),
    email: input.email.toLowerCase().trim(),
    name: input.name?.trim() || null,
    firstName: input.firstName?.trim() || null,
    lastName: input.lastName?.trim() || null,
    moodlePhotoUrl: input.moodlePhotoUrl?.trim() || null,
    isSchoolAdmin: Boolean(input.isSchoolAdmin),
    managedSchoolIds: (input.managedSchoolIds ?? []).map((id) => id.trim()).filter(Boolean),
    moodleUserId: input.moodleUserId.trim(),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };

  const encoded = base64urlEncode(JSON.stringify(payload));
  const signature = sign(encoded);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, `${encoded}.${signature}`, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearMarketplaceSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(MARKETPLACE_VIEW_ROLE_COOKIE);
}

export async function getMarketplaceSession(): Promise<MarketplaceSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const sigA = Buffer.from(signature, "hex");
  const sigB = Buffer.from(expected, "hex");
  if (sigA.length !== sigB.length) return null;
  if (!crypto.timingSafeEqual(sigA, sigB)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(encoded)) as MarketplaceSessionPayload;
    if (!payload?.sub || !payload?.email || !payload?.moodleUserId || !payload?.exp) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      ...payload,
      isSchoolAdmin: Boolean(payload.isSchoolAdmin),
      managedSchoolIds: Array.isArray(payload.managedSchoolIds)
        ? payload.managedSchoolIds.map((value) => String(value))
        : [],
      moodlePhotoUrl: payload.moodlePhotoUrl ?? null,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      name: payload.name ?? null,
    };
  } catch {
    return null;
  }
}
