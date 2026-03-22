#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const LOCALE = "en-US";

const RESERVED_FUNCTIONAL_SLUGS = new Set([
  "api",
  "bookings",
  "role-select",
  "reviews",
  "sign-in",
  "tutors",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

const args = new Set(process.argv.slice(2));
const options = {
  dryRun: args.has("--dry-run"),
  schemaOnly: args.has("--schema-only"),
  seedOnly: args.has("--seed-only"),
};

if (options.schemaOnly && options.seedOnly) {
  console.error("Cannot use --schema-only and --seed-only together.");
  process.exit(1);
}

const rootDir = process.cwd();
loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(rootDir, ".env.local"));

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_CLI_MANAGEMENT_TOKEN;
const ENVIRONMENT_ID = process.env.CONTENTFUL_ENVIRONMENT_ID || "master";

if (!SPACE_ID || !MANAGEMENT_TOKEN) {
  console.error("Missing required Contentful env vars: CONTENTFUL_SPACE_ID and CONTENTFUL_CLI_MANAGEMENT_TOKEN");
  process.exit(1);
}

const MANAGEMENT_BASE = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}`;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (!key || key in process.env) {
      continue;
    }

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function localized(value) {
  return {
    [LOCALE]: value,
  };
}

function entryLink(id) {
  return {
    sys: {
      type: "Link",
      linkType: "Entry",
      id,
    },
  };
}

function richText(paragraphs) {
  return {
    nodeType: "document",
    data: {},
    content: paragraphs
      .filter((paragraph) => typeof paragraph === "string" && paragraph.trim().length > 0)
      .map((paragraph) => ({
        nodeType: "paragraph",
        data: {},
        content: [
          {
            nodeType: "text",
            value: paragraph.trim(),
            marks: [],
            data: {},
          },
        ],
      })),
  };
}

function hasDraftChanges(sys) {
  if (typeof sys.publishedVersion !== "number") {
    return true;
  }

  return typeof sys.version === "number" && sys.version > sys.publishedVersion + 1;
}

function ensureSafeSlug(slug) {
  if (slug === "home") {
    return;
  }

  if (RESERVED_FUNCTIONAL_SLUGS.has(slug)) {
    throw new Error(`Refusing to seed reserved functional slug: ${slug}`);
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Slug must be lowercase letters/numbers/hyphens only: ${slug}`);
  }
}

function mustMapValue(map, key, label) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label} for key: ${key}`);
  }
  return value;
}

async function cmaRequest(method, endpoint, { query, body, version, contentTypeId, allow404 = false } = {}) {
  const url = new URL(`${MANAGEMENT_BASE}${endpoint}`);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = {
    Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
    "Content-Type": "application/vnd.contentful.management.v1+json",
  };

  if (typeof version === "number") {
    headers["X-Contentful-Version"] = String(version);
  }

  if (contentTypeId) {
    headers["X-Contentful-Content-Type"] = contentTypeId;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (allow404 && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`CMA ${method} ${endpoint} failed (${response.status}): ${details}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function maybeMutate(description, mutateFn) {
  if (options.dryRun) {
    log(`[dry-run] ${description}`);
    return null;
  }

  return mutateFn();
}

function cloneContentTypeForWrite(contentType) {
  return {
    name: contentType.name,
    description: contentType.description || "",
    displayField: contentType.displayField,
    fields: contentType.fields || [],
  };
}

function ensureField(contentType, fieldDefinition) {
  const existing = (contentType.fields || []).find((field) => field.id === fieldDefinition.id);
  if (existing) {
    if (existing.type !== fieldDefinition.type) {
      throw new Error(
        `Field ${fieldDefinition.id} on content type ${contentType.sys.id} has type ${existing.type}, expected ${fieldDefinition.type}`
      );
    }
    return false;
  }

  contentType.fields = [...(contentType.fields || []), fieldDefinition];
  return true;
}

async function getContentType(id) {
  return cmaRequest("GET", `/content_types/${id}`, { allow404: true });
}

async function saveContentType(contentType) {
  const payload = cloneContentTypeForWrite(contentType);

  const saved = await maybeMutate(`save content type ${contentType.sys.id}`, () =>
    cmaRequest("PUT", `/content_types/${contentType.sys.id}`, {
      version: contentType.sys.version,
      body: payload,
    })
  );

  return saved || contentType;
}

