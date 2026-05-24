const CONTENTFUL_CDN_BASE = "https://cdn.contentful.com";
const DEFAULT_LOCALE = "en-US";

const RESERVED_MARKETPLACE_SEGMENTS = [
  "api",
  "bookings",
  "role-select",
  "sign-in",
  "tutors",
  "reviews",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
];

export const RESERVED_MARKETING_SLUGS = new Set(RESERVED_MARKETPLACE_SEGMENTS);

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ContentfulSys = {
  id: string;
  type: string;
  contentType?: {
    sys?: {
      id: string;
    };
  };
  linkType?: "Entry" | "Asset";
};

type ContentfulLink = {
  sys: ContentfulSys;
};

type ContentfulEntry = {
  sys: ContentfulSys;
  fields?: Record<string, unknown>;
};

type ContentfulAsset = {
  sys: ContentfulSys;
  fields?: Record<string, unknown>;
};

type ContentfulEntriesResponse = {
  items: ContentfulEntry[];
  includes?: {
    Entry?: ContentfulEntry[];
    Asset?: ContentfulAsset[];
  };
};

export type CmsImage = {
  url: string;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  contentType?: string;
};

export type CmsRichTextMark = {
  type: string;
};

export type CmsRichTextNode = {
  nodeType: string;
  value?: string;
  marks?: CmsRichTextMark[];
  data?: Record<string, unknown>;
  content?: CmsRichTextNode[];
};

export type CmsRichTextDocument = {
  nodeType: "document";
  data?: Record<string, unknown>;
  content: CmsRichTextNode[];
};

export type CmsBlockTheme = {
  title: string;
  hideBlockTitle: boolean;
  isPageTitle: boolean;
  titleBlockAlignment: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  backgroundColor: string;
  backgroundImage?: CmsImage;
  blockPaddingTop?: boolean;
  blockPaddingBottom?: boolean;
  blockClass: string;
  blockClass2: string;
};

export type CmsLink = {
  kind: "link";
  id: string;
  label: string;
  url: string;
  externalLink: boolean;
  hideLabel: boolean;
  customClass: string;
  linkedPageSlug?: string;
};

export type CmsDropdown = {
  kind: "dropdown";
  id: string;
  title: string;
  links: CmsLink[];
};

export type CmsMenuItem = CmsLink | CmsDropdown;

export type CmsMenu = {
  id: string;
  title: string;
  hideTitle: boolean;
  links: CmsMenuItem[];
};

export type CmsHeader = {
  id: string;
  title: string;
  logo?: CmsImage;
  menu?: CmsMenu;
};

export type CmsFooter = {
  id: string;
  title: string;
  copy: string;
  footerMenus: CmsMenu[];
  subfooterCopy: string;
};

export type CmsHeroBanner = {
  type: "componentHeroBanner";
  id: string;
  data: {
    title: string;
    hideTitle: boolean;
    copy?: CmsRichTextDocument;
    textColor: string;
    highlightColor: string;
    backgroundImage?: CmsImage;
    backgroundSvgCode: string;
    blockTheme?: CmsBlockTheme;
  };
};

export type CmsBodyCopy = {
  type: "componentBodyCopy";
  id: string;
  data: {
    title: string;
    copy?: CmsRichTextDocument;
    blockTheme?: CmsBlockTheme;
  };
};

export type CmsCard = {
  id: string;
  title: string;
  subHeading: string;
  description: string;
  copy?: CmsRichTextDocument;
  image?: CmsImage;
  buttons: CmsLink[];
  customClass: string;
  videoUrl: string;
  video?: CmsImage;
};

export type CmsCardGrid = {
  type: "componentCardGrid";
  id: string;
  data: {
    title: string;
    copy: string;
    cards: CmsCard[];
    cardsDesktop: string;
    cardsTablet: string;
    cardsMobile: string;
    blockTheme?: CmsBlockTheme;
  };
};

export type CmsTitleBodyCta = {
  type: "componentTitleBodyCta";
  id: string;
  data: {
    title: string;
    copy?: CmsRichTextDocument;
    ctaBlock: CmsLink[];
    blockTheme?: CmsBlockTheme;
  };
};

export type CmsListItem = {
  id: string;
  title: string;
  copy?: CmsRichTextDocument;
  image?: CmsImage;
  customClass: string;
};

