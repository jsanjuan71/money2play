"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  IconButton,
  Chip,
} from "@mui/material";
import {
  AccountBalanceWallet,
  Savings,
  TrendingUp,
  Store,
  EmojiEvents,
  School,
  Face,
  ShoppingBag,
  Notifications,
  Logout,
  LocalFireDepartment,
  Star,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { CircularProgress } from "@mui/material";
import { Header } from "@/components/Header";

export default function KidDashboard() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, kid, logout, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated as kid
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Calculate XP progress to next level
  const xpForNextLevel = (kid?.level || 1) * 100;
  const xpProgress = ((kid?.xp || 0) % 100) / 100 * 100;

  const moneyZones = [
    {
      icon: <AccountBalanceWallet sx={{ fontSize: 40 }} />,
      title: t("kid.wallet"),
      description: "Your real money",
      color: "#4CAF50",
      href: "/kid/wallet",
    },
    {
      icon: <Savings sx={{ fontSize: 40 }} />,
      title: t("kid.savings"),
      description: "Save for goals",
      color: "#2196F3",
      href: "/kid/savings",
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      title: t("kid.investments"),
      description: "Learn to invest",
      color: "#9C27B0",
      href: "/kid/investments",
    },
    {
      icon: <Store sx={{ fontSize: 40 }} />,
      title: t("kid.marketplace"),
      description: "Trade with friends",
      color: "#FF9800",
      href: "/kid/marketplace",
    },
  ];

  const activities = [
    {
      icon: <EmojiEvents sx={{ fontSize: 40 }} />,
      title: t("kid.missions"),
      description: "Earn coins!",
      color: "#FFD700",
      href: "/kid/missions",
    },
    {
      icon: <School sx={{ fontSize: 40 }} />,
      title: t("kid.learn"),
      description: "Watch & learn",
      color: "#00BCD4",
      href: "/kid/learn",
    },
    {
      icon: <Face sx={{ fontSize: 40 }} />,
      title: t("kid.avatar"),
      description: "Customize",
      color: "#E91E63",
      href: "/kid/avatar",
    },
    {
      icon: <ShoppingBag sx={{ fontSize: 40 }} />,
      title: t("kid.shop"),
      description: "Spend coins",
      color: "#7C4DFF",
      href: "/kid/shop",
    },
  ];

  if (authLoading || !isAuthenticated || userType !== "kid") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="min-h-screen" sx={{ bgcolor: "background.default" }}>
      <Header />

      {/* Hero Section with Avatar and Stats */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #7C4DFF 0%, #B388FF 100%)",
          py: 4,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Left: Avatar and Name */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: "#FFD700",
                  fontSize: 50,
                  border: "4px solid white",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                }}
              >
                {kid?.name?.charAt(0).toUpperCase() || "K"}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="800">
                  Hey, {kid?.name}!
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Chip
                    icon={<Star sx={{ color: "#FFD700 !important" }} />}
                    label={`Level ${kid?.level || 1}`}
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                  <Chip
                    icon={<LocalFireDepartment sx={{ color: "#FF5722 !important" }} />}
                    label={`${kid?.streak || 0} day streak`}
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                </Box>
                {/* XP Progress */}
                <Box sx={{ mt: 2, width: 200 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption">XP</Typography>
                    <Typography variant="caption">
                      {kid?.xp || 0} / {xpForNextLevel}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={xpProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "rgba(255,255,255,0.2)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#FFD700",
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Right: Coins and Actions */}
            <Box sx={{ textAlign: "right" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
                <IconButton sx={{ color: "white" }}>
                  <Notifications />
                </IconButton>
                <IconButton sx={{ color: "white" }} onClick={handleLogout}>
                  <Logout />
                </IconButton>
              </Box>
              <Paper
                sx={{
                  p: 2,
                  mt: 1,
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  minWidth: 150,
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {t("kid.virtualCoins")}
                </Typography>
                <Typography variant="h4" fontWeight="800" sx={{ color: "#FFD700" }}>
                  {kid?.coins || 0}
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Money Zones */}
        <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>
          Money Zones
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {moneyZones.map((zone, index) => (
            <Grid size={{ xs: 6, sm: 6, md: 3 }} key={index}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: `0 8px 24px ${zone.color}40`,
                  },
                }}
                onClick={() => router.push(zone.href)}
              >
                <CardContent sx={{ textAlign: "center", p: 3 }}>
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: "50%",
                      bgcolor: `${zone.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      color: zone.color,
                    }}
                  >
                    {zone.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="600">
                    {zone.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {zone.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Activities */}
        <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>
          Activities
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {activities.map((activity, index) => (
            <Grid size={{ xs: 6, sm: 6, md: 3 }} key={index}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: `0 8px 24px ${activity.color}40`,
                  },
                }}
                onClick={() => router.push(activity.href)}
              >
                <CardContent sx={{ textAlign: "center", p: 3 }}>
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: "50%",
                      bgcolor: `${activity.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      color: activity.color,
                    }}
                  >
                    {activity.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="600">
                    {activity.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activity.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Daily Tip */}
        <Paper
          sx={{
            p: 3,
            background: "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box sx={{ fontSize: 60 }}>💡</Box>
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Money Tip of the Day
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Before you buy something, ask yourself: &quot;Do I really need this, or do I just want it?&quot;
              Waiting a day before buying can help you make better choices!
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
