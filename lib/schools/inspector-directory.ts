import crypto from "node:crypto";

export type InspectorSchoolPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type InspectorGradeFigures = {
  label: string;
  learners: string;
  courses: string;
  completion: string;
  grade: string;
  competencies: string;
  badges: string;
};

export type InspectorSchoolFigures = {
  learners: string;
  courses: string;
  completion: string;
  grade: string;
  competencies: string;
  badges: string;
  grades: InspectorGradeFigures[];
};

export type InspectorDirectoryAccess = "ready" | "not_inspector" | "unavailable";

const PATH = "/local/wpsso/inspector_schools.php";
const GRADE_PATH = "/local/wpsso/inspector_school_grade.php";

function rawurlencode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${rawurlencode(key)}=${rawurlencode(value)}`)
    .join("&");
}

function moodleOrigin(): string | null {
  const entry = process.env.MOODLE_SSO_ENTRY_URL?.trim();
  if (!entry) {
    return null;
  }
  try {
    return new URL(entry).origin;
  } catch {
    return null;
  }
}

function signRequest(path: string, query: string): { timestamp: string; signature: string } | null {
  const secret = process.env.MOODLE_MARKETPLACE_API_SECRET?.trim();
  if (!secret) {
    return null;
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = `${timestamp}|GET|${path}|${query}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return { timestamp, signature };
}

async function moodleGet(path: string, params: Record<string, string>): Promise<Response | null> {
  const origin = moodleOrigin();
  const query = canonicalQuery(params);
  const signed = signRequest(path, query);
  if (!origin || !signed) {
    return null;
  }
  const url = `${origin}${path}${query ? `?${query}` : ""}`;
  return fetch(url, {
    headers: {
      "X-DBM-Timestamp": signed.timestamp,
      "X-DBM-Signature": signed.signature,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
}

function finiteCoordinate(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }
  return number;
}

function schoolId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const id = value.trim().toUpperCase();
  return /^[A-Z0-9_-]+$/.test(id) ? id : null;
}

function pinFromRecord(value: unknown): InspectorSchoolPin | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = schoolId(record.id);
  const latitude = finiteCoordinate(record.lat, -90, 90);
  const longitude = finiteCoordinate(record.lng, -180, 180);
  if (!id || latitude === null || longitude === null) {
    return null;
  }
  const name = typeof record.name === "string" ? record.name.replace(/\s+/g, " ").trim() : "";
  return { id, name: name || id, latitude, longitude };
}

function figureText(value: unknown): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text || "—";
}

function gradeFromRecord(value: unknown): InspectorGradeFigures | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.replace(/\s+/g, " ").trim() : "";
  if (!label) {
    return null;
  }
  return {
    label,
    learners: figureText(record.learners),
    courses: figureText(record.courses),
    completion: figureText(record.completion),
    grade: figureText(record.grade),
    competencies: figureText(record.competencies),
    badges: figureText(record.badges),
  };
}

export function figuresFromRecord(value: unknown): InspectorSchoolFigures | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const grades = Array.isArray(record.grades)
    ? record.grades.flatMap((item) => {
        const grade = gradeFromRecord(item);
        return grade ? [grade] : [];
      })
    : [];
  return {
    learners: figureText(record.learners),
    courses: figureText(record.courses),
    completion: figureText(record.completion),
    grade: figureText(record.grade),
    competencies: figureText(record.competencies),
    badges: figureText(record.badges),
    grades,
  };
}

export async function fetchInspectorSchools(moodleUserId: string): Promise<{
  access: InspectorDirectoryAccess;
  schools: InspectorSchoolPin[];
}> {
  if (!/^\d+$/.test(moodleUserId)) {
    return { access: "unavailable", schools: [] };
  }
  let response: Response | null;
  try {
    response = await moodleGet(PATH, { v: "1", moodle_user_id: moodleUserId });
  } catch (error) {
    console.error("Find a school list failed", error);
    return { access: "unavailable", schools: [] };
  }
  if (!response) {
    console.error("Find a school list is not configured");
    return { access: "unavailable", schools: [] };
  }
  if (response.status === 403) {
    return { access: "not_inspector", schools: [] };
  }
  if (!response.ok) {
    return { access: "unavailable", schools: [] };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { access: "unavailable", schools: [] };
  }
  const schools = (body as { schools?: unknown }).schools;
  if (!Array.isArray(schools)) {
    return { access: "unavailable", schools: [] };
  }
  const pins: InspectorSchoolPin[] = [];
  const seen = new Set<string>();
  for (const item of schools) {
    const pin = pinFromRecord(item);
    if (!pin || seen.has(pin.id)) {
      continue;
    }
    seen.add(pin.id);
    pins.push(pin);
  }
  return { access: "ready", schools: pins };
}

