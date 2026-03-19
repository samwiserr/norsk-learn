"use client";

import DOMPurify from "dompurify";

interface SafeHtmlProps {
  content: string;
  className?: string;
}

const ALLOWED_TAGS = [
  "div", "span", "p", "br", "strong", "em", "b", "i", "u",
  "ul", "ol", "li", "details", "summary",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "code", "pre", "blockquote", "hr",
];

const ALLOWED_ATTR = ["class", "href", "target", "rel", "open"];

export default function SafeHtml({ content, className }: SafeHtmlProps) {
  if (typeof window === "undefined") {
    return <div className={className} />;
  }

  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
