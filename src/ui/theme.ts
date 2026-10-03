export const theme = {
  colors: {
    background: {
      app: "#FDF7E9",
      editor: "#FDF6E3",
      sidebar: "#EEE8D5",
      raised: "#F4EDDA",
    },
    surface: {
      1: "#F4EDDA",
      2: "#EEE8D5",
      3: "#E6DEC8",
      code: "#E0DDD8",
      selected: "#EFE4EE",
      selectedStrong: "#D6B5F2",
    },
    border: {
      subtle: "#E6DEC8",
      DEFAULT: "#DCD7C6",
      strong: "#CDCCCC",
      focus: "#8E43EF",
    },
    text: {
      primary: "#4C5575",
      terminal: "#657B83",
      secondary: "#6A7E84",
      muted: "#A5A6B0",
      strong: "#271850",
      onAccent: "#FFFFFF",
    },
    accent: {
      soft: "#D6B5F2",
      hover: "#A46BE7",
      DEFAULT: "#8E43EF",
      strong: "#7C25EE",
      tint: "#EFE4EE",
    },
    status: {
      active: "#E8D95E",
      ready: "#8E9D13",
      success: "#55A86B",
      info: "#2E9B97",
      warning: "#DA7C5D",
      error: "#E34A43",
    },
  },
};

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function fgAnsi(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
}

export function bgAnsi(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `\x1b[48;2;${r};${g};${b}m`;
}

export const ANSI_RESET = "\x1b[0m";

export const c = {
  appBg: (text: string) => `${bgAnsi(theme.colors.background.app)}${text}${ANSI_RESET}`,
  editorBg: (text: string) => `${bgAnsi(theme.colors.background.editor)}${text}${ANSI_RESET}`,
  sidebarBg: (text: string) => `${bgAnsi(theme.colors.background.sidebar)}${text}${ANSI_RESET}`,
  selectedBg: (text: string) => `${bgAnsi(theme.colors.surface.selected)}${text}${ANSI_RESET}`,
  primary: (text: string) => `${fgAnsi(theme.colors.text.primary)}${text}${ANSI_RESET}`,
  terminal: (text: string) => `${fgAnsi(theme.colors.text.terminal)}${text}${ANSI_RESET}`,
  secondary: (text: string) => `${fgAnsi(theme.colors.text.secondary)}${text}${ANSI_RESET}`,
  muted: (text: string) => `${fgAnsi(theme.colors.text.muted)}${text}${ANSI_RESET}`,
  strong: (text: string) => `${fgAnsi(theme.colors.text.strong)}${text}${ANSI_RESET}`,
  accent: (text: string) => `${fgAnsi(theme.colors.accent.DEFAULT)}${text}${ANSI_RESET}`,
  accentStrong: (text: string) => `${fgAnsi(theme.colors.accent.strong)}${text}${ANSI_RESET}`,
  border: (text: string) => `${fgAnsi(theme.colors.border.DEFAULT)}${text}${ANSI_RESET}`,
  borderSubtle: (text: string) => `${fgAnsi(theme.colors.border.subtle)}${text}${ANSI_RESET}`,
  borderFocus: (text: string) => `${fgAnsi(theme.colors.border.focus)}${text}${ANSI_RESET}`,
  activeDot: (text: string) => `${fgAnsi(theme.colors.status.active)}${text}${ANSI_RESET}`,
  successDot: (text: string) => `${fgAnsi(theme.colors.status.success)}${text}${ANSI_RESET}`,
  infoDot: (text: string) => `${fgAnsi(theme.colors.status.info)}${text}${ANSI_RESET}`,
  warningDot: (text: string) => `${fgAnsi(theme.colors.status.warning)}${text}${ANSI_RESET}`,
  errorDot: (text: string) => `${fgAnsi(theme.colors.status.error)}${text}${ANSI_RESET}`,
  bold: (text: string) => `\x1b[1m${text}${ANSI_RESET}`,
  dim: (text: string) => `\x1b[2m${text}${ANSI_RESET}`,
};

export class TerminalThemeManager {
  private applied = false;

  constructor(private terminal: { write(data: string): void } = process.stdout) {}

  applyTheme(): void {
    if (this.applied) return;
    const bg = hexToRgb(theme.colors.background.app);
    const fg = hexToRgb(theme.colors.text.primary);
    const bgSeq = `\x1b]11;rgb:${bg.r.toString(16).padStart(2, "0")}/${bg.g.toString(16).padStart(2, "0")}/${bg.b.toString(16).padStart(2, "0")}\x07`;
    const fgSeq = `\x1b]10;rgb:${fg.r.toString(16).padStart(2, "0")}/${fg.g.toString(16).padStart(2, "0")}/${fg.b.toString(16).padStart(2, "0")}\x07`;
    this.terminal.write(bgSeq + fgSeq);
    this.applied = true;
  }

  restoreTheme(): void {
    if (!this.applied) return;
    this.terminal.write("\x1b]111\x07\x1b]110\x07");
    this.applied = false;
  }
}
