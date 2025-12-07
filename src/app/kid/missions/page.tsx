"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Alert,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  ArrowBack,
  EmojiEvents,
  PlayArrow,
  CheckCircle,
  AccessTime,
  Star,
  TrendingUp,
  School,
  Savings,
  Storefront,
  CalendarToday,
  Psychology,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function KidMissionsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, kid, isLoading: authLoading } = useAuth();

  // Fetch data
  const availableMissions = useQuery(
    api.missions.getAvailableMissions,
    token ? { token } : "skip"
  );
  const activeMissions = useQuery(
    api.missions.getActiveMissions,
    token ? { token } : "skip"
  );
  const completedMissions = useQuery(
    api.missions.getCompletedMissions,
    token ? { token } : "skip"
  );
  const stats = useQuery(
    api.missions.getMissionStats,
    token ? { token } : "skip"
  );

  // Mutations
  const startMutation = useMutation(api.missions.startMission);
  const completeMutation = useMutation(api.missions.completeMission);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated as kid
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const getMissionTypeIcon = (type: string) => {
    switch (type) {
      case "daily":
        return <CalendarToday />;
      case "savings":
        return <Savings />;
      case "investment":
        return <TrendingUp />;
      case "learning":
        return <School />;
      case "decision":
        return <Psychology />;
      case "social":
        return <Storefront />;
      default:
        return <Star />;
    }
  };

  const getMissionTypeLabel = (type: string) => {
    switch (type) {
      case "daily":
        return "Daily";
      case "savings":
        return "Savings";
      case "investment":
        return "Investment";
      case "learning":
        return "Learning";
      case "decision":
        return "Decision";
      case "social":
        return "Social";
      default:
        return type;
    }
  };

  const getMissionTypeColor = (type: string) => {
    switch (type) {
      case "daily":
        return "#FF9800";
      case "savings":
        return "#4CAF50";
      case "investment":
        return "#9C27B0";
      case "learning":
        return "#2196F3";
      case "decision":
        return "#00BCD4";
      case "social":
        return "#E91E63";
      default:
        return "#9E9E9E";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "error";
      default:
        return "default";
    }
  };

  const handleStartMission = async (missionId: Id<"missions">) => {
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      await startMutation({ token, missionId });
      setSuccess("Mission started! Good luck!");
      setDetailDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start mission");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMission = async (missionId: Id<"missions">) => {
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      const result = await completeMutation({ token, missionId });
      setSuccess(`Mission complete! Earned ${result.coinReward} coins and ${result.xpReward} XP!`);
      setDetailDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete mission");
    } finally {
      setLoading(false);
    }
  };

  const renderMissionCard = (mission: any, showActions = true) => {
    const isActive = mission.status === "in_progress";
    const isCompleted = mission.status === "completed";

    return (
      <Card
        key={mission._id}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: isCompleted
            ? "2px solid #4CAF50"
            : isActive
            ? "2px solid #2196F3"
            : "1px solid",
          borderColor: isCompleted
            ? "#4CAF50"
            : isActive
            ? "#2196F3"
            : "divider",
          opacity: isCompleted ? 0.8 : 1,
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: getMissionTypeColor(mission.type) + "22",
                color: getMissionTypeColor(mission.type),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {getMissionTypeIcon(mission.type)}
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Chip
                size="small"
                label={getMissionTypeLabel(mission.type)}
                sx={{
                  bgcolor: getMissionTypeColor(mission.type),
                  color: "white",
                  fontWeight: 600,
                }}
              />
              <Chip
                size="small"
                label={mission.difficulty}
                color={getDifficultyColor(mission.difficulty) as any}
              />
            </Box>
          </Box>

          <Typography variant="h6" fontWeight="600" gutterBottom>
            {mission.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {mission.description}
          </Typography>

          {/* Progress bar for active missions */}
          {isActive && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="caption" fontWeight="600">
                  {mission.progressPercent}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={mission.progressPercent}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Rewards */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2">🪙</Typography>
              <Typography variant="body2" fontWeight="600">
                {mission.coinReward}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2">⭐</Typography>
              <Typography variant="body2" fontWeight="600">
                {mission.xpReward} XP
              </Typography>
            </Box>
          </Box>

          {/* Level requirement */}
          {mission.requirements?.minLevel && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Requires Level {mission.requirements.minLevel}
            </Typography>
          )}
        </CardContent>

        {showActions && (
          <CardActions>
            {isCompleted ? (
              <Button fullWidth disabled startIcon={<CheckCircle />} color="success">
                Completed
              </Button>
            ) : isActive ? (
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  setSelectedMission(mission);
                  setDetailDialogOpen(true);
                }}
              >
                View Progress
              </Button>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PlayArrow />}
                onClick={() => {
                  setSelectedMission(mission);
                  setDetailDialogOpen(true);
                }}
              >
                Start Mission
              </Button>
            )}
          </CardActions>
        )}
      </Card>
    );
  };

  if (authLoading || !isAuthenticated || userType !== "kid") {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="min-h-screen" sx={{ bgcolor: "background.default" }}>
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #FF6B35 0%, #FFB347 100%)",
          py: 4,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.push("/kid")} sx={{ color: "white" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" fontWeight="700">
              Missions
            </Typography>
            <EmojiEvents />
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {kid?.level || 1}
                </Typography>
                <Typography variant="caption">Level</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {kid?.xp || 0}
                </Typography>
                <Typography variant="caption">Total XP</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {stats?.completedCount || 0}
                </Typography>
                <Typography variant="caption">Completed</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {stats?.totalCoinsEarned || 0}
                </Typography>
                <Typography variant="caption">Coins Earned</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* XP Progress to next level */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2">
                Level {kid?.level || 1}
              </Typography>
              <Typography variant="body2">
                {(kid?.xp || 0) % 100}/100 XP to Level {(kid?.level || 1) + 1}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(kid?.xp || 0) % 100}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: "rgba(255,255,255,0.3)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "white",
                },
              }}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Available</span>
                <Chip
                  size="small"
                  label={availableMissions?.filter((m) => m.status === "available").length || 0}
                  color="primary"
                />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>In Progress</span>
                <Chip
                  size="small"
                  label={activeMissions?.length || 0}
                  color="info"
                />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Completed</span>
                <Chip
                  size="small"
                  label={completedMissions?.length || 0}
                  color="success"
                />
              </Box>
            }
          />
        </Tabs>

        {/* Available Missions */}
        <TabPanel value={tabValue} index={0}>
          {!availableMissions || availableMissions.filter((m) => m.status === "available").length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <EmojiEvents sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No new missions available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete your current missions or check back later!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {availableMissions
                .filter((m) => m.status === "available")
                .map((mission) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={mission._id}>
                    {renderMissionCard(mission)}
                  </Grid>
                ))}
            </Grid>
          )}
        </TabPanel>

        {/* Active Missions */}
        <TabPanel value={tabValue} index={1}>
          {!activeMissions || activeMissions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <AccessTime sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No missions in progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a mission from the Available tab!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {activeMissions.map((mission) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={mission._id}>
                  {renderMissionCard(mission)}
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Completed Missions */}
        <TabPanel value={tabValue} index={2}>
          {!completedMissions || completedMissions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <CheckCircle sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No completed missions yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete missions to see them here!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {completedMissions.map((mission) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={mission._id}>
                  {renderMissionCard(mission, false)}
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Mission Tips */}
        <Paper
          sx={{
            p: 3,
            mt: 4,
            background: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box sx={{ fontSize: 50 }}>🎯</Box>
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Mission Tips
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete <strong>daily missions</strong> every day to build a streak and earn bonus rewards!
              Harder missions give more coins and XP. Level up by earning XP to unlock new missions!
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Mission Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedMission && (
          <>
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: getMissionTypeColor(selectedMission.type) + "22",
                    color: getMissionTypeColor(selectedMission.type),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getMissionTypeIcon(selectedMission.type)}
                </Box>
                <Box>
                  <Typography variant="h6">{selectedMission.title}</Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Chip
                      size="small"
                      label={getMissionTypeLabel(selectedMission.type)}
                      sx={{
                        bgcolor: getMissionTypeColor(selectedMission.type),
                        color: "white",
                      }}
                    />
                    <Chip
                      size="small"
                      label={selectedMission.difficulty}
                      color={getDifficultyColor(selectedMission.difficulty) as any}
                    />
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedMission.description}
              </Typography>

              {/* Progress for active missions */}
              {selectedMission.status === "in_progress" && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Your Progress
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={selectedMission.progressPercent}
                      sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="body2" fontWeight="600">
                      {selectedMission.progressPercent}%
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Rewards */}
              <Paper sx={{ p: 2, bgcolor: "action.hover" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Rewards
                </Typography>
                <Box sx={{ display: "flex", gap: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h5">🪙</Typography>
                    <Box>
                      <Typography variant="h6" fontWeight="700">
                        {selectedMission.coinReward}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Coins
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h5">⭐</Typography>
                    <Box>
                      <Typography variant="h6" fontWeight="700">
                        {selectedMission.xpReward}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        XP
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
              {selectedMission.status === "available" && (
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => handleStartMission(selectedMission._id)}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : "Start Mission"}
                </Button>
              )}
              {selectedMission.status === "in_progress" && selectedMission.progressPercent >= 100 && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => handleCompleteMission(selectedMission._id)}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : "Claim Reward"}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
