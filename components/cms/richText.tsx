import Link from "next/link";
import type { ReactNode } from "react";
import type { CmsContextualLink, CmsRichTextDocument, CmsRichTextNode } from "../../lib/cms/contentful";

type RichTextClassNames = {
  paragraph?: string;
  heading1?: string;
  heading2?: string;
  heading3?: string;
  heading4?: string;
  heading5?: string;
  heading6?: string;
  unorderedList?: string;
  orderedList?: string;
  listItem?: string;
  quote?: string;
  hr?: string;
  link?: string;
  bold?: string;
  italic?: string;
  underline?: string;
  code?: string;
};

type RenderRichTextOptions = {
  classNames?: RichTextClassNames;
  contextualLinks?: Record<string, CmsContextualLink>;
};

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}

function applyMarks(value: string, node: CmsRichTextNode, classNames: RichTextClassNames): ReactNode {
  const marks = Array.isArray(node.marks) ? node.marks : [];
  return marks.reduce<ReactNode>((acc, mark, index) => {
    const key = `mark-${mark.type}-${index}`;
    switch (mark.type) {
      case "bold":
        return (
          <strong key={key} className={classNames.bold}>
            {acc}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className={classNames.italic}>
            {acc}
          </em>
        );
      case "underline":
        return (
          <u key={key} className={classNames.underline}>
            {acc}
          </u>
        );
      case "code":
        return (
          <code key={key} className={classNames.code}>
            {acc}
          </code>
        );
      default:
        return acc;
    }
  }, value);
}

function renderNode(node: CmsRichTextNode, key: string, options: RenderRichTextOptions): ReactNode {
  const classNames = options.classNames || {};
  if (node.nodeType === "text") {
    return applyMarks(node.value || "", node, classNames);
  }

  const children = (node.content || []).map((child, index) => renderNode(child, `${key}-${index}`, options));

  switch (node.nodeType) {
    case "paragraph":
      return (
        <p key={key} className={classNames.paragraph}>
          {children}
        </p>
      );
    case "heading-1":
      return (
        <h1 key={key} className={classNames.heading1}>
          {children}
        </h1>
      );
    case "heading-2":
      return (
        <h2 key={key} className={classNames.heading2}>
          {children}
        </h2>
      );
    case "heading-3":
      return (
        <h3 key={key} className={classNames.heading3}>
          {children}
        </h3>
      );
    case "heading-4":
      return (
        <h4 key={key} className={classNames.heading4}>
          {children}
        </h4>
      );
    case "heading-5":
      return (
        <h5 key={key} className={classNames.heading5}>
          {children}
        </h5>
      );
    case "heading-6":
      return (
        <h6 key={key} className={classNames.heading6}>
          {children}
        </h6>
      );
    case "unordered-list":
      return (
        <ul key={key} className={classNames.unorderedList}>
          {children}
        </ul>
      );
    case "ordered-list":
      return (
        <ol key={key} className={classNames.orderedList}>
          {children}
        </ol>
      );
    case "list-item":
      return (
        <li key={key} className={classNames.listItem}>
          {children}
        </li>
      );
    case "blockquote":
      return (
        <blockquote key={key} className={classNames.quote}>
          {children}
        </blockquote>
      );
    case "hr":
      return <hr key={key} className={classNames.hr} />;
    case "hyperlink": {
      const uri = typeof node.data?.uri === "string" ? node.data.uri : "#";
      const contextual = options.contextualLinks?.[uri];
      if (contextual) {
        return (
          <Link key={key} href={contextual.href} className={contextual.className || classNames.link}>
            {contextual.label}
          </Link>
        );
      }

      if (isExternalUrl(uri)) {
        return (
          <a key={key} href={uri} className={classNames.link} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }

      return (
        <Link key={key} href={uri} className={classNames.link}>
          {children}
        </Link>
      );
    }
    default:
      return (
        <span key={key}>
          {children}
        </span>
      );
  }
}

export function renderRichText(document: CmsRichTextDocument | undefined, options: RenderRichTextOptions = {}): ReactNode {
  if (!document?.content?.length) {
    return null;
  }

  return document.content.map((node, index) => renderNode(node, `rt-${index}`, options));
}
