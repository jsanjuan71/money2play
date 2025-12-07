"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Tabs,
  Tab,
  LinearProgress,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SavingsIcon from "@mui/icons-material/Savings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SchoolIcon from "@mui/icons-material/School";
import GroupIcon from "@mui/icons-material/Group";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import StarIcon from "@mui/icons-material/Star";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/Header";

type TabValue = "all" | "savings" | "investing" | "learning" | "social" | "streak" | "milestone";

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: "All", icon: <EmojiEventsIcon />, color: "#FFD700" },
  savings: { label: "Savings", icon: <SavingsIcon />, color: "#4CAF50" },
  investing: { label: "Investing", icon: <TrendingUpIcon />, color: "#2196F3" },
  learning: { label: "Learning", icon: <SchoolIcon />, color: "#9C27B0" },
  social: { label: "Social", icon: <GroupIcon />, color: "#FF9800" },
  streak: { label: "Streak", icon: <LocalFireDepartmentIcon />, color: "#F44336" },
  milestone: { label: "Milestone", icon: <StarIcon />, color: "#673AB7" },
};

const rarityColors: Record<number, { bg: string; border: string; glow: string }> = {
  0: { bg: "linear-gradient(135deg, #78909C 0%, #546E7A 100%)", border: "#90A4AE", glow: "none" },
  1: { bg: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)", border: "#66BB6A", glow: "0 0 20px rgba(76, 175, 80, 0.3)" },
  2: { bg: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)", border: "#42A5F5", glow: "0 0 20px rgba(33, 150, 243, 0.4)" },
  3: { bg: "linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)", border: "#AB47BC", glow: "0 0 25px rgba(156, 39, 176, 0.5)" },
  4: { bg: "linear-gradient(135deg, #FFD700 0%, #FFA000 100%)", border: "#FFCA28", glow: "0 0 30px rgba(255, 215, 0, 0.6)" },
};

const getAchievementRarity = (coinReward: number): number => {
  if (coinReward >= 400) return 4; // Legendary
  if (coinReward >= 200) return 3; // Epic
  if (coinReward >= 100) return 2; // Rare
  if (coinReward >= 50) return 1; // Uncommon
  return 0; // Common
};

