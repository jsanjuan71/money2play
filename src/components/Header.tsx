"use client";

import { AppBar, Toolbar, Typography, Box } from "@mui/material";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function Header() {
  const t = useTranslations("app");

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(135deg, #4CAF50 0%, #7C4DFF 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              cursor: "pointer",
            }}
          >
            {t("name")}
          </Typography>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: "flex", gap: 1 }}>
          <LanguageSwitcher />
          <ThemeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
