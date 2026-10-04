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

function foreground(hex: string, text: string): string {
  return `${fgAnsi(hex)}${text}\x1b[39m`;
}

function background(hex: string, text: string): string {
  return `${bgAnsi(hex)}${text}\x1b[49m`;
}

export const c = {
  appBg: (text: string) => background(theme.colors.background.app, text),
  editorBg: (text: string) => background(theme.colors.background.editor, text),
  sidebarBg: (text: string) => background(theme.colors.background.sidebar, text),
  selectedBg: (text: string) => background(theme.colors.surface.selected, text),
  primary: (text: string) => foreground(theme.colors.text.primary, text),
  terminal: (text: string) => foreground(theme.colors.text.terminal, text),
  secondary: (text: string) => foreground(theme.colors.text.secondary, text),
  muted: (text: string) => foreground(theme.colors.text.muted, text),
  strong: (text: string) => foreground(theme.colors.text.strong, text),
  accent: (text: string) => foreground(theme.colors.accent.DEFAULT, text),
  accentStrong: (text: string) => foreground(theme.colors.accent.strong, text),
  border: (text: string) => foreground(theme.colors.border.DEFAULT, text),
  borderSubtle: (text: string) => foreground(theme.colors.border.subtle, text),
  borderFocus: (text: string) => foreground(theme.colors.border.focus, text),
  activeDot: (text: string) => foreground(theme.colors.status.active, text),
  successDot: (text: string) => foreground(theme.colors.status.success, text),
  infoDot: (text: string) => foreground(theme.colors.status.info, text),
  warningDot: (text: string) => foreground(theme.colors.status.warning, text),
  errorDot: (text: string) => foreground(theme.colors.status.error, text),
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[22m`,
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
