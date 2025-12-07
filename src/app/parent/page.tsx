"use client";

import { useEffect, useState } from "react";
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
  CardActions,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
} from "@mui/material";
import {
  Add,
  AccountBalanceWallet,
  TrendingUp,
  Notifications,
  Settings,
  ChildCare,
  Logout,
  Savings,
  EmojiEvents,
  Schedule,
  CheckCircle,
  Close,
  Visibility,
  AttachMoney,
  MonetizationOn,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";

export default function ParentDashboard() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, user, token, logout, isLoading: authLoading } = useAuth();

  // Fetch data
  const kids = useQuery(api.parent.getKidsWithDetails, token ? { token } : "skip");
  const stats = useQuery(api.parent.getDashboardStats, token ? { token } : "skip");
  const pendingApprovals = useQuery(api.parent.getPendingApprovals, token ? { token } : "skip");

  // Mutations
  const addKidMutation = useMutation(api.auth.addKid);
  const depositMutation = useMutation(api.parent.depositToKid);
  const giveCoinsMutation = useMutation(api.parent.giveCoins);
  const approveRequestMutation = useMutation(api.parent.approveRequest);
  const rejectRequestMutation = useMutation(api.parent.rejectRequest);

  // State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [coinsDialogOpen, setCoinsDialogOpen] = useState(false);
  const [selectedKid, setSelectedKid] = useState<any>(null);
  const [newKidName, setNewKidName] = useState("");
  const [newKidPin, setNewKidPin] = useState("");
  const [newKidBirthDate, setNewKidBirthDate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState("");
  const [coinsAmount, setCoinsAmount] = useState("");
  const [coinsDescription, setCoinsDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated as parent
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "parent")) {
      router.push("/auth");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const handleAddKid = async () => {
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      await addKidMutation({
        token,
        name: newKidName,
        pin: newKidPin,
        birthDate: newKidBirthDate || undefined,
      });
      setAddDialogOpen(false);
      setNewKidName("");
      setNewKidPin("");
      setNewKidBirthDate("");
      setSuccess("Child added successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add child");
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!token || !selectedKid) return;
    setError(null);
    setLoading(true);

    try {
      const amountInCents = Math.round(parseFloat(depositAmount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        throw new Error("Please enter a valid amount");
      }

      await depositMutation({
        token,
        kidId: selectedKid._id,
        amount: amountInCents,
        description: depositDescription || undefined,
      });

      setDepositDialogOpen(false);
      setDepositAmount("");
      setDepositDescription("");
      setSuccess(`Sent $${(amountInCents / 100).toFixed(2)} to ${selectedKid.name}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send money");
    } finally {
      setLoading(false);
    }
  };

  const handleGiveCoins = async () => {
    if (!token || !selectedKid) return;
    setError(null);
    setLoading(true);

    try {
      const amount = parseInt(coinsAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      await giveCoinsMutation({
        token,
        kidId: selectedKid._id,
        amount,
        description: coinsDescription || undefined,
      });

      setCoinsDialogOpen(false);
      setCoinsAmount("");
      setCoinsDescription("");
      setSuccess(`Gave ${amount} coins to ${selectedKid.name}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to give coins");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: Id<"approvalRequests">) => {
    if (!token) return;
    try {
      await approveRequestMutation({ token, approvalId });
      setSuccess("Request approved!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleReject = async (approvalId: Id<"approvalRequests">) => {
    if (!token) return;
    try {
      await rejectRequestMutation({ token, approvalId });
      setSuccess("Request rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (authLoading || !isAuthenticated || userType !== "parent") {
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
          background: "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)",
          py: 4,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight="700">
                {t("auth.welcomeBack")}, {user?.name}!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {t("parent.dashboard")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton sx={{ color: "white" }} onClick={() => router.push("/parent/approvals")}>
                <Badge badgeContent={stats?.pendingApprovalsCount || 0} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <IconButton sx={{ color: "white" }}>
                <Settings />
              </IconButton>
              <IconButton onClick={handleLogout} sx={{ color: "white" }}>
                <Logout />
              </IconButton>
            </Box>
          </Box>

          {/* Quick Stats */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(255,255,255,0.15)", color: "white" }}>
                <ChildCare sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="h5" fontWeight="700">{stats?.kidsCount || 0}</Typography>
                <Typography variant="caption">Kids</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(255,255,255,0.15)", color: "white" }}>
                <AccountBalanceWallet sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="h5" fontWeight="700">{formatCurrency(stats?.totalBalance || 0)}</Typography>
                <Typography variant="caption">Total Balance</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(255,255,255,0.15)", color: "white" }}>
                <MonetizationOn sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="h5" fontWeight="700">{stats?.totalCoins || 0}</Typography>
                <Typography variant="caption">Total Coins</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(255,255,255,0.15)", color: "white" }}>
                <Savings sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="h5" fontWeight="700">{formatCurrency(stats?.totalSaved || 0)}</Typography>
                <Typography variant="caption">Saved</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(255,255,255,0.15)", color: "white" }}>
                <TrendingUp sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="h5" fontWeight="700">{formatCurrency(stats?.totalInvested || 0)}</Typography>
                <Typography variant="caption">Invested</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(255,255,255,0.15)", color: "white" }}>
                <Schedule sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="h5" fontWeight="700">{stats?.pendingApprovalsCount || 0}</Typography>
                <Typography variant="caption">Pending</Typography>
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

        <Grid container spacing={4}>
          {/* Kids Section */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h5" fontWeight="700">
                {t("parent.myKids")}
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialogOpen(true)}>
                {t("parent.addKid")}
              </Button>
            </Box>

            {!kids || kids.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: "center" }}>
                <ChildCare sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t("parent.noKidsYet")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t("parent.addFirstKid")}
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialogOpen(true)}>
                  {t("parent.addKid")}
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {kids.map((kid) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={kid._id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                          <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: 24 }}>
                            {kid.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" fontWeight="600">{kid.name}</Typography>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              <Chip size="small" label={`Level ${kid.level}`} color="primary" />
                              <Chip size="small" label={`${kid.xp} XP`} variant="outlined" />
                              {kid.streak > 0 && (
                                <Chip size="small" label={`🔥 ${kid.streak} days`} color="warning" />
                              )}
                            </Box>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Real Money</Typography>
                            <Typography variant="h6" color="success.main" fontWeight="600">
                              {formatCurrency(kid.wallet?.balance || 0)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Coins</Typography>
                            <Typography variant="h6" color="warning.main" fontWeight="600">
                              {kid.virtualWallet?.coins || 0} 🪙
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Savings</Typography>
                            <Typography variant="body1" fontWeight="600">
                              {formatCurrency(kid.savingsGoals?.totalSaved || 0)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Invested</Typography>
                            <Typography variant="body1" fontWeight="600">
                              {formatCurrency(kid.investments?.totalValue || 0)}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* Allowance status */}
                        {kid.allowance && (
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Allowance</Typography>
                            <Typography variant="body2" fontWeight="600">
                              {formatCurrency(kid.allowance.amount)} / {kid.allowance.frequency}
                              {!kid.allowance.isActive && (
                                <Chip size="small" label="Paused" color="warning" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                          </Box>
                        )}

                        {/* Missions completed */}
                        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <EmojiEvents sx={{ fontSize: 20, color: "warning.main" }} />
                          <Typography variant="body2">
                            {kid.missions?.completed || 0} missions completed
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<AttachMoney />}
                          onClick={() => {
                            setSelectedKid(kid);
                            setDepositDialogOpen(true);
                          }}
                        >
                          Send Money
                        </Button>
                        <Button
                          size="small"
                          startIcon={<MonetizationOn />}
                          onClick={() => {
                            setSelectedKid(kid);
                            setCoinsDialogOpen(true);
                          }}
                        >
                          Give Coins
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => router.push(`/parent/kids/${kid._id}`)}
                        >
                          Details
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>

          {/* Pending Approvals Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" fontWeight="600">
                  Pending Approvals
                </Typography>
                <Chip label={pendingApprovals?.length || 0} color="warning" size="small" />
              </Box>

              {!pendingApprovals || pendingApprovals.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CheckCircle sx={{ fontSize: 48, color: "success.main", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No pending requests
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {pendingApprovals.slice(0, 5).map((approval) => (
                    <ListItem
                      key={approval._id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        mb: 1,
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", mb: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                          {approval.kid?.name?.charAt(0) || "?"}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" fontWeight="600">
                            {approval.kid?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {approval.type.replace(/_/g, " ")}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {approval.details.description}
                      </Typography>
                      {approval.details.amount && (
                        <Typography variant="body2" color="primary" fontWeight="600">
                          {formatCurrency(approval.details.amount)}
                        </Typography>
                      )}
                      <Box sx={{ display: "flex", gap: 1, mt: 1, width: "100%" }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          fullWidth
                          onClick={() => handleApprove(approval._id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          fullWidth
                          onClick={() => handleReject(approval._id)}
                        >
                          Reject
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}

              {pendingApprovals && pendingApprovals.length > 5 && (
                <Button fullWidth sx={{ mt: 2 }} onClick={() => router.push("/parent/approvals")}>
                  View All ({pendingApprovals.length})
                </Button>
              )}
            </Paper>

            {/* Quick Links */}
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button fullWidth variant="outlined" onClick={() => router.push("/parent/allowance")}>
                  Manage Allowances
                </Button>
                <Button fullWidth variant="outlined" onClick={() => router.push("/parent/activity")}>
                  View All Activity
                </Button>
                <Button fullWidth variant="outlined" onClick={() => router.push("/parent/settings")}>
                  Settings
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Add Kid Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("parent.addKid")}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t("parent.kidName")}
            value={newKidName}
            onChange={(e) => setNewKidName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label={t("parent.kidPin")}
            value={newKidPin}
            onChange={(e) => setNewKidPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            sx={{ mb: 2 }}
            required
            inputProps={{ maxLength: 6, inputMode: "numeric" }}
            helperText="4-6 digit PIN for your child to log in"
          />
          <TextField
            fullWidth
            type="date"
            label={t("parent.birthDate")}
            value={newKidBirthDate}
            onChange={(e) => setNewKidBirthDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleAddKid}
            disabled={loading || !newKidName || !newKidPin}
          >
            {loading ? <CircularProgress size={24} /> : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deposit Money Dialog */}
      <Dialog open={depositDialogOpen} onClose={() => setDepositDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Money to {selectedKid?.name}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
            InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
            helperText="Enter amount in dollars"
          />
          <TextField
            fullWidth
            label="Note (optional)"
            value={depositDescription}
            onChange={(e) => setDepositDescription(e.target.value)}
            placeholder="e.g., Allowance, Birthday gift"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleDeposit}
            disabled={loading || !depositAmount}
          >
            {loading ? <CircularProgress size={24} /> : "Send Money"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Give Coins Dialog */}
      <Dialog open={coinsDialogOpen} onClose={() => setCoinsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Give Coins to {selectedKid?.name}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Coins"
            type="number"
            value={coinsAmount}
            onChange={(e) => setCoinsAmount(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
            InputProps={{ endAdornment: <Typography sx={{ ml: 1 }}>🪙</Typography> }}
          />
          <TextField
            fullWidth
            label="Reason (optional)"
            value={coinsDescription}
            onChange={(e) => setCoinsDescription(e.target.value)}
            placeholder="e.g., Great job on chores!"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoinsDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleGiveCoins}
            disabled={loading || !coinsAmount}
          >
            {loading ? <CircularProgress size={24} /> : "Give Coins"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
