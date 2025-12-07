"use client";

import { createTheme } from "@mui/material/styles";

// Money n Play - Kid-friendly color palette
const colors = {
  // Primary - Friendly green (money/growth)
  primaryLight: "#4CAF50",
  primaryDark: "#81C784",

  // Secondary - Playful purple
  secondaryLight: "#7C4DFF",
  secondaryDark: "#B388FF",

  // Accent colors for gamification
  gold: "#FFD700",
  coinYellow: "#FFC107",
  success: "#00E676",
  warning: "#FF9800",
  error: "#FF5252",

  // Fun gradients will be added via CSS
};

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: colors.primaryLight,
      light: "#81C784",
      dark: "#388E3C",
      contrastText: "#ffffff",
    },
    secondary: {
      main: colors.secondaryLight,
      light: "#B388FF",
      dark: "#651FFF",
      contrastText: "#ffffff",
    },
    success: {
      main: colors.success,
    },
    warning: {
      main: colors.warning,
    },
    error: {
      main: colors.error,
    },
    background: {
      default: "#F5F7FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#2D3748",
      secondary: "#718096",
    },
  },
  typography: {
    fontFamily: "var(--font-geist-sans), 'Nunito', Arial, sans-serif",
    h1: {
      fontWeight: 800,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 24px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          },
        },
        contained: {
          background: "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.primaryDark,
      light: "#A5D6A7",
      dark: "#66BB6A",
      contrastText: "#000000",
    },
    secondary: {
      main: colors.secondaryDark,
      light: "#E1BEE7",
      dark: "#7C4DFF",
      contrastText: "#000000",
    },
    success: {
      main: colors.success,
    },
    warning: {
      main: colors.warning,
    },
    error: {
      main: colors.error,
    },
    background: {
      default: "#0D1117",
      paper: "#161B22",
    },
    text: {
      primary: "#E6EDF3",
      secondary: "#8B949E",
    },
  },
  typography: {
    fontFamily: "var(--font-geist-sans), 'Nunito', Arial, sans-serif",
    h1: {
      fontWeight: 800,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 24px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          },
        },
        contained: {
          background: "linear-gradient(135deg, #66BB6A 0%, #81C784 100%)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

// Export color constants for use in components
export const appColors = colors;
