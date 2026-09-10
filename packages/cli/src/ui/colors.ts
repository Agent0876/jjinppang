/**
 * ANSI terminal styling and colors
 */
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright
  brightGreen: '\x1b[92m',
  brightCyan: '\x1b[96m',
  brightYellow: '\x1b[93m',
  brightMagenta: '\x1b[95m',
};

export const symbols = {
  check: `${colors.brightGreen}✔${colors.reset}`,
  cross: `${colors.red}✖${colors.reset}`,
  arrow: `${colors.cyan}❯${colors.reset}`,
  pointer: `${colors.brightYellow}⚡${colors.reset}`,
  bullet: `${colors.dim}•${colors.reset}`,
};