async function publishContentTypeIfNeeded(contentType) {
  if (!hasDraftChanges(contentType.sys)) {
    return contentType;
  }

  const published = await maybeMutate(`publish content type ${contentType.sys.id}`, () =>
    cmaRequest("PUT", `/content_types/${contentType.sys.id}/published`, {
      version: contentType.sys.version,
    })
  );

  return published || contentType;
}

async function ensurePageSeoFields() {
  const pageType = await getContentType("page");
  if (!pageType) {
    throw new Error("Expected content type 'page' to exist before patching schema.");
  }

  let changed = false;
  changed = ensureField(pageType, {
    id: "metaTitle",
    name: "Meta Title",
    type: "Symbol",
    required: false,
    localized: false,
    validations: [],
    disabled: false,
    omitted: false,
  }) || changed;

  changed = ensureField(pageType, {
    id: "metaDescription",
    name: "Meta Description",
    type: "Text",
    required: false,
    localized: false,
    validations: [],
    disabled: false,
    omitted: false,
  }) || changed;

  changed = ensureField(pageType, {
    id: "metaKeywords",
    name: "Meta Keywords",
    type: "Text",
    required: false,
    localized: false,
    validations: [],
    disabled: false,
    omitted: false,
  }) || changed;

  const maybeSaved = changed ? await saveContentType(pageType) : pageType;
  await publishContentTypeIfNeeded(maybeSaved);
  log(changed ? "Patched page content type with SEO fields." : "Page content type already has SEO fields.");
}

async function ensureSubcomponentLinkReferenceField() {
  const linkType = await getContentType("subcomponentLink");
  if (!linkType) {
    throw new Error("Expected content type 'subcomponentLink' to exist before patching schema.");
  }

  const changed = ensureField(linkType, {
    id: "linkedPage",
    name: "Linked Page",
    type: "Link",
    linkType: "Entry",
    required: false,
    localized: false,
    validations: [
      {
        linkContentType: ["page"],
      },
    ],
    disabled: false,
    omitted: false,
  });

  const maybeSaved = changed ? await saveContentType(linkType) : linkType;
  await publishContentTypeIfNeeded(maybeSaved);
  log(changed ? "Patched subcomponentLink with linkedPage reference." : "subcomponentLink already has linkedPage reference.");
}

async function ensureGlobalSettingsContentType() {
  const existing = await getContentType("globalSettings");

  if (!existing) {
    const created = await maybeMutate("create content type globalSettings", () =>
      cmaRequest("PUT", "/content_types/globalSettings", {
        body: {
          name: "Global Settings",
          description: "Singleton references for shared site header/footer.",
          displayField: "key",
          fields: [
            {
              id: "key",
              name: "Key",
              type: "Symbol",
              required: true,
              localized: false,
              validations: [{ unique: true }],
              disabled: false,
              omitted: false,
            },
            {
              id: "header",
              name: "Header",
              type: "Link",
              linkType: "Entry",
              required: false,
              localized: false,
              validations: [{ linkContentType: ["componentHeader"] }],
              disabled: false,
              omitted: false,
            },
            {
              id: "footer",
              name: "Footer",
              type: "Link",
              linkType: "Entry",
              required: false,
              localized: false,
              validations: [{ linkContentType: ["componentFooter"] }],
              disabled: false,
              omitted: false,
            },
          ],
        },
      })
    );

    if (created) {
      await publishContentTypeIfNeeded(created);
    } else {
      log("[dry-run] publish content type globalSettings");
    }

    log("Created globalSettings content type.");
    return;
  }

  let changed = false;
  changed = ensureField(existing, {
    id: "key",
    name: "Key",
    type: "Symbol",
    required: true,
    localized: false,
    validations: [{ unique: true }],
    disabled: false,
    omitted: false,
  }) || changed;

  changed = ensureField(existing, {
    id: "header",
    name: "Header",
    type: "Link",
    linkType: "Entry",
    required: false,
    localized: false,
    validations: [{ linkContentType: ["componentHeader"] }],
    disabled: false,
    omitted: false,
  }) || changed;

  changed = ensureField(existing, {
    id: "footer",
    name: "Footer",
    type: "Link",
    linkType: "Entry",
    required: false,
    localized: false,
    validations: [{ linkContentType: ["componentFooter"] }],
    disabled: false,
    omitted: false,
  }) || changed;

  const maybeSaved = changed ? await saveContentType(existing) : existing;
  await publishContentTypeIfNeeded(maybeSaved);

  log(changed ? "Patched existing globalSettings content type." : "globalSettings content type already up to date.");
}

