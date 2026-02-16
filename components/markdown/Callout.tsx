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
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: "6px",
        padding: "12px 16px",
        margin: "16px 0",
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
          marginBottom: isCollapsed ? 0 : "8px",
          cursor: collapsible ? "pointer" : "default",
        }}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <Icon size={18} />
        <span>{displayTitle}</span>
        {collapsible && (
          <span style={{ marginLeft: "auto" }}>{isCollapsed ? "▶" : "▼"}</span>
        )}
      </div>
      {(!collapsible || !isCollapsed) && (
        <div className="callout-content" style={{ color: "var(--foreground)" }}>
          {content}
        </div>
      )}
    </div>
  );
}
