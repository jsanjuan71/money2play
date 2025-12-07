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
} from "@mui/material";
import {
  Add,
  AccountBalanceWallet,
  TrendingUp,
  Notifications,
  Settings,
  ChildCare,
  Logout,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/Header";

export default function ParentDashboard() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, user, token, logout, isLoading: authLoading } = useAuth();

  // Fetch kids
  const kids = useQuery(api.auth.getKids, token ? { token } : "skip");
  const addKidMutation = useMutation(api.auth.addKid);

  // Add kid dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKidName, setNewKidName] = useState("");
  const [newKidPin, setNewKidPin] = useState("");
  const [newKidBirthDate, setNewKidBirthDate] = useState("");
  const [addingKid, setAddingKid] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Redirect if not authenticated as parent
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "parent")) {
      router.push("/auth");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const handleAddKid = async () => {
    if (!token) return;
    setAddError(null);
    setAddingKid(true);

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
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add child");
    } finally {
      setAddingKid(false);
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

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h4" fontWeight="700">
              {t("auth.welcomeBack")}, {user?.name}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t("parent.dashboard")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton>
              <Notifications />
            </IconButton>
            <IconButton>
              <Settings />
            </IconButton>
            <IconButton onClick={handleLogout} color="error">
              <Logout />
            </IconButton>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <ChildCare sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
              <Typography variant="h4" fontWeight="700">
                {kids?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("parent.myKids")}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <AccountBalanceWallet sx={{ fontSize: 40, color: "success.main", mb: 1 }} />
              <Typography variant="h4" fontWeight="700">
                {formatCurrency(kids?.reduce((sum, kid) => sum + kid.balance, 0) || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Balance
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <TrendingUp sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
              <Typography variant="h4" fontWeight="700">
                {kids?.reduce((sum, kid) => sum + kid.coins, 0) || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Coins Earned
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Notifications sx={{ fontSize: 40, color: "warning.main", mb: 1 }} />
              <Typography variant="h4" fontWeight="700">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("parent.pendingApprovals")}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Kids Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h5" fontWeight="700">
              {t("parent.myKids")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddDialogOpen(true)}
            >
              {t("parent.addKid")}
            </Button>
          </Box>

          {kids?.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <ChildCare sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t("parent.noKidsYet")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t("parent.addFirstKid")}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddDialogOpen(true)}
              >
                {t("parent.addKid")}
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {kids?.map((kid) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={kid._id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            bgcolor: "primary.main",
                            fontSize: 24,
                          }}
                        >
                          {kid.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="600">
                            {kid.name}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Chip
                              size="small"
                              label={`Level ${kid.level}`}
                              color="primary"
                            />
                            <Chip
                              size="small"
                              label={`${kid.streak} day streak`}
                              color="secondary"
                            />
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t("kid.realMoney")}
                        </Typography>
                        <Typography variant="body1" fontWeight="600" color="success.main">
                          {formatCurrency(kid.balance)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          {t("kid.virtualCoins")}
                        </Typography>
                        <Typography variant="body1" fontWeight="600" color="warning.main">
                          {kid.coins} coins
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => router.push(`/parent/transfers?kidId=${kid._id}`)}
                      >
                        {t("parent.sendMoney")}
                      </Button>
                      <Button size="small">{t("parent.viewActivity")}</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>

      {/* Add Kid Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("parent.addKid")}</DialogTitle>
        <DialogContent>
          {addError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addError}
            </Alert>
          )}
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
            helperText="This PIN will be used by your child to log in"
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
            disabled={addingKid || !newKidName || !newKidPin}
          >
            {addingKid ? <CircularProgress size={24} /> : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