export type CmsListBlock = {
  type: "componentListBlock";
  id: string;
  data: {
    title: string;
    copy: string;
    listItems: CmsListItem[];
    blockTheme?: CmsBlockTheme;
  };
};

export type CmsTwoColumnTextImage = {
  type: "componentTwoColumnTextImage";
  id: string;
  data: {
    title: string;
    introCopy: string;
    copy?: CmsRichTextDocument;
    image?: CmsImage;
    imageSvgOverlay: string;
    ctaLabel: string;
    ctaUrl: string;
    ctaCustomClass: string;
    imageOnLeft: boolean;
    blockTheme?: CmsBlockTheme;
  };
};

export type CmsTwoColumnImageCopyList = {
  type: "componentTwoColumnImageCopyList";
  id: string;
  data: {
    preTitle: string;
    title: string;
    image?: CmsImage;
    imageLeft: boolean;
    copy?: CmsRichTextDocument;
    list?: CmsListBlock["data"];
    blockTheme?: CmsBlockTheme;
  };
};

export type CmsHeaderComponent = {
  type: "componentHeader";
  id: string;
  data: CmsHeader;
};

export type CmsSupportedComponent =
  | CmsHeroBanner
  | CmsBodyCopy
  | CmsCardGrid
  | CmsTitleBodyCta
  | CmsListBlock
  | CmsTwoColumnTextImage
  | CmsTwoColumnImageCopyList
  | CmsHeaderComponent;

export type CmsPage = {
  id: string;
  title: string;
  slug: string;
  metadata: {
    title: string;
    description: string;
    keywords: string;
  };
  components: CmsSupportedComponent[];
};

export type CmsGlobalSettings = {
  id: string;
  key: string;
  header?: CmsHeader;
  footer?: CmsFooter;
};

export type CmsContextualLink = {
  href: string;
  label: string;
  className?: string;
};

export type CmsRenderContext = {
  contextualLinks?: Record<string, CmsContextualLink>;
};

type ResolvedMaps = {
  entries: Map<string, ContentfulEntry>;
  assets: Map<string, ContentfulAsset>;
};

function hasCmsCredentials(): boolean {
  return Boolean(process.env.CONTENTFUL_SPACE_ID && process.env.CONTENTFUL_ACCESS_TOKEN);
}

function getEnvironmentId(): string {
  return process.env.CONTENTFUL_ENVIRONMENT_ID || "master";
}

function getLocale(): string {
  return DEFAULT_LOCALE;
}

function getLocalizedValue<T>(value: unknown): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return value as T;
  }

  const record = value as Record<string, unknown>;
  const locale = getLocale();

  if (locale in record) {
    return record[locale] as T;
  }

  if (DEFAULT_LOCALE in record) {
    return record[DEFAULT_LOCALE] as T;
  }

  const keys = Object.keys(record);
  if (keys.length > 0 && keys.every((key) => key.includes("-"))) {
    return record[keys[0]] as T;
  }

  return value as T;
}

function isLink(value: unknown): value is ContentfulLink {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeLink = value as ContentfulLink;
  return maybeLink.sys?.type === "Link" && Boolean(maybeLink.sys.id);
}

function isEntry(value: unknown): value is ContentfulEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeEntry = value as ContentfulEntry;
  return Boolean(maybeEntry.sys?.id) && maybeEntry.sys?.type === "Entry";
}

function isAsset(value: unknown): value is ContentfulAsset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeAsset = value as ContentfulAsset;
  return Boolean(maybeAsset.sys?.id) && maybeAsset.sys?.type === "Asset";
}

function buildResolvedMaps(payload: ContentfulEntriesResponse): ResolvedMaps {
  const entries = new Map<string, ContentfulEntry>();
  const assets = new Map<string, ContentfulAsset>();

  for (const item of payload.items || []) {
    entries.set(item.sys.id, item);
  }

  for (const includeEntry of payload.includes?.Entry || []) {
    entries.set(includeEntry.sys.id, includeEntry);
  }

  for (const includeAsset of payload.includes?.Asset || []) {
    assets.set(includeAsset.sys.id, includeAsset);
  }

  return { entries, assets };
}

