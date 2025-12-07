"use client";

import { AppBar, Toolbar, Typography, Box, IconButton, Badge, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/AuthContext";

export function Header() {
  const t = useTranslations("app");
  const router = useRouter();
  const { isAuthenticated, userType, token } = useAuth();

  // Only fetch unread count for authenticated kids
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    isAuthenticated && userType === "kid" && token ? { token } : "skip"
  );

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
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {isAuthenticated && userType === "kid" && (
            <Tooltip title="Notifications">
              <IconButton
                onClick={() => router.push("/kid/notifications")}
                sx={{ color: "text.secondary" }}
              >
                <Badge
                  badgeContent={unreadCount || 0}
                  color="error"
                  max={99}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