async function getEntry(id) {
  return cmaRequest("GET", `/entries/${id}`, { allow404: true });
}

async function publishEntryIfNeeded(entry) {
  if (!hasDraftChanges(entry.sys)) {
    return entry;
  }

  const published = await maybeMutate(`publish entry ${entry.sys.id}`, () =>
    cmaRequest("PUT", `/entries/${entry.sys.id}/published`, {
      version: entry.sys.version,
    })
  );

  return published || entry;
}

async function ensureEntry({ id, contentTypeId, fields }) {
  const current = await getEntry(id);

  if (!current) {
    const created = await maybeMutate(`create entry ${id} (${contentTypeId})`, () =>
      cmaRequest("PUT", `/entries/${id}`, {
        contentTypeId,
        body: { fields },
      })
    );

    if (!created) {
      return {
        sys: {
          id,
          version: 1,
        },
        fields,
      };
    }

    return publishEntryIfNeeded(created);
  }

  const unchanged = JSON.stringify(current.fields) === JSON.stringify(fields);
  if (unchanged) {
    return publishEntryIfNeeded(current);
  }

  const updated = await maybeMutate(`update entry ${id}`, () =>
    cmaRequest("PUT", `/entries/${id}`, {
      version: current.sys.version,
      body: { fields },
    })
  );

  if (!updated) {
    return {
      ...current,
      fields,
    };
  }

  return publishEntryIfNeeded(updated);
}

async function patchSchema() {
  await ensurePageSeoFields();
  await ensureSubcomponentLinkReferenceField();
  await ensureGlobalSettingsContentType();
}