function resolveEntryLink(value: unknown, maps: ResolvedMaps): ContentfulEntry | undefined {
  const localized = getLocalizedValue<unknown>(value);

  if (isEntry(localized)) {
    return localized;
  }

  if (!isLink(localized) || localized.sys.linkType !== "Entry") {
    return undefined;
  }

  return maps.entries.get(localized.sys.id);
}

function resolveEntryArray(value: unknown, maps: ResolvedMaps): ContentfulEntry[] {
  const localized = getLocalizedValue<unknown>(value);
  if (!Array.isArray(localized)) {
    return [];
  }

  return localized
    .map((item) => resolveEntryLink(item, maps))
    .filter((item): item is ContentfulEntry => Boolean(item));
}

function resolveAssetLink(value: unknown, maps: ResolvedMaps): ContentfulAsset | undefined {
  const localized = getLocalizedValue<unknown>(value);

  if (isAsset(localized)) {
    return localized;
  }

  if (!isLink(localized) || localized.sys.linkType !== "Asset") {
    return undefined;
  }

  return maps.assets.get(localized.sys.id);
}

function getField<T>(entry: ContentfulEntry | ContentfulAsset | undefined, fieldId: string): T | undefined {
  if (!entry || !entry.fields) {
    return undefined;
  }

  return getLocalizedValue<T>(entry.fields[fieldId]);
}

function transformAssetToImage(asset: ContentfulAsset | undefined): CmsImage | undefined {
  if (!asset) {
    return undefined;
  }

  const fileData = getField<Record<string, unknown>>(asset, "file");
  const url = typeof fileData?.url === "string" ? fileData.url : "";
  if (!url) {
    return undefined;
  }

  const details = (fileData?.details as Record<string, unknown> | undefined) || undefined;
  const imageDetails = details?.image as Record<string, unknown> | undefined;

  return {
    url: url.startsWith("//") ? `https:${url}` : url,
    width: typeof imageDetails?.width === "number" ? imageDetails.width : undefined,
    height: typeof imageDetails?.height === "number" ? imageDetails.height : undefined,
    title: getField<string>(asset, "title"),
    description: getField<string>(asset, "description"),
    contentType: typeof fileData?.contentType === "string" ? fileData.contentType : undefined,
  };
}

function getRichTextDocument(value: unknown): CmsRichTextDocument | undefined {
  const localized = getLocalizedValue<unknown>(value);
  if (!localized || typeof localized !== "object") {
    return undefined;
  }

  const record = localized as Record<string, unknown>;
  if (record.nodeType !== "document" || !Array.isArray(record.content)) {
    return undefined;
  }

  return localized as CmsRichTextDocument;
}

function richTextToPlainText(value: unknown): string {
  const localized = getLocalizedValue<unknown>(value);
  if (!localized || typeof localized !== "object") {
    return "";
  }

  const lines: string[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }

    const nodeRecord = node as Record<string, unknown>;
    const nodeType = typeof nodeRecord.nodeType === "string" ? nodeRecord.nodeType : "";

    if (nodeType === "text") {
      const textValue = typeof nodeRecord.value === "string" ? nodeRecord.value : "";
      if (textValue) {
        lines.push(textValue);
      }
      return;
    }

    const content = Array.isArray(nodeRecord.content) ? nodeRecord.content : [];

    if (nodeType === "paragraph" || nodeType === "heading-1" || nodeType === "heading-2" || nodeType === "heading-3" || nodeType === "list-item") {
      const beforeLength = lines.length;
      for (const child of content) {
        walk(child);
      }
      if (lines.length > beforeLength) {
        lines.push("\n");
      }
      return;
    }

    for (const child of content) {
      walk(child);
    }
  };

  walk(localized);

  const joined = lines.join("");
  return joined
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^\s+|\s+$/g, "");
}

function contentTypeId(entry: ContentfulEntry | undefined): string {
  return entry?.sys?.contentType?.sys?.id || "";
}

