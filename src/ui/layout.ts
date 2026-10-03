import { visibleWidth, truncateToWidth, stripTerminalSequences } from "@earendil-works/pi-tui";
import { c, theme } from "./theme.js";

export interface ShellLayoutGeometry {
  width: number;
  height: number;
  isWide: boolean;
  isCompact: boolean;
  headerHeight: number;
  tabsHeight: number;
  composerHeight: number;
  footerHeight: number;
  sidebarWidth: number;
  contextWidth: number;
  centerWidth: number;
  centerHeight: number;
}

export function computeShellLayout(width: number, height: number): ShellLayoutGeometry {
  const isWide = width >= 110;
  const isMedium = width >= 96 && width < 110;
  const isCompact = width < 96;

  let sidebarWidth = 0;
  let contextWidth = 0;

  if (isWide) {
    sidebarWidth = 26;
    contextWidth = 32;
  } else if (isMedium) {
    sidebarWidth = 24;
    contextWidth = 0;
  } else {
    sidebarWidth = 0;
    contextWidth = 0;
  }

  const centerWidth = Math.max(1, width - sidebarWidth - contextWidth);
  const headerHeight = 3;
  const tabsHeight = 3;
  const composerHeight = 3;
  const footerHeight = 3;
  const centerHeight = Math.max(1, height - headerHeight - tabsHeight - composerHeight - footerHeight);

  return {
    width,
    height,
    isWide,
    isCompact,
    headerHeight,
    tabsHeight,
    composerHeight,
    footerHeight,
    sidebarWidth,
    contextWidth,
    centerWidth,
    centerHeight,
  };
}

export interface BoxFrameOptions {
  width: number;
  height?: number;
  title?: string;
  rightBadge?: string;
  borderColor?: (text: string) => string;
  titleColor?: (text: string) => string;
  badgeColor?: (text: string) => string;
  bgFn?: (text: string) => string;
  lines: string[];
}

export function padToWidth(line: string, width: number, bgFn?: (text: string) => string): string {
  const current = visibleWidth(line);
  if (current >= width) {
    const truncated = truncateToWidth(line, width);
    return bgFn ? bgFn(truncated) : truncated;
  }
  const padded = line + " ".repeat(width - current);
  return bgFn ? bgFn(padded) : padded;
}

export function renderBoxFrame(options: BoxFrameOptions): string[] {
  const {
    width,
    title,
    rightBadge,
    borderColor = c.border,
    titleColor = c.strong,
    badgeColor = c.secondary,
    bgFn = c.appBg,
    lines,
  } = options;

  if (width < 4) {
    return lines.map((l) => padToWidth(l, width, bgFn));
  }

  const innerWidth = width - 2;
  const result: string[] = [];

  // Top border: ┌ [title] ─── [rightBadge] ┐
  let topInner = "";
  if (title && rightBadge) {
    const titlePart = ` ${titleColor(title)} `;
    const badgePart = ` ${badgeColor(rightBadge)} `;
    const titleVis = visibleWidth(titlePart);
    const badgeVis = visibleWidth(badgePart);
    const ruleLen = Math.max(0, innerWidth - titleVis - badgeVis);
    topInner = titlePart + borderColor("─".repeat(ruleLen)) + badgePart;
  } else if (title) {
    const titlePart = ` ${titleColor(title)} `;
    const titleVis = visibleWidth(titlePart);
    const ruleLen = Math.max(0, innerWidth - titleVis);
    topInner = titlePart + borderColor("─".repeat(ruleLen));
  } else if (rightBadge) {
    const badgePart = ` ${badgeColor(rightBadge)} `;
    const badgeVis = visibleWidth(badgePart);
    const ruleLen = Math.max(0, innerWidth - badgeVis);
    topInner = borderColor("─".repeat(ruleLen)) + badgePart;
  } else {
    topInner = borderColor("─".repeat(innerWidth));
  }

  // Ensure top line matches innerWidth
  const topVis = visibleWidth(topInner);
  if (topVis < innerWidth) {
    topInner += borderColor("─".repeat(innerWidth - topVis));
  } else if (topVis > innerWidth) {
    topInner = truncateToWidth(topInner, innerWidth);
  }

  result.push(bgFn(borderColor("┌") + topInner + borderColor("┐")));

  // Content lines
  for (const line of lines) {
    const plain = stripTerminalSequences(line);
    if (plain.startsWith("├") && plain.endsWith("┤")) {
      result.push(line);
      continue;
    }
    const lineVis = visibleWidth(line);
    let rowInner = line;
    if (lineVis < innerWidth) {
      rowInner = line + " ".repeat(innerWidth - lineVis);
    } else if (lineVis > innerWidth) {
      rowInner = truncateToWidth(line, innerWidth);
    }
    result.push(bgFn(borderColor("│") + rowInner + borderColor("│")));
  }

  // If height was specified, pad or truncate
  if (options.height !== undefined) {
    const targetContentLines = Math.max(0, options.height - 2);
    while (result.length - 1 < targetContentLines) {
      result.push(bgFn(borderColor("│") + " ".repeat(innerWidth) + borderColor("│")));
    }
    if (result.length - 1 > targetContentLines) {
      result.length = targetContentLines + 1;
    }
  }

  // Bottom border: └────────────┘
  const bottomInner = borderColor("─".repeat(innerWidth));
  result.push(bgFn(borderColor("└") + bottomInner + borderColor("┘")));

  return result;
}

export function renderDivider(
  width: number,
  title?: string,
  rightBadge?: string,
  options: {
    borderColor?: (text: string) => string;
    titleColor?: (text: string) => string;
    badgeColor?: (text: string) => string;
    bgFn?: (text: string) => string;
  } = {}
): string {
  const {
    borderColor = c.border,
    titleColor = c.strong,
    badgeColor = c.secondary,
    bgFn = c.appBg,
  } = options;

  if (width < 4) {
    return padToWidth(borderColor("─".repeat(width)), width, bgFn);
  }

  const innerWidth = width - 2;
  let inner = "";

  if (title && rightBadge) {
    const titlePart = ` ${titleColor(title)} `;
    const badgePart = ` ${badgeColor(rightBadge)} `;
    const titleVis = visibleWidth(titlePart);
    const badgeVis = visibleWidth(badgePart);
    const ruleLen = Math.max(0, innerWidth - titleVis - badgeVis);
    inner = titlePart + borderColor("─".repeat(ruleLen)) + badgePart;
  } else if (title) {
    const titlePart = ` ${titleColor(title)} `;
    const titleVis = visibleWidth(titlePart);
    const ruleLen = Math.max(0, innerWidth - titleVis);
    inner = titlePart + borderColor("─".repeat(ruleLen));
  } else if (rightBadge) {
    const badgePart = ` ${badgeColor(rightBadge)} `;
    const badgeVis = visibleWidth(badgePart);
    const ruleLen = Math.max(0, innerWidth - badgeVis);
    inner = borderColor("─".repeat(ruleLen)) + badgePart;
  } else {
    inner = borderColor("─".repeat(innerWidth));
  }

  const innerVis = visibleWidth(inner);
  if (innerVis < innerWidth) {
    inner += borderColor("─".repeat(innerWidth - innerVis));
  } else if (innerVis > innerWidth) {
    inner = truncateToWidth(inner, innerWidth);
  }

  return bgFn(borderColor("├") + inner + borderColor("┤"));
}