export default function AchievementsPage() {
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabValue>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const achievementProgress = useQuery(
    api.achievements.getAchievementProgress,
    token ? { token } : "skip"
  );

  const checkAchievements = useMutation(api.achievements.checkAchievements);

  const handleCheckAchievements = async () => {
    if (!token) return;
    setChecking(true);
    try {
      const result = await checkAchievements({ token });
      if (result.newAchievements.length > 0) {
        // Show the first newly unlocked achievement
        setSelectedAchievement({
          ...result.newAchievements[0],
          isUnlocked: true,
          justUnlocked: true,
        });
        setDetailsOpen(true);
      }
    } catch (error) {
      console.error("Error checking achievements:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleOpenDetails = (achievement: any) => {
    setSelectedAchievement(achievement);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedAchievement(null);
  };

  const filteredAchievements = achievementProgress?.achievements.filter((a) => {
    if (tab === "all") return true;
    return a.category === tab;
  });

  if (authLoading || !isAuthenticated || userType !== "kid") {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Skeleton variant="rectangular" width="100%" height="100vh" />
      </Box>
    );
  }

  return (
    <Box className="min-h-screen" sx={{ bgcolor: "background.default" }}>
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #FFD700 0%, #FFA000 100%)",
          py: 4,
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/kid")}
            sx={{ color: "white", mb: 2 }}
          >
            Back to Dashboard
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: "rgba(255,255,255,0.2)",
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 36 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ color: "white", fontWeight: "bold" }}>
                Achievements
              </Typography>
              <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.9)" }}>
                Collect badges and earn rewards!
              </Typography>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.95)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
                  {achievementProgress?.stats.unlocked || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unlocked
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.95)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "grey.600" }}>
                  {achievementProgress?.stats.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.95)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "warning.main" }}>
                  {achievementProgress?.stats.totalCoinsEarned || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Coins Earned
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.95)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "success.main" }}>
                  {achievementProgress?.stats.percentage || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completion
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Check for New Achievements Button */}
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              variant="contained"
              color="inherit"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleCheckAchievements}
              disabled={checking}
              sx={{
                bgcolor: "white",
                color: "warning.dark",
                fontWeight: "bold",
                "&:hover": { bgcolor: "grey.100" },
              }}
            >
              {checking ? "Checking..." : "Check for New Achievements"}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Category Tabs */}
      <Container maxWidth="lg" sx={{ mt: -2 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            mb: 3,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                minHeight: 64,
                textTransform: "none",
              },
            }}
          >
            {Object.entries(categoryConfig).map(([key, config]) => (
              <Tab
                key={key}
                value={key}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: tab === key ? config.color : "grey.200",
                        color: tab === key ? "white" : "grey.600",
                      }}
                    >
                      {config.icon}
                    </Avatar>
                    <Typography variant="body2">{config.label}</Typography>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Paper>

        {/* Achievements Grid */}
        {!achievementProgress ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredAchievements?.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              borderRadius: 3,
              textAlign: "center",
              background: "linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)",
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No achievements in this category yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep playing to unlock new achievements!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2} sx={{ pb: 4 }}>
            {filteredAchievements?.map((achievement) => {
              const rarity = getAchievementRarity(achievement.coinReward);
              const rarityStyle = rarityColors[rarity];
              const config = categoryConfig[achievement.category];

              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={achievement._id}>
                  <Card
                    elevation={0}
                    onClick={() => handleOpenDetails(achievement)}
                    sx={{
                      borderRadius: 3,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "visible",
                      transition: "all 0.3s ease",
                      border: achievement.isUnlocked
                        ? `2px solid ${rarityStyle.border}`
                        : "2px solid transparent",
                      boxShadow: achievement.isUnlocked ? rarityStyle.glow : "none",
                      opacity: achievement.isUnlocked ? 1 : 0.7,
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: achievement.isUnlocked
                          ? `${rarityStyle.glow}, 0 8px 25px rgba(0,0,0,0.15)`
                          : "0 8px 25px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    {/* Badge Icon */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        pt: 3,
                        pb: 1,
                      }}
                    >
                      <Badge
                        badgeContent={
                          achievement.isUnlocked ? (
                            <CheckCircleIcon sx={{ fontSize: 20, color: "success.main" }} />
                          ) : null
                        }
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      >
                        <Avatar
                          sx={{
                            width: 72,
                            height: 72,
                            background: achievement.isUnlocked
                              ? rarityStyle.bg
                              : "linear-gradient(135deg, #9E9E9E 0%, #757575 100%)",
                            boxShadow: achievement.isUnlocked
                              ? "0 4px 15px rgba(0,0,0,0.2)"
                              : "none",
                          }}
                        >
                          {achievement.isUnlocked ? (
                            config.icon
                          ) : (
                            <LockIcon sx={{ fontSize: 32 }} />
                          )}
                        </Avatar>
                      </Badge>
                    </Box>

                    <CardContent sx={{ textAlign: "center", pt: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: "bold",
                          mb: 0.5,
                          color: achievement.isUnlocked ? "text.primary" : "text.secondary",
                        }}
                        noWrap
                      >
                        {achievement.name}
                      </Typography>

                      {!achievement.isUnlocked && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={achievement.progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "grey.200",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                                bgcolor: config.color,
                              },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {achievement.currentValue} / {achievement.targetValue}
                          </Typography>
                        </Box>
                      )}

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        <Chip
                          icon={<MonetizationOnIcon sx={{ fontSize: 14 }} />}
                          label={`+${achievement.coinReward}`}
                          size="small"
                          sx={{
                            bgcolor: "warning.light",
                            color: "warning.dark",
                            fontWeight: "bold",
                            fontSize: "0.7rem",
                          }}
                        />
                        <Chip
                          label={`+${achievement.xpReward} XP`}
                          size="small"
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.dark",
                            fontWeight: "bold",
                            fontSize: "0.7rem",
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* Achievement Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "visible" },
        }}
      >
        {selectedAchievement && (
          <>
            <Box
              sx={{
                background: selectedAchievement.isUnlocked
                  ? rarityColors[getAchievementRarity(selectedAchievement.coinReward)].bg
                  : "linear-gradient(135deg, #9E9E9E 0%, #757575 100%)",
                py: 4,
                textAlign: "center",
                position: "relative",
              }}
            >
              <IconButton
                onClick={handleCloseDetails}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  color: "white",
                }}
              >
                <CloseIcon />
              </IconButton>

              {selectedAchievement.justUnlocked && (
                <Typography
                  variant="overline"
                  sx={{
                    color: "white",
                    bgcolor: "rgba(0,0,0,0.3)",
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    display: "inline-block",
                    mb: 2,
                  }}
                >
                  NEW ACHIEVEMENT UNLOCKED!
                </Typography>
              )}

              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  mx: "auto",
                  bgcolor: "rgba(255,255,255,0.2)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                }}
              >
                {selectedAchievement.isUnlocked ? (
                  categoryConfig[selectedAchievement.category]?.icon
                ) : (
                  <LockIcon sx={{ fontSize: 48 }} />
                )}
              </Avatar>

              <Typography
                variant="h5"
                sx={{ color: "white", fontWeight: "bold", mt: 2 }}
              >
                {selectedAchievement.name}
              </Typography>

              <Chip
                label={categoryConfig[selectedAchievement.category]?.label}
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                }}
              />
            </Box>

            <DialogContent sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {selectedAchievement.description}
              </Typography>

              {selectedAchievement.isUnlocked ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Unlocked on{" "}
                    {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{ p: 2, bgcolor: "warning.50", borderRadius: 2 }}
                    >
                      <MonetizationOnIcon color="warning" />
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        +{selectedAchievement.coinReward}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Coins
                      </Typography>
                    </Paper>
                    <Paper
                      elevation={0}
                      sx={{ p: 2, bgcolor: "primary.50", borderRadius: 2 }}
                    >
                      <StarIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        +{selectedAchievement.xpReward}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        XP
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Progress: {selectedAchievement.currentValue} /{" "}
                    {selectedAchievement.targetValue}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={selectedAchievement.progress}
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      bgcolor: "grey.200",
                      mb: 2,
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 6,
                        bgcolor: categoryConfig[selectedAchievement.category]?.color,
                      },
                    }}
                  />
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {selectedAchievement.progress}%
                  </Typography>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button fullWidth variant="contained" onClick={handleCloseDetails}>
                {selectedAchievement.isUnlocked ? "Awesome!" : "Keep Going!"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