export async function fetchInspectorSchoolFigures(
  moodleUserId: string,
  schoolIdValue: string,
): Promise<{ status: number; figures: InspectorSchoolFigures | null }> {
  const id = schoolId(schoolIdValue);
  if (!/^\d+$/.test(moodleUserId) || !id) {
    return { status: 404, figures: null };
  }
  let response: Response | null;
  try {
    response = await moodleGet(PATH, { v: "1", moodle_user_id: moodleUserId, school: id });
  } catch (error) {
    console.error("Find a school figures failed", error);
    return { status: 503, figures: null };
  }
  if (!response) {
    return { status: 503, figures: null };
  }
  if (!response.ok) {
    return { status: response.status, figures: null };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 503, figures: null };
  }
  const figures = figuresFromRecord((body as { school?: unknown }).school);
  if (!figures) {
    return { status: 503, figures: null };
  }
  return { status: 200, figures };
}

export type InspectorHeatCell = { band: number; label: string };
export type InspectorHeatRow = { label: string; cells: InspectorHeatCell[] };
export type InspectorSegment = {
  state: string;
  label: string;
  count: string;
  dash: number;
  gap: number;
  offset: number;
};
export type InspectorProblem = { level: number; state: string; status: string };

export type InspectorLearnerDetail = {
  linked: boolean;
  unlinkedText: string;
  close: string;
  masteryTitle: string;
  hasHeatmap: boolean;
  heatLevels: number[];
  heatRows: InspectorHeatRow[];
  heatEmpty: string;
  confidenceTitle: string;
  hasConfidence: boolean;
  confidence: string;
  confidenceArc: number;
  confidenceCaption: string;
  confidenceEmpty: string;
  streakTitle: string;
  activeStreak: string;
  activeLabel: string;
  bestStreak: string;
  bestLabel: string;
  solvingTitle: string;
  hasProblems: boolean;
  problems: InspectorProblem[];
  problemEmpty: string;
  strategyTitle: string;
  hasStrategy: boolean;
  strategy: string;
  strategyCaption: string;
  strategyEmpty: string;
  resilienceTitle: string;
  hasResilience: boolean;
  resilience: string;
  resilienceArc: number;
  resilienceEmpty: string;
};

export type InspectorLearnerRow = {
  learnerKey: string;
  initials: string;
  level: string;
  hasAccuracy: boolean;
  accuracy: string;
  barWidth: number;
  tone: string;
  detail: InspectorLearnerDetail;
};

export type InspectorGradeProfile = {
  grade: number;
  label: string;
  hasLearners: boolean;
  progressTitle: string;
  accuracyHeading: string;
  progress: InspectorLearnerRow[];
  heatTitle: string;
  hasHeatmap: boolean;
  heatLevels: number[];
  heatRows: InspectorHeatRow[];
  heatEmpty: string;
  assignmentsTitle: string;
  hasAssignments: boolean;
  assignmentsCompleted: string;
  assignmentsOverdue: string;
  assignmentsTotal: string;
  assignmentsCompletedLabel: string;
  assignmentsOverdueLabel: string;
  assignmentsTotalLabel: string;
  assignmentsEmpty: string;
  challengeTitle: string;
  hasChallenge: boolean;
  completionRate: string;
  completionLabel: string;
  segments: InspectorSegment[];
  spotlightTitle: string;
  hasSpotlight: boolean;
  spotlight: { learnerKey: string; initials: string; streakText: string; roundsText: string } | null;
};

