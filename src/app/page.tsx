"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  AccountBalance,
  SavingsOutlined,
  EmojiEvents,
  School,
  FamilyRestroom,
  ChildCare,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, isLoading } = useAuth();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (userType === "parent") {
        router.push("/parent");
      } else if (userType === "kid") {
        router.push("/kid");
      }
    }
  }, [isAuthenticated, userType, isLoading, router]);

  const features = [
    {
      icon: <AccountBalance sx={{ fontSize: 40 }} />,
      title: "Real Money Management",
      description: "Parents add real money, kids learn to manage it wisely",
    },
    {
      icon: <SavingsOutlined sx={{ fontSize: 40 }} />,
      title: "Savings Goals",
      description: "Set goals, track progress, celebrate achievements",
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40 }} />,
      title: "Missions & Rewards",
      description: "Complete challenges, earn coins, level up",
    },
    {
      icon: <School sx={{ fontSize: 40 }} />,
      title: "Financial Education",
      description: "Fun videos and stories about money",
    },
  ];

  return (
    <Box className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #4CAF50 0%, #81C784 50%, #7C4DFF 100%)",
          py: { xs: 8, md: 12 },
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h2"
                component="h1"
                fontWeight="800"
                gutterBottom
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
              >
                {t("home.title")}
              </Typography>
              <Typography
                variant="h5"
                sx={{ mb: 4, opacity: 0.95 }}
              >
                {t("home.subtitle")}
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 4, opacity: 0.9, fontSize: "1.1rem" }}
              >
                {t("home.description")}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => router.push("/auth?mode=register")}
                  sx={{
                    bgcolor: "white",
                    color: "primary.main",
                    "&:hover": { bgcolor: "grey.100" },
                    px: 4,
                    py: 1.5,
                  }}
                >
                  {t("common.getStarted")}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push("/auth")}
                  sx={{
                    borderColor: "white",
                    color: "white",
                    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                    px: 4,
                    py: 1.5,
                  }}
                >
                  {t("auth.login")}
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {/* Mascot placeholder - happy cash character */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: 300,
                }}
              >
                <Box
                  sx={{
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    bgcolor: "#FFD700",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                    fontSize: "100px",
                  }}
                >
                  💵
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          component="h2"
          textAlign="center"
          fontWeight="700"
          gutterBottom
          sx={{ mb: 6 }}
        >
          Learn Money Skills Through Play
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card
                sx={{
                  height: "100%",
                  textAlign: "center",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-8px)" },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ color: "primary.main", mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* For Parents & Kids Section */}
      <Box sx={{ bgcolor: "background.paper", py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  p: 4,
                  height: "100%",
                  background: "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <FamilyRestroom sx={{ fontSize: 40, color: "primary.main" }} />
                  <Typography variant="h5" fontWeight="700">
                    {t("home.forParents")}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {t("home.parentFeatures")}
                </Typography>
                <Button
                  variant="contained"
                  sx={{ mt: 3 }}
                  onClick={() => router.push("/auth?mode=register")}
                >
                  Create Parent Account
                </Button>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  p: 4,
                  height: "100%",
                  background: "linear-gradient(135deg, #EDE7F6 0%, #D1C4E9 100%)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <ChildCare sx={{ fontSize: 40, color: "secondary.main" }} />
                  <Typography variant="h5" fontWeight="700">
                    {t("home.forKids")}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {t("home.kidFeatures")}
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  sx={{ mt: 3 }}
                  onClick={() => router.push("/auth?type=kid")}
                >
                  Kid Login
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: "background.default", py: 4 }}>
        <Container>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Money n Play - Teaching kids financial literacy through fun
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
