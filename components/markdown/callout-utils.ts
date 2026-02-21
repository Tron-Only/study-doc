import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Info,
  Lightbulb,
  MessageSquare,
  XCircle,
  Flame,
  BookOpen,
  Quote,
  Bug,
} from "lucide-react";
import React from "react";

export interface CalloutConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const createConfig = (
  icon: React.ElementType,
  color: string
): CalloutConfig => ({
  icon,
  color,
  bgColor: `${color}12`, // ~7% opacity hex
  borderColor: color,
});

// ─── Muted Ink & Paper callout palette ──────────────────────
// Warm, desaturated tones that sit comfortably on parchment/charcoal.

const BLUE    = "#5c7a8a";   // slate blue
const CYAN    = "#5c8a8a";   // teal ink
const GREEN   = "#5c8a6b";   // sage green
const YELLOW  = "#8a7a5c";   // warm amber
const ORANGE  = "#8a6b5c";   // warm clay
const RED     = "#8a5c5c";   // muted oxblood
const PURPLE  = "#7a5c8a";   // dusty plum
const GRAY    = "#7a7a7a";   // neutral

// Group callout types by their styling
export const CALLOUT_TYPES: Record<string, CalloutConfig> = {
  // Blue group
  note: createConfig(Info, BLUE),
  info: createConfig(Info, BLUE),
  todo: createConfig(CheckCircle, BLUE),

  // Cyan group
  abstract: createConfig(BookOpen, CYAN),
  summary: createConfig(BookOpen, CYAN),
  tldr: createConfig(BookOpen, CYAN),

  // Green group
  tip: createConfig(Lightbulb, GREEN),
  hint: createConfig(Lightbulb, GREEN),
  important: createConfig(Lightbulb, GREEN),
  success: createConfig(CheckCircle, GREEN),
  check: createConfig(CheckCircle, GREEN),
  done: createConfig(CheckCircle, GREEN),

  // Yellow group
  question: createConfig(HelpCircle, YELLOW),
  help: createConfig(HelpCircle, YELLOW),
  faq: createConfig(HelpCircle, YELLOW),

  // Orange group
  warning: createConfig(AlertTriangle, ORANGE),
  caution: createConfig(AlertTriangle, ORANGE),
  attention: createConfig(AlertTriangle, ORANGE),

  // Red group
  failure: createConfig(XCircle, RED),
  fail: createConfig(XCircle, RED),
  missing: createConfig(XCircle, RED),
  danger: createConfig(Flame, RED),
  error: createConfig(XCircle, RED),
  bug: createConfig(Bug, RED),

  // Purple group
  example: createConfig(MessageSquare, PURPLE),

  // Gray group
  quote: createConfig(Quote, GRAY),
  cite: createConfig(Quote, GRAY),
};

export interface ParsedCallout {
  type: string;
  title: string | null;
  isCallout: boolean;
  collapsible: boolean;
  collapsed: boolean;
}

export function parseCallout(children: React.ReactNode): ParsedCallout {
  const text = extractFirstParagraphText(children);
  const trimmedText = text.trim();

  // Match Obsidian callout syntax: [!TYPE], [!TYPE] Title, [!TYPE]- Title (collapsed), [!TYPE]+ Title (expanded)
  const match = trimmedText.match(/^\[!\s*(\w+)\s*\]([+-]?)\s*(.*)/);

  if (match) {
    const type = match[1].toLowerCase();
    const collapsibleIndicator = match[2];
    const title = match[3].trim() || null;
    const isCallout = type in CALLOUT_TYPES;
    const collapsible = collapsibleIndicator === "+" || collapsibleIndicator === "-";
    const collapsed = collapsibleIndicator === "-";

    return { type, title, isCallout, collapsible, collapsed };
  }

  return {
    type: "",
    title: null,
    isCallout: false,
    collapsible: false,
    collapsed: false,
  };
}

function extractTextFromReactNode(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join("");
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props.children) {
      return extractTextFromReactNode(element.props.children);
    }
  }
  return "";
}

function extractFirstParagraphText(children: React.ReactNode): string {
  if (Array.isArray(children) && children.length > 0) {
    const firstChild = children[0];
    if (React.isValidElement(firstChild)) {
      const element = firstChild as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      if (element.type === "p" && element.props.children) {
        return extractTextFromReactNode(element.props.children);
      }
    }
  }
  return extractTextFromReactNode(children);
}

function removeCalloutMarkerFromText(text: string, type: string): string {
  const pattern = new RegExp(`^\\[!\\s*${type}\\s*\\][+-]?\\s*`);
  return text.replace(pattern, "").trim();
}

export function removeCalloutMarker(
  children: React.ReactNode,
  type: string
): React.ReactNode {
  if (!Array.isArray(children)) return children;

  const paraIndex = children.findIndex(
    (child) => React.isValidElement(child) && child.type === "p"
  );

  if (paraIndex === -1) return children;

  const paraElement = children[paraIndex] as React.ReactElement<{
    children?: React.ReactNode;
  }>;
  const paraChildren = paraElement.props.children;

  if (!paraChildren) return children;

  let cleanedContent: React.ReactNode;

  if (typeof paraChildren === "string") {
    const cleaned = removeCalloutMarkerFromText(paraChildren, type);
    if (!cleaned) {
      return [...children.slice(0, paraIndex), ...children.slice(paraIndex + 1)];
    }
    cleanedContent = cleaned;
  } else if (Array.isArray(paraChildren)) {
    const firstText = paraChildren[0];
    if (typeof firstText === "string") {
      const cleaned = removeCalloutMarkerFromText(firstText, type);
      const newParaChildren = cleaned
        ? [cleaned, ...paraChildren.slice(1)]
        : paraChildren.slice(1);

      if (newParaChildren.length === 0) {
        return [...children.slice(0, paraIndex), ...children.slice(paraIndex + 1)];
      }
      cleanedContent = newParaChildren;
    } else {
      return children;
    }
  } else {
    return children;
  }

  const newPara = React.createElement(
    "p",
    { key: paraElement.key || "callout-content" },
    cleanedContent
  );
  return [
    ...children.slice(0, paraIndex),
    newPara,
    ...children.slice(paraIndex + 1),
  ];
}