async function seedEntries() {
  const pages = [
    {
      slug: "home",
      title: "Edu Placement Home",
      metaTitle: "Edu Placement | Tutor Marketplace for Schools",
      metaDescription:
        "Find trusted tutors for your schools, manage bookings, and connect learning support with confidence.",
      metaKeywords: "tutor marketplace, school tutoring, education support",
    },
    {
      slug: "about",
      title: "About Edu Placement",
      metaTitle: "About Edu Placement",
      metaDescription: "Learn how Edu Placement connects schools and tutors with a practical, trusted workflow.",
      metaKeywords: "about edu placement, tutor marketplace mission",
    },
    {
      slug: "how-it-works",
      title: "How It Works",
      metaTitle: "How Edu Placement Works",
      metaDescription: "A clear view of how schools discover tutors and move from match to confirmed bookings.",
      metaKeywords: "how it works, tutor booking workflow",
    },
    {
      slug: "for-schools",
      title: "For Schools",
      metaTitle: "For Schools | Edu Placement",
      metaDescription: "Tools for school admins to search tutors, compare fit, and manage booking requests.",
      metaKeywords: "for schools, school admin tutor tools",
    },
    {
      slug: "for-tutors",
      title: "For Tutors",
      metaTitle: "For Tutors | Edu Placement",
      metaDescription: "Create your tutor profile, set availability, and respond to requests from local schools.",
      metaKeywords: "for tutors, tutor profile, tutor bookings",
    },
    {
      slug: "contact",
      title: "Contact",
      metaTitle: "Contact Edu Placement",
      metaDescription: "Get in touch with the Edu Placement team.",
      metaKeywords: "contact edu placement",
    },
    {
      slug: "faq",
      title: "Frequently Asked Questions",
      metaTitle: "FAQ | Edu Placement",
      metaDescription: "Answers to common questions from schools and tutors using Edu Placement.",
      metaKeywords: "faq, tutor marketplace help",
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      metaTitle: "Privacy Policy | Edu Placement",
      metaDescription: "How Edu Placement handles personal data and platform privacy.",
      metaKeywords: "privacy policy",
    },
    {
      slug: "terms",
      title: "Terms of Use",
      metaTitle: "Terms | Edu Placement",
      metaDescription: "Terms governing usage of the Edu Placement marketplace.",
      metaKeywords: "terms of use",
    },
  ];

  const pageIdBySlug = new Map(
    pages.map((page) => [
      page.slug,
      `tm-page-${page.slug.replace(/[^a-z0-9-]/g, "-")}`,
    ])
  );

  for (const page of pages) {
    ensureSafeSlug(page.slug);
  }

  // 1) Seed page stubs first so linkedPage references always resolve.
  for (const page of pages) {
    const pageEntryId = mustMapValue(pageIdBySlug, page.slug, "page entry id");
    await ensureEntry({
      id: pageEntryId,
      contentTypeId: "page",
      fields: {
        title: localized(page.title),
        slug: localized(page.slug),
        metaTitle: localized(page.metaTitle),
        metaDescription: localized(page.metaDescription),
        metaKeywords: localized(page.metaKeywords),
        components: localized([]),
      },
    });
  }

  const internalLinks = [
    { id: "tm-link-home", label: "Home", slug: "home" },
    { id: "tm-link-about", label: "About", slug: "about" },
    { id: "tm-link-how-it-works", label: "How It Works", slug: "how-it-works" },
    { id: "tm-link-for-schools", label: "For Schools", slug: "for-schools" },
    { id: "tm-link-for-tutors", label: "For Tutors", slug: "for-tutors" },
    { id: "tm-link-contact", label: "Contact", slug: "contact" },
    { id: "tm-link-faq", label: "FAQ", slug: "faq" },
    { id: "tm-link-privacy", label: "Privacy Policy", slug: "privacy-policy" },
    { id: "tm-link-terms", label: "Terms", slug: "terms" },
  ];

  for (const link of internalLinks) {
    const pageId = mustMapValue(pageIdBySlug, link.slug, "linked page entry id");
    await ensureEntry({
      id: link.id,
      contentTypeId: "subcomponentLink",
      fields: {
        label: localized(link.label),
        url: localized(link.slug === "home" ? "/" : `/${link.slug}`),
        linkedPage: localized(entryLink(pageId)),
        externalLink: localized(false),
        hideLabel: localized(false),
        customClass: localized(""),
      },
    });
  }

  await ensureEntry({
    id: "tm-link-browse-tutors",
    contentTypeId: "subcomponentLink",
    fields: {
      label: localized("Browse Tutors"),
      url: localized("/tutors"),
      externalLink: localized(false),
      hideLabel: localized(false),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-link-sign-in",
    contentTypeId: "subcomponentLink",
    fields: {
      label: localized("Sign In"),
      url: localized("/sign-in"),
      externalLink: localized(false),
      hideLabel: localized(false),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-link-support-email",
    contentTypeId: "subcomponentLink",
    fields: {
      label: localized("Email Support"),
      url: localized("mailto:support@eduplacement.example"),
      externalLink: localized(true),
      hideLabel: localized(false),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-menu-main",
    contentTypeId: "componentMenu",
    fields: {
      title: localized("Main Navigation"),
      hideTitle: localized(true),
      links: localized([
        entryLink("tm-link-home"),
        entryLink("tm-link-about"),
        entryLink("tm-link-how-it-works"),
        entryLink("tm-link-for-schools"),
        entryLink("tm-link-for-tutors"),
        entryLink("tm-link-faq"),
        entryLink("tm-link-contact"),
      ]),
    },
  });

  await ensureEntry({
    id: "tm-menu-footer-company",
    contentTypeId: "componentMenu",
    fields: {
      title: localized("Company"),
      hideTitle: localized(false),
      links: localized([
        entryLink("tm-link-about"),
        entryLink("tm-link-how-it-works"),
        entryLink("tm-link-contact"),
      ]),
    },
  });

  await ensureEntry({
    id: "tm-menu-footer-legal",
    contentTypeId: "componentMenu",
    fields: {
      title: localized("Legal"),
      hideTitle: localized(false),
      links: localized([
        entryLink("tm-link-privacy"),
        entryLink("tm-link-terms"),
      ]),
    },
  });

  await ensureEntry({
    id: "tm-header-main",
    contentTypeId: "componentHeader",
    fields: {
      title: localized("Edu Placement"),
      menu: localized(entryLink("tm-menu-main")),
      displaySearch: localized(false),
      displayRegions: localized(false),
    },
  });

  await ensureEntry({
    id: "tm-footer-main",
    contentTypeId: "componentFooter",
    fields: {
      title: localized("Edu Placement"),
      copy: localized(
        richText([
          "Edu Placement helps schools and tutors connect through trusted, practical workflows.",
          "Use brochure pages for platform information and the marketplace area for active matching and bookings.",
        ])
      ),
      footerMenus: localized([
        entryLink("tm-menu-footer-company"),
        entryLink("tm-menu-footer-legal"),
      ]),
      subfooterCopy: localized(`© ${new Date().getFullYear()} Edu Placement. All rights reserved.`),
    },
  });

  await ensureEntry({
    id: "tm-card-home-trust",
    contentTypeId: "subcomponentCard",
    fields: {
      title: localized("Trusted Profiles"),
      copy: localized(
        richText([
          "Review tutor profiles with experience, subjects, and availability in one place.",
        ])
      ),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-card-home-fit",
    contentTypeId: "subcomponentCard",
    fields: {
      title: localized("Local Matching"),
      copy: localized(
        richText([
          "Search tutors by location so schools can find support close to their campuses.",
        ])
      ),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-card-home-bookings",
    contentTypeId: "subcomponentCard",
    fields: {
      title: localized("Structured Bookings"),
      copy: localized(
        richText([
          "Move from shortlist to booking requests and ongoing booking communication.",
        ])
      ),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-home-hero",
    contentTypeId: "componentHeroBanner",
    fields: {
      title: localized("Find the right tutor support for every learner"),
      copy: localized(
        richText([
          "Edu Placement connects schools and tutors through clear profile matching, practical booking workflows, and local context.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-home-body",
    contentTypeId: "componentBodyCopy",
    fields: {
      title: localized("Designed for everyday school operations"),
      copy: localized(
        richText([
          "The platform keeps discovery, communication, and booking state in one place.",
          "Schools can browse and request confidently while tutors maintain accurate profiles and availability.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-home-card-grid",
    contentTypeId: "componentCardGrid",
    fields: {
      title: localized("Why teams use Edu Placement"),
      copy: localized("Built to reduce admin friction while improving tutor visibility."),
      cards: localized([
        entryLink("tm-card-home-trust"),
        entryLink("tm-card-home-fit"),
        entryLink("tm-card-home-bookings"),
      ]),
      cardsDesktop: localized("3"),
      cardsTablet: localized("2"),
      cardsMobile: localized("1"),
    },
  });

  await ensureEntry({
    id: "tm-home-cta",
    contentTypeId: "componentTitleBodyCta",
    fields: {
      title: localized("Explore by audience"),
      copy: localized(
        richText([
          "Start with the page that matches your role, then move into the marketplace tools when you are ready.",
        ])
      ),
      ctaBlock: localized([
        entryLink("tm-link-for-schools"),
        entryLink("tm-link-for-tutors"),
        entryLink("tm-link-browse-tutors"),
      ]),
    },
  });

  await ensureEntry({
    id: "tm-about-hero",
    contentTypeId: "componentHeroBanner",
    fields: {
      title: localized("About Edu Placement"),
      copy: localized(
        richText([
          "We help schools source tutoring support and help tutors connect with schools that need their expertise.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-about-body",
    contentTypeId: "componentBodyCopy",
    fields: {
      title: localized("Our approach"),
      copy: localized(
        richText([
          "Edu Placement focuses on practical workflows over complexity.",
          "Profiles, matching, and booking communications stay aligned so schools and tutors can move quickly with confidence.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-hiw-step-1",
    contentTypeId: "subcomponentListItem",
    fields: {
      title: localized("1. Discover"),
      copy: localized(richText(["School admins search tutors by subject, level, and distance."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-hiw-step-2",
    contentTypeId: "subcomponentListItem",
    fields: {
      title: localized("2. Request"),
      copy: localized(richText(["Create booking requests and share session requirements clearly."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-hiw-step-3",
    contentTypeId: "subcomponentListItem",
    fields: {
      title: localized("3. Manage"),
      copy: localized(richText(["Track status updates, communication, and outcomes in one workflow."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-hiw-hero",
    contentTypeId: "componentHeroBanner",
    fields: {
      title: localized("How Edu Placement works"),
      copy: localized(
        richText([
          "A simple sequence from tutor discovery to managed bookings.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-hiw-list",
    contentTypeId: "componentListBlock",
    fields: {
      title: localized("Workflow overview"),
      copy: localized("Three practical steps keep the process moving."),
      listItems: localized([
        entryLink("tm-hiw-step-1"),
        entryLink("tm-hiw-step-2"),
        entryLink("tm-hiw-step-3"),
      ]),
    },
  });

  await ensureEntry({
    id: "tm-hiw-cta",
    contentTypeId: "componentTitleBodyCta",
    fields: {
      title: localized("Start where you are"),
      copy: localized(
        richText([
          "Schools and tutors each have dedicated pages to orient quickly.",
        ])
      ),
      ctaBlock: localized([
        entryLink("tm-link-for-schools"),
        entryLink("tm-link-for-tutors"),
      ]),
    },
  });

  await ensureEntry({
    id: "tm-schools-hero",
    contentTypeId: "componentHeroBanner",
    fields: {
      title: localized("For schools"),
      copy: localized(
        richText([
          "Find and request tutors with the context your teams need for confident decisions.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-schools-card-a",
    contentTypeId: "subcomponentCard",
    fields: {
      title: localized("Search with location context"),
      copy: localized(richText(["Limit results by radius to focus on practical options."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-schools-card-b",
    contentTypeId: "subcomponentCard",
    fields: {
      title: localized("Request from within the profile flow"),
      copy: localized(richText(["Create requests without leaving the tutor discovery experience."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-schools-card-c",
    contentTypeId: "subcomponentCard",
    fields: {
      title: localized("Track booking state"),
      copy: localized(richText(["Monitor booking progress and communication clearly." ])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-schools-grid",
    contentTypeId: "componentCardGrid",
    fields: {
      title: localized("School admin capabilities"),
      copy: localized("Built for teams managing multiple tutoring needs."),
      cards: localized([
        entryLink("tm-schools-card-a"),
        entryLink("tm-schools-card-b"),
        entryLink("tm-schools-card-c"),
      ]),
      cardsDesktop: localized("3"),
      cardsTablet: localized("2"),
      cardsMobile: localized("1"),
    },
  });

  await ensureEntry({
    id: "tm-schools-cta",
    contentTypeId: "componentTitleBodyCta",
    fields: {
      title: localized("Ready to review tutors?"),
      copy: localized(richText(["Browse current tutor listings to begin." ])),
      ctaBlock: localized([entryLink("tm-link-browse-tutors")]),
    },
  });

  await ensureEntry({
    id: "tm-tutors-hero",
    contentTypeId: "componentHeroBanner",
    fields: {
      title: localized("For tutors"),
      copy: localized(
        richText([
          "Show your experience, set your availability, and respond to real school requests.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-tutors-body",
    contentTypeId: "componentBodyCopy",
    fields: {
      title: localized("Build a profile that gets selected"),
      copy: localized(
        richText([
          "Keep subject coverage, levels, and rates accurate so schools can evaluate fit quickly.",
          "Update availability regularly to improve booking momentum.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-tutors-cta",
    contentTypeId: "componentTitleBodyCta",
    fields: {
      title: localized("Access tutor tools"),
      copy: localized(richText(["Sign in and choose the Tutor role to manage your profile and requests."])),
      ctaBlock: localized([entryLink("tm-link-sign-in")]),
    },
  });

  await ensureEntry({
    id: "tm-contact-hero",
    contentTypeId: "componentHeroBanner",
    fields: {
      title: localized("Contact us"),
      copy: localized(richText(["Need help with setup or workflow questions? Reach our team directly."])),
    },
  });

  await ensureEntry({
    id: "tm-contact-body",
    contentTypeId: "componentBodyCopy",
    fields: {
      title: localized("Support"),
      copy: localized(
        richText([
          "We support schools and tutors with onboarding and operational guidance.",
          "Use the support channel below and include enough detail for a faster response.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-contact-cta",
    contentTypeId: "componentTitleBodyCta",
    fields: {
      title: localized("Get in touch"),
      copy: localized(richText(["Email our support team."])),
      ctaBlock: localized([entryLink("tm-link-support-email")]),
    },
  });

  await ensureEntry({
    id: "tm-faq-item-1",
    contentTypeId: "subcomponentListItem",
    fields: {
      title: localized("Who can create bookings?"),
      copy: localized(richText(["School admins can create bookings once signed in with school admin access."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-faq-item-2",
    contentTypeId: "subcomponentListItem",
    fields: {
      title: localized("How do tutors become discoverable?"),
      copy: localized(richText(["Tutors complete profile details and maintain availability to appear in searches."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-faq-item-3",
    contentTypeId: "subcomponentListItem",
    fields: {
      title: localized("Can role access change per user?"),
      copy: localized(richText(["Yes. Access depends on account claims and selected active role."])),
      customClass: localized(""),
    },
  });

  await ensureEntry({
    id: "tm-faq-hero",
    contentTypeId: "componentHeroBanner",
    fields: {
      title: localized("Frequently asked questions"),
      copy: localized(richText(["Quick answers for schools and tutors." ])),
    },
  });

  await ensureEntry({
    id: "tm-faq-list",
    contentTypeId: "componentListBlock",
    fields: {
      title: localized("Common questions"),
      copy: localized("If you need more detail, contact support."),
      listItems: localized([
        entryLink("tm-faq-item-1"),
        entryLink("tm-faq-item-2"),
        entryLink("tm-faq-item-3"),
      ]),
    },
  });

  await ensureEntry({
    id: "tm-privacy-body",
    contentTypeId: "componentBodyCopy",
    fields: {
      title: localized("Privacy policy"),
      copy: localized(
        richText([
          "Edu Placement collects only the data required to operate matching, booking, and account workflows.",
          "Platform operators and authorized users access data according to role-based permissions.",
          "Contact support for privacy requests and data handling questions.",
        ])
      ),
    },
  });

  await ensureEntry({
    id: "tm-terms-body",
    contentTypeId: "componentBodyCopy",
    fields: {
      title: localized("Terms of use"),
      copy: localized(
        richText([
          "Use of Edu Placement is subject to platform terms, role-based responsibilities, and school policy alignment.",
          "Users are responsible for maintaining accurate account and profile information.",
          "Misuse of workflow features may result in access restrictions.",
        ])
      ),
    },
  });

  const pageComponentsBySlug = {
    home: ["tm-home-hero", "tm-home-body", "tm-home-card-grid", "tm-home-cta"],
    about: ["tm-about-hero", "tm-about-body"],
    "how-it-works": ["tm-hiw-hero", "tm-hiw-list", "tm-hiw-cta"],
    "for-schools": ["tm-schools-hero", "tm-schools-grid", "tm-schools-cta"],
    "for-tutors": ["tm-tutors-hero", "tm-tutors-body", "tm-tutors-cta"],
    contact: ["tm-contact-hero", "tm-contact-body", "tm-contact-cta"],
    faq: ["tm-faq-hero", "tm-faq-list"],
    "privacy-policy": ["tm-privacy-body"],
    terms: ["tm-terms-body"],
  };

  for (const page of pages) {
    const componentIds = pageComponentsBySlug[page.slug] || [];
    const pageEntryId = mustMapValue(pageIdBySlug, page.slug, "page entry id");
    await ensureEntry({
      id: pageEntryId,
      contentTypeId: "page",
      fields: {
        title: localized(page.title),
        slug: localized(page.slug),
        metaTitle: localized(page.metaTitle),
        metaDescription: localized(page.metaDescription),
        metaKeywords: localized(page.metaKeywords),
        components: localized(componentIds.map((id) => entryLink(id))),
      },
    });
  }

  await ensureEntry({
    id: "tm-global-settings-default",
    contentTypeId: "globalSettings",
    fields: {
      key: localized("default"),
      header: localized(entryLink("tm-header-main")),
      footer: localized(entryLink("tm-footer-main")),
    },
  });

  log("Seed phase complete.");
}

async function main() {
  log(`Contentful bootstrap starting (${options.dryRun ? "dry-run" : "apply"})`);
  log(`Space: ${SPACE_ID}`);
  log(`Environment: ${ENVIRONMENT_ID}`);

  if (!options.seedOnly) {
    await patchSchema();
  }

  if (!options.schemaOnly) {
    await seedEntries();
  }

  log("Contentful bootstrap finished.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
