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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  IconButton,
  Alert,
  Chip,
} from "@mui/material";
import {
  Savings,
  ArrowBack,
  Add,
  Delete,
  EmojiEvents,
  AccountBalanceWallet,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

export default function KidSavingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // Fetch data
  const walletData = useQuery(api.wallets.getWallet, token ? { token } : "skip");
  const savingsGoals = useQuery(api.wallets.getSavingsGoals, token ? { token } : "skip");

  // Mutations
  const createGoalMutation = useMutation(api.wallets.createSavingsGoal);
  const addToGoalMutation = useMutation(api.wallets.addToSavingsGoal);
  const withdrawMutation = useMutation(api.wallets.withdrawFromSavingsGoal);
  const deleteGoalMutation = useMutation(api.wallets.deleteSavingsGoal);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMoneyDialogOpen, setAddMoneyDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Id<"savingsGoals"> | null>(null);

  // Form states
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated as kid
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleCreateGoal = async () => {
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      const amountInCents = Math.round(parseFloat(goalAmount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        throw new Error("Please enter a valid amount");
      }

      await createGoalMutation({
        token,
        name: goalName,
        targetAmount: amountInCents,
      });

      setCreateDialogOpen(false);
      setGoalName("");
      setGoalAmount("");
      setSuccess("Goal created! Start saving!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async () => {
    if (!token || !selectedGoal) return;
    setError(null);
    setLoading(true);

    try {
      const amountInCents = Math.round(parseFloat(addAmount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const result = await addToGoalMutation({
        token,
        goalId: selectedGoal,
        amount: amountInCents,
      });

      setAddMoneyDialogOpen(false);
      setSelectedGoal(null);
      setAddAmount("");

      if (result.isCompleted) {
        setSuccess("Congratulations! You reached your goal! 🎉");
      } else {
        setSuccess("Money saved! Keep going!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add money");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: Id<"savingsGoals">) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this goal? Any saved money will return to your wallet.")) {
      return;
    }

    try {
      await deleteGoalMutation({ token, goalId });
      setSuccess("Goal deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    }
  };

  const totalSaved = savingsGoals?.reduce((sum, goal) => sum + goal.currentAmount, 0) || 0;
  const activeGoals = savingsGoals?.filter((g) => !g.isCompleted) || [];
  const completedGoals = savingsGoals?.filter((g) => g.isCompleted) || [];

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

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)",
          py: 4,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <IconButton
              onClick={() => router.push("/kid")}
              sx={{ color: "white" }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" fontWeight="700">
              {t("kid.savings")}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Savings sx={{ fontSize: 50, mb: 1 }} />
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  Total Saved
                </Typography>
                <Typography variant="h3" fontWeight="800">
                  {formatCurrency(totalSaved)}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <AccountBalanceWallet sx={{ fontSize: 50, mb: 1 }} />
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  Available in Wallet
                </Typography>
                <Typography variant="h3" fontWeight="800">
                  {formatCurrency(walletData?.wallet?.balance || 0)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
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

        {/* Active Goals */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" fontWeight="700">
            {t("kid.savingsGoals")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            {t("kid.createGoal")}
          </Button>
        </Box>

        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <Savings sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No savings goals yet!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create a goal to start saving for something special!
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Your First Goal
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {activeGoals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={goal._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                          {goal.name}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteGoal(goal._id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {t("kid.progress")}
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {Math.round(progress)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(progress, 100)}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: "grey.200",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 5,
                              bgcolor: progress >= 100 ? "success.main" : "primary.main",
                            },
                          }}
                        />
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Saved
                        </Typography>
                        <Typography variant="body1" fontWeight="600" color="primary.main">
                          {formatCurrency(goal.currentAmount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Goal
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {formatCurrency(goal.targetAmount)}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                          setSelectedGoal(goal._id);
                          setAddMoneyDialogOpen(true);
                        }}
                        disabled={(walletData?.wallet?.balance || 0) <= 0}
                      >
                        Add Money
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <EmojiEvents sx={{ color: "warning.main" }} />
              Completed Goals
            </Typography>
            <Grid container spacing={2}>
              {completedGoals.map((goal) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={goal._id}>
                  <Card sx={{ bgcolor: "success.light", opacity: 0.9 }}>
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          icon={<EmojiEvents />}
                          label="Completed!"
                          color="success"
                          size="small"
                        />
                      </Box>
                      <Typography variant="h6" fontWeight="600" sx={{ mt: 1 }}>
                        {goal.name}
                      </Typography>
                      <Typography variant="body2">
                        You saved {formatCurrency(goal.targetAmount)}!
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>

      {/* Create Goal Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("kid.createGoal")}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t("kid.goalName")}
            placeholder="e.g., New bicycle, Video game"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label={t("kid.goalAmount")}
            placeholder="e.g., 50.00"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleCreateGoal}
            disabled={loading || !goalName || !goalAmount}
          >
            {loading ? <CircularProgress size={24} /> : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Money Dialog */}
      <Dialog open={addMoneyDialogOpen} onClose={() => setAddMoneyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Money to Goal</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Available: {formatCurrency(walletData?.wallet?.balance || 0)}
          </Typography>
          <TextField
            fullWidth
            label="Amount to save"
            placeholder="e.g., 10.00"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMoneyDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleAddMoney}
            disabled={loading || !addAmount}
          >
            {loading ? <CircularProgress size={24} /> : "Save Money"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
