"use client";

import { IconButton, Tooltip } from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";
import { useThemeContext } from "@/theme/ThemeContext";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { mode, toggleTheme } = useThemeContext();
  const t = useTranslations("common");

  return (
    <Tooltip title={mode === "light" ? t("darkMode") : t("lightMode")}>
      <IconButton onClick={toggleTheme} color="inherit">
        {mode === "light" ? <DarkMode /> : <LightMode />}
      </IconButton>
    </Tooltip>
  );
}