function normalizeSlugToPath(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

function transformSubcomponentLink(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsLink | undefined {
  if (!entry || contentTypeId(entry) !== "subcomponentLink") {
    return undefined;
  }

  const label = getField<string>(entry, "label") || "";
  const fallbackUrl = getField<string>(entry, "url") || "";
  const linkedPageEntry = resolveEntryLink(entry.fields?.linkedPage, maps);
  const linkedPageSlug = getField<string>(linkedPageEntry, "slug") || undefined;
  const resolvedInternalUrl = linkedPageSlug ? normalizeSlugToPath(linkedPageSlug) : "";

  const hideLabel = Boolean(getField<boolean>(entry, "hideLabel"));
  const externalLink = Boolean(getField<boolean>(entry, "externalLink"));

  const url = resolvedInternalUrl || fallbackUrl || "#";

  return {
    kind: "link",
    id: entry.sys.id,
    label,
    url,
    hideLabel,
    externalLink,
    customClass: getField<string>(entry, "customClass") || "",
    linkedPageSlug,
  };
}

function transformSubcomponentDropdown(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsDropdown | undefined {
  if (!entry || contentTypeId(entry) !== "subcomponentDropdown") {
    return undefined;
  }

  const links = resolveEntryArray(entry.fields?.links, maps)
    .map((linkEntry) => transformSubcomponentLink(linkEntry, maps))
    .filter((item): item is CmsLink => Boolean(item));

  return {
    kind: "dropdown",
    id: entry.sys.id,
    title: getField<string>(entry, "title") || "",
    links,
  };
}

function transformMenuItem(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsMenuItem | undefined {
  if (!entry) {
    return undefined;
  }

  const id = contentTypeId(entry);
  if (id === "subcomponentLink") {
    return transformSubcomponentLink(entry, maps);
  }

  if (id === "subcomponentDropdown") {
    return transformSubcomponentDropdown(entry, maps);
  }

  return undefined;
}

function transformMenu(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsMenu | undefined {
  if (!entry || contentTypeId(entry) !== "componentMenu") {
    return undefined;
  }

  const links = resolveEntryArray(entry.fields?.links, maps)
    .map((item) => transformMenuItem(item, maps))
    .filter((item): item is CmsMenuItem => Boolean(item));

  return {
    id: entry.sys.id,
    title: getField<string>(entry, "title") || "",
    hideTitle: Boolean(getField<boolean>(entry, "hideTitle")),
    links,
  };
}

function transformHeader(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsHeader | undefined {
  if (!entry || contentTypeId(entry) !== "componentHeader") {
    return undefined;
  }

  const menuEntry = resolveEntryLink(entry.fields?.menu, maps);
  const logoAsset = resolveAssetLink(entry.fields?.logo, maps);

  return {
    id: entry.sys.id,
    title: getField<string>(entry, "title") || "",
    logo: transformAssetToImage(logoAsset),
    menu: transformMenu(menuEntry, maps),
  };
}

function transformFooter(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsFooter | undefined {
  if (!entry || contentTypeId(entry) !== "componentFooter") {
    return undefined;
  }

  const footerMenus = resolveEntryArray(entry.fields?.footerMenus, maps)
    .map((menuEntry) => transformMenu(menuEntry, maps))
    .filter((menu): menu is CmsMenu => Boolean(menu));

  return {
    id: entry.sys.id,
    title: getField<string>(entry, "title") || "",
    copy: richTextToPlainText(entry.fields?.copy),
    footerMenus,
    subfooterCopy: getField<string>(entry, "subfooterCopy") || "",
  };
}

function transformBlockTheme(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsBlockTheme | undefined {
  if (!entry || contentTypeId(entry) !== "subcomponentBlockTheme") {
    return undefined;
  }

  return {
    title: getField<string>(entry, "title") || "",
    hideBlockTitle: Boolean(getField<boolean>(entry, "hideBlockTitle")),
    isPageTitle: Boolean(getField<boolean>(entry, "isPageTitle")),
    titleBlockAlignment: getField<string>(entry, "titleBlockAlignment") || "",
    primaryTextColor: getField<string>(entry, "primaryTextColor") || "",
    secondaryTextColor: getField<string>(entry, "secondaryTextColor") || "",
    backgroundColor: getField<string>(entry, "backgroundColor") || "",
    backgroundImage: transformAssetToImage(resolveAssetLink(entry.fields?.backgroundImage, maps)),
    blockPaddingTop: getField<boolean>(entry, "blockPaddingTop"),
    blockPaddingBottom: getField<boolean>(entry, "blockPaddingBottom"),
    blockClass: getField<string>(entry, "blockClass") || "",
    blockClass2: getField<string>(entry, "blockClass2") || "",
  };
}

function transformCard(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsCard | undefined {
  if (!entry) {
    return undefined;
  }

  const id = contentTypeId(entry);
  if (id !== "subcomponentCard" && id !== "subcomponentTitleImageCopyCard" && id !== "subcomponentVideoCard") {
    return undefined;
  }

  const imageField = id === "subcomponentVideoCard" ? entry.fields?.thumbnailImage : entry.fields?.image;
  const imageAsset = resolveAssetLink(imageField, maps);
  const videoAsset = resolveAssetLink(entry.fields?.video, maps);

  const buttons = resolveEntryArray(entry.fields?.buttons, maps)
    .map((buttonEntry) => transformSubcomponentLink(buttonEntry, maps))
    .filter((button): button is CmsLink => Boolean(button));

  return {
    id: entry.sys.id,
    title: getField<string>(entry, "title") || "",
    subHeading:
      getField<string>(entry, "subHeading") ||
      getField<string>(entry, "subheading") ||
      getField<string>(entry, "subtitle") ||
      "",
    description: getField<string>(entry, "description") || "",
    copy: getRichTextDocument(entry.fields?.copy),
    image: transformAssetToImage(imageAsset),
    buttons,
    customClass: getField<string>(entry, "customClass") || "",
    videoUrl: getField<string>(entry, "videoUrl") || "",
    video: transformAssetToImage(videoAsset),
  };
}

function transformListItem(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsListItem | undefined {
  if (!entry || contentTypeId(entry) !== "subcomponentListItem") {
    return undefined;
  }

  return {
    id: entry.sys.id,
    title: getField<string>(entry, "title") || "",
    copy: getRichTextDocument(entry.fields?.copy),
    image: transformAssetToImage(resolveAssetLink(entry.fields?.image, maps)),
    customClass: getField<string>(entry, "customClass") || "",
  };
}

function transformListBlockData(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsListBlock["data"] | undefined {
  if (!entry || contentTypeId(entry) !== "componentListBlock") {
    return undefined;
  }

  const blockThemeEntry = resolveEntryLink(entry.fields?.blockTheme, maps);
  const listItems = resolveEntryArray(entry.fields?.listItems, maps)
    .map((listItemEntry) => transformListItem(listItemEntry, maps))
    .filter((listItem): listItem is CmsListItem => Boolean(listItem));

  return {
    title: getField<string>(entry, "title") || "",
    copy: getField<string>(entry, "copy") || "",
    listItems,
    blockTheme: transformBlockTheme(blockThemeEntry, maps),
  };
}

function transformComponent(entry: ContentfulEntry | undefined, maps: ResolvedMaps): CmsSupportedComponent | undefined {
  if (!entry) {
    return undefined;
  }

  const componentId = contentTypeId(entry);

  if (componentId === "componentHeroBanner") {
    const blockThemeEntry = resolveEntryLink(entry.fields?.blockTheme, maps);
    return {
      type: "componentHeroBanner",
      id: entry.sys.id,
      data: {
        title: getField<string>(entry, "title") || "",
        hideTitle: Boolean(getField<boolean>(entry, "hideTitle")),
        copy: getRichTextDocument(entry.fields?.copy),
        textColor: getField<string>(entry, "textColor") || "",
        highlightColor: getField<string>(entry, "highlightColor") || "",
        backgroundImage: transformAssetToImage(resolveAssetLink(entry.fields?.backgroundImage, maps)),
        backgroundSvgCode: getField<string>(entry, "backgroundSvgCode") || "",
        blockTheme: transformBlockTheme(blockThemeEntry, maps),
      },
    };
  }

  if (componentId === "componentBodyCopy") {
    const blockThemeEntry = resolveEntryLink(entry.fields?.blockTheme, maps);
    return {
      type: "componentBodyCopy",
      id: entry.sys.id,
      data: {
        title: getField<string>(entry, "title") || "",
        copy: getRichTextDocument(entry.fields?.copy),
        blockTheme: transformBlockTheme(blockThemeEntry, maps),
      },
    };
  }

  if (componentId === "componentCardGrid") {
    const blockThemeEntry = resolveEntryLink(entry.fields?.blockTheme, maps);
    const cards = resolveEntryArray(entry.fields?.cards, maps)
      .map((cardEntry) => transformCard(cardEntry, maps))
      .filter((card): card is CmsCard => Boolean(card));

    return {
      type: "componentCardGrid",
      id: entry.sys.id,
      data: {
        title: getField<string>(entry, "title") || "",
        copy: getField<string>(entry, "copy") || "",
        cards,
        cardsDesktop: getField<string>(entry, "cardsDesktop") || "3",
        cardsTablet: getField<string>(entry, "cardsTablet") || "2",
        cardsMobile: getField<string>(entry, "cardsMobile") || "1",
        blockTheme: transformBlockTheme(blockThemeEntry, maps),
      },
    };
  }

  if (componentId === "componentTitleBodyCta") {
    const blockThemeEntry = resolveEntryLink(entry.fields?.blockTheme, maps);
    const ctaBlock = resolveEntryArray(entry.fields?.ctaBlock, maps)
      .map((linkEntry) => transformSubcomponentLink(linkEntry, maps))
      .filter((link): link is CmsLink => Boolean(link));

    return {
      type: "componentTitleBodyCta",
      id: entry.sys.id,
      data: {
        title: getField<string>(entry, "title") || "",
        copy: getRichTextDocument(entry.fields?.copy),
        ctaBlock,
        blockTheme: transformBlockTheme(blockThemeEntry, maps),
      },
    };
  }

  if (componentId === "componentListBlock") {
    const listBlockData = transformListBlockData(entry, maps);

    return {
      type: "componentListBlock",
      id: entry.sys.id,
      data: listBlockData || {
        title: "",
        copy: "",
        listItems: [],
      },
    };
  }

  if (componentId === "componentTwoColumnTextImage") {
    const blockThemeEntry = resolveEntryLink(entry.fields?.blockTheme, maps);
    const ctaEntry = resolveEntryLink(entry.fields?.cta, maps);
    const ctaLink = transformSubcomponentLink(ctaEntry, maps);
    const introCopyRichText = richTextToPlainText(entry.fields?.introCopy);

    return {
      type: "componentTwoColumnTextImage",
      id: entry.sys.id,
      data: {
        title: getField<string>(entry, "title") || "",
        introCopy: getField<string>(entry, "introCopy") || introCopyRichText,
        copy: getRichTextDocument(entry.fields?.copy),
        image: transformAssetToImage(resolveAssetLink(entry.fields?.image, maps)),
        imageSvgOverlay:
          getField<string>(entry, "imageSvgOverlay") ||
          getField<string>(entry, "imageSvgCode") ||
          getField<string>(entry, "svgOverlay") ||
          "",
        ctaLabel: getField<string>(entry, "ctaLabel") || ctaLink?.label || "",
        ctaUrl: getField<string>(entry, "ctaUrl") || ctaLink?.url || "",
        ctaCustomClass: getField<string>(entry, "ctaCustomClass") || ctaLink?.customClass || "",
        imageOnLeft: getField<boolean>(entry, "imageOnLeft") ?? true,
        blockTheme: transformBlockTheme(blockThemeEntry, maps),
      },
    };
  }

  if (componentId === "componentTwoColumnImageCopyList") {
    const blockThemeEntry = resolveEntryLink(entry.fields?.blockTheme, maps);
    const linkedListEntry =
      resolveEntryLink(entry.fields?.list, maps) ||
      resolveEntryLink(entry.fields?.listBlock, maps);

    const linkedListData = transformListBlockData(linkedListEntry, maps);

    return {
      type: "componentTwoColumnImageCopyList",
      id: entry.sys.id,
      data: {
        preTitle: getField<string>(entry, "preTitle") || "",
        title: getField<string>(entry, "title") || "",
        image: transformAssetToImage(resolveAssetLink(entry.fields?.image, maps)),
        imageLeft: getField<boolean>(entry, "imageLeft") ?? getField<boolean>(entry, "imageOnLeft") ?? true,
        copy: getRichTextDocument(entry.fields?.copy),
        list: linkedListData,
        blockTheme: transformBlockTheme(blockThemeEntry, maps),
      },
    };
  }

  if (componentId === "componentHeader") {
    const headerData = transformHeader(entry, maps);
    if (!headerData) {
      return undefined;
    }

    return {
      type: "componentHeader",
      id: entry.sys.id,
      data: headerData,
    };
  }

  return undefined;
}

async function fetchEntriesFromContentful(query: Record<string, string>): Promise<ContentfulEntriesResponse | null> {
  if (!hasCmsCredentials()) {
    return null;
  }

  const search = new URLSearchParams({
    include: "10",
    limit: "1",
    ...query,
  });

  const spaceId = process.env.CONTENTFUL_SPACE_ID as string;
  const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN as string;
  const environmentId = getEnvironmentId();

  const url = `${CONTENTFUL_CDN_BASE}/spaces/${spaceId}/environments/${environmentId}/entries?${search.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ContentfulEntriesResponse;
    return payload;
  } catch (_error) {
    return null;
  }
}

async function fetchEntryByContentTypeAndKey(contentType: string, key: string): Promise<{ entry: ContentfulEntry; maps: ResolvedMaps } | null> {
  const payload = await fetchEntriesFromContentful({
    content_type: contentType,
    "fields.key": key,
  });

  if (!payload || !payload.items.length) {
    return null;
  }

  const maps = buildResolvedMaps(payload);
  return {
    entry: payload.items[0],
    maps,
  };
}

async function fetchEntryByContentTypeAndId(contentType: string, id: string): Promise<{ entry: ContentfulEntry; maps: ResolvedMaps } | null> {
  const payload = await fetchEntriesFromContentful({
    content_type: contentType,
    "sys.id": id,
  });

  if (!payload || !payload.items.length) {
    return null;
  }

  const maps = buildResolvedMaps(payload);
  return {
    entry: payload.items[0],
    maps,
  };
}

export async function getCmsPageBySlug(slug: string): Promise<CmsPage | null> {
  const payload = await fetchEntriesFromContentful({
    content_type: "page",
    "fields.slug": slug,
  });

  if (!payload || payload.items.length === 0) {
    return null;
  }

  const pageEntry = payload.items[0];
  const maps = buildResolvedMaps(payload);

  const components = resolveEntryArray(pageEntry.fields?.components, maps)
    .map((componentEntry) => transformComponent(componentEntry, maps))
    .filter((component): component is CmsSupportedComponent => Boolean(component));

  const title = getField<string>(pageEntry, "title") || slug;

  return {
    id: pageEntry.sys.id,
    title,
    slug: getField<string>(pageEntry, "slug") || slug,
    metadata: {
      title: getField<string>(pageEntry, "metaTitle") || title,
      description: getField<string>(pageEntry, "metaDescription") || "",
      keywords: getField<string>(pageEntry, "metaKeywords") || "",
    },
    components,
  };
}

export async function getCmsGlobalSettings(): Promise<CmsGlobalSettings | null> {
  let current = await fetchEntryByContentTypeAndKey("globalSettings", "default");
  if (!current) {
    const fallbackPayload = await fetchEntriesFromContentful({
      content_type: "globalSettings",
    });
    if (!fallbackPayload || fallbackPayload.items.length === 0) {
      return null;
    }
    current = {
      entry: fallbackPayload.items[0],
      maps: buildResolvedMaps(fallbackPayload),
    };
  }

  const { entry, maps } = current;

  const headerEntry = resolveEntryLink(entry.fields?.header, maps);
  const footerEntry = resolveEntryLink(entry.fields?.footer, maps);

  return {
    id: entry.sys.id,
    key: getField<string>(entry, "key") || "default",
    header: transformHeader(headerEntry, maps),
    footer: transformFooter(footerEntry, maps),
  };
}

export async function getCmsFooterById(footerId: string): Promise<CmsFooter | null> {
  const normalizedFooterId = footerId.trim();
  if (!normalizedFooterId) {
    return null;
  }

  const current = await fetchEntryByContentTypeAndId("componentFooter", normalizedFooterId);
  if (!current) {
    return null;
  }

  const { entry, maps } = current;
  return transformFooter(entry, maps) || null;
}

export function isReservedMarketingSlug(slug: string): boolean {
  return RESERVED_MARKETING_SLUGS.has(slug);
}

export function isCmsConfigured(): boolean {
  return hasCmsCredentials();
}

export function toParagraphs(copy: string): string[] {
  return copy
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

export function toJson(value: JsonValue): JsonValue {
  return value;
}