const FORBIDDEN_KEYS = new Set([
  "name",
  "fullname",
  "firstname",
  "lastname",
  "userid",
  "userId",
  "profileurl",
  "profileUrl",
  "picture",
  "email",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function initials(value: unknown): string | null {
  const label = text(value);
  if (!/^[A-Za-z0-9?]{1,3}$/.test(label)) {
    return null;
  }
  return label.toUpperCase();
}

function learnerKey(value: unknown): string | null {
  const key = text(value);
  return /^[a-f0-9]{16,64}$/.test(key) ? key : null;
}

function containsIdentity(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.keys(value as object).some((key) => FORBIDDEN_KEYS.has(key));
}

function heatRows(value: unknown): InspectorHeatRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((row) => {
    if (!row || typeof row !== "object" || containsIdentity(row)) {
      return [];
    }
    const record = row as Record<string, unknown>;
    const cells = Array.isArray(record.cells)
      ? record.cells.flatMap((cell) => {
          if (!cell || typeof cell !== "object") {
            return [];
          }
          const item = cell as Record<string, unknown>;
          const band = Number(item.band);
          return Number.isInteger(band) && band >= 0 && band <= 5
            ? [{ band, label: text(item.label) }]
            : [];
        })
      : [];
    return [{ label: text(record.label), cells }];
  });
}

function detailFromRecord(value: unknown): InspectorLearnerDetail | null {
  if (!value || typeof value !== "object" || containsIdentity(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const problems = Array.isArray(record.problems)
    ? record.problems.flatMap((problem) => {
        if (!problem || typeof problem !== "object") {
          return [];
        }
        const item = problem as Record<string, unknown>;
        const level = Number(item.level);
        return Number.isInteger(level)
          ? [{ level, state: text(item.state), status: text(item.status) }]
          : [];
      })
    : [];
  return {
    linked: Boolean(record.linked),
    unlinkedText: text(record.unlinkedText),
    close: text(record.close) || "Close",
    masteryTitle: text(record.masteryTitle) || "Mastery",
    hasHeatmap: Boolean(record.hasHeatmap),
    heatLevels: [1, 2, 3, 4, 5, 6],
    heatRows: heatRows(record.heatRows),
    heatEmpty: text(record.heatEmpty),
    confidenceTitle: text(record.confidenceTitle) || "Confidence",
    hasConfidence: Boolean(record.hasConfidence),
    confidence: text(record.confidence),
    confidenceArc: Number(record.confidenceArc) || 0,
    confidenceCaption: text(record.confidenceCaption),
    confidenceEmpty: text(record.confidenceEmpty),
    streakTitle: text(record.streakTitle) || "Streaks",
    activeStreak: text(record.activeStreak) || "0",
    activeLabel: text(record.activeLabel),
    bestStreak: text(record.bestStreak) || "0",
    bestLabel: text(record.bestLabel),
    solvingTitle: text(record.solvingTitle) || "Problem solving",
    hasProblems: problems.length > 0,
    problems,
    problemEmpty: text(record.problemEmpty),
    strategyTitle: text(record.strategyTitle) || "Strategy",
    hasStrategy: Boolean(record.hasStrategy),
    strategy: text(record.strategy),
    strategyCaption: text(record.strategyCaption),
    strategyEmpty: text(record.strategyEmpty),
    resilienceTitle: text(record.resilienceTitle) || "Resilience",
    hasResilience: Boolean(record.hasResilience),
    resilience: text(record.resilience),
    resilienceArc: Number(record.resilienceArc) || 0,
    resilienceEmpty: text(record.resilienceEmpty),
  };
}

export function gradeProfileFromRecord(value: unknown): InspectorGradeProfile | null {
  if (!value || typeof value !== "object" || containsIdentity(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const grade = Number(record.grade);
  if (!Number.isInteger(grade) || grade < 0 || grade > 19) {
    return null;
  }
  const progress = Array.isArray(record.progress)
    ? record.progress.flatMap((row) => {
        if (!row || typeof row !== "object" || containsIdentity(row)) {
          return [];
        }
        const item = row as Record<string, unknown>;
        const key = learnerKey(item.learnerKey);
        const letters = initials(item.initials);
        const detail = detailFromRecord(item.detail);
        if (!key || !letters || !detail) {
          return [];
        }
        return [
          {
            learnerKey: key,
            initials: letters,
            level: text(item.level),
            hasAccuracy: Boolean(item.hasAccuracy),
            accuracy: text(item.accuracy),
            barWidth: Math.min(100, Math.max(0, Number(item.barWidth) || 0)),
            tone: text(item.tone) || "pink",
            detail,
          },
        ];
      })
    : [];
  const spotRecord =
    record.spotlight && typeof record.spotlight === "object" && !containsIdentity(record.spotlight)
      ? (record.spotlight as Record<string, unknown>)
      : null;
  const spotKey = spotRecord ? learnerKey(spotRecord.learnerKey) : null;
  const spotInitials = spotRecord ? initials(spotRecord.initials) : null;
  const segments = Array.isArray(record.segments)
    ? record.segments.flatMap((segment) => {
        if (!segment || typeof segment !== "object") {
          return [];
        }
        const item = segment as Record<string, unknown>;
        return [
          {
            state: text(item.state),
            label: text(item.label),
            count: text(item.count) || "0",
            dash: Number(item.dash) || 0,
            gap: Number(item.gap) || 0,
            offset: Number(item.offset) || 0,
          },
        ];
      })
    : [];
  return {
    grade,
    label: text(record.label) || `Grade ${grade}`,
    hasLearners: progress.length > 0,
    progressTitle: text(record.progressTitle) || "Learner progress",
    accuracyHeading: text(record.accuracyHeading) || "Accuracy",
    progress,
    heatTitle: text(record.heatTitle) || "Class mastery",
    hasHeatmap: Boolean(record.hasHeatmap),
    heatLevels: [1, 2, 3, 4, 5, 6],
    heatRows: heatRows(record.heatRows),
    heatEmpty: text(record.heatEmpty),
    assignmentsTitle: text(record.assignmentsTitle) || "Assignments",
    hasAssignments: Boolean(record.hasAssignments),
    assignmentsCompleted: text(record.assignmentsCompleted) || "0",
    assignmentsOverdue: text(record.assignmentsOverdue) || "0",
    assignmentsTotal: text(record.assignmentsTotal) || "0",
    assignmentsCompletedLabel: text(record.assignmentsCompletedLabel),
    assignmentsOverdueLabel: text(record.assignmentsOverdueLabel),
    assignmentsTotalLabel: text(record.assignmentsTotalLabel),
    assignmentsEmpty: text(record.assignmentsEmpty) || "Nothing to show yet.",
    challengeTitle: text(record.challengeTitle) || "Problem solving",
    hasChallenge: Boolean(record.hasChallenge),
    completionRate: text(record.completionRate),
    completionLabel: text(record.completionLabel),
    segments,
    spotlightTitle: text(record.spotlightTitle) || "Learner spotlight",
    hasSpotlight: Boolean(spotKey && spotInitials),
    spotlight:
      spotKey && spotInitials
        ? {
            learnerKey: spotKey,
            initials: spotInitials,
            streakText: text(spotRecord?.streakText),
            roundsText: text(spotRecord?.roundsText),
          }
        : null,
  };
}

export async function fetchInspectorGradeProfile(
  moodleUserId: string,
  schoolIdValue: string,
  grade: number,
): Promise<{ status: number; profile: InspectorGradeProfile | null }> {
  const id = schoolId(schoolIdValue);
  if (!/^\d+$/.test(moodleUserId) || !id || !Number.isInteger(grade) || grade < 0 || grade > 19) {
    return { status: 404, profile: null };
  }
  let response: Response | null;
  try {
    response = await moodleGet(GRADE_PATH, {
      v: "1",
      moodle_user_id: moodleUserId,
      school: id,
      grade: String(grade),
    });
  } catch (error) {
    console.error("Find a school grade profile failed", error);
    return { status: 503, profile: null };
  }
  if (!response) {
    return { status: 503, profile: null };
  }
  if (!response.ok) {
    return { status: response.status, profile: null };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 503, profile: null };
  }
  const profile = gradeProfileFromRecord((body as { profile?: unknown }).profile);
  if (!profile) {
    return { status: 503, profile: null };
  }
  return { status: 200, profile };
}
