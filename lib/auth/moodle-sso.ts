import crypto from "node:crypto";

function requireServerEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getMoodleSsoEntryUrl(): string {
  return requireServerEnv(process.env.MOODLE_SSO_ENTRY_URL, "MOODLE_SSO_ENTRY_URL");
}

export function verifyMoodleSsoSignature(input: {
  email: string;
  moodleUserId: string;
  timestamp: number;
  nextPath: string;
  isSchoolAdmin: boolean;
  managedSchoolIdsCsv: string;
  signature: string;
}): boolean {
  const secret = requireServerEnv(
    process.env.MOODLE_SSO_SHARED_SECRET,
    "MOODLE_SSO_SHARED_SECRET",
  ).trim();
  const nextPath = decodeURIComponent(input.nextPath);
  const normalizedEmail = input.email.toLowerCase().trim();
  const normalizedUserId = input.moodleUserId.trim();

  // Accept both the new payload format (with school-admin claims) and
  // the legacy format to keep SSO working during staggered deployments.
  const payloadCandidates = [
    `${normalizedEmail}|${normalizedUserId}|${input.timestamp}|${nextPath}|${input.isSchoolAdmin ? 1 : 0}|${input.managedSchoolIdsCsv}`,
    `${normalizedEmail}|${normalizedUserId}|${input.timestamp}|${nextPath}`,
  ];

  const sigA = Buffer.from(input.signature, "hex");

  return payloadCandidates.some((candidate) => {
    const expected = crypto.createHmac("sha256", secret).update(candidate).digest("hex");
    const sigB = Buffer.from(expected, "hex");
    if (sigA.length !== sigB.length) return false;
    return crypto.timingSafeEqual(sigA, sigB);
  });
}

export function sanitizeNextPath(value: string | null): string {
  if (!value) return "/tutors/new";
  if (!value.startsWith("/") || value.startsWith("//")) return "/tutors/new";
  return value;
}

export function isTimestampValid(timestamp: number): boolean {
  const ttlSeconds = Number(process.env.MOODLE_SSO_TOKEN_EXPIRY_SECONDS ?? "300");
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  if (timestamp > now + 60) return false;
  return now - timestamp <= ttlSeconds;
}
