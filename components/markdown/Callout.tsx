"use client";

import React, { useState } from "react";
import {
  CALLOUT_TYPES,
  removeCalloutMarker,
  ParsedCallout,
} from "./callout-utils";

interface CalloutProps extends ParsedCallout {
  children: React.ReactNode;
}

export function Callout({
  type,
  title,
  children,
  collapsible,
  collapsed: initialCollapsed,
}: CalloutProps) {
  const config = CALLOUT_TYPES[type] || CALLOUT_TYPES.note;
  const Icon = config.icon;
  const displayTitle = title || type.charAt(0).toUpperCase() + type.slice(1);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const content = removeCalloutMarker(children, type);

  return (
    <div
      className="callout"
      style={{
        backgroundColor: config.bgColor,
        borderLeft: `2px solid ${config.borderColor}`,
        borderRadius: "4px",
        padding: "10px 14px",
        margin: "1.25em 0",
      }}
    >
      <div
        className="callout-title"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: config.color,
          fontWeight: 600,
          fontSize: "0.875em",
          letterSpacing: "0.005em",
          marginBottom: isCollapsed ? 0 : "6px",
          cursor: collapsible ? "pointer" : "default",
          userSelect: collapsible ? "none" : "auto",
        }}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <Icon size={16} style={{ flexShrink: 0 }} />
        <span>{displayTitle}</span>
        {collapsible && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.75em",
              opacity: 0.6,
              transition: "transform 0.15s ease",
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            }}
          >
            &#9660;
          </span>
        )}
      </div>
      {(!collapsible || !isCollapsed) && (
        <div
          className="callout-content"
          style={{
            color: "var(--foreground)",
            fontSize: "0.9375em",
            lineHeight: 1.65,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
