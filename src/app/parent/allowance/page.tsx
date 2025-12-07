"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Skeleton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EditIcon from "@mui/icons-material/Edit";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";

type Frequency = "daily" | "weekly" | "biweekly" | "monthly";

const frequencyLabels: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
};

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function AllowancePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedKid, setSelectedKid] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
    frequency: "weekly" as Frequency,
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/");
      return;
    }
    setToken(storedToken);
  }, [router]);

  const allowanceConfigs = useQuery(
    api.parent.getAllowanceConfigs,
    token ? { token } : "skip"
  );

  const setAllowance = useMutation(api.parent.setAllowance);
  const pauseAllowance = useMutation(api.parent.pauseAllowance);
  const resumeAllowance = useMutation(api.parent.resumeAllowance);

  const handleOpenEdit = (kidConfig: any) => {
    setSelectedKid(kidConfig);
    if (kidConfig.config) {
      setFormData({
        amount: (kidConfig.config.amount / 100).toString(),
        frequency: kidConfig.config.frequency,
        dayOfWeek: kidConfig.config.dayOfWeek || 1,
        dayOfMonth: kidConfig.config.dayOfMonth || 1,
      });
    } else {
      setFormData({
        amount: "5",
        frequency: "weekly",
        dayOfWeek: 1,
        dayOfMonth: 1,
      });
    }
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setSelectedKid(null);
  };

  const handleSaveAllowance = async () => {
    if (!token || !selectedKid) return;
    const amountInCents = Math.round(parseFloat(formData.amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      return;
    }

    setLoading(true);
    try {
      await setAllowance({
        token,
        kidId: selectedKid.kid._id,
        amount: amountInCents,
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === "monthly" ? formData.dayOfMonth : undefined,
      });
      setSuccessMessage(`Allowance updated for ${selectedKid.kid.name}!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      handleCloseEdit();
    } catch (error) {
      console.error("Error setting allowance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllowance = async (kidConfig: any) => {
    if (!token) return;
    setLoading(true);
    try {
      if (kidConfig.config?.isActive) {
        await pauseAllowance({ token, kidId: kidConfig.kid._id });
        setSuccessMessage(`Allowance paused for ${kidConfig.kid.name}`);
      } else {
        await resumeAllowance({ token, kidId: kidConfig.kid._id });
        setSuccessMessage(`Allowance resumed for ${kidConfig.kid.name}`);
      }
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error toggling allowance:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNextPayment = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const calculateMonthlyTotal = () => {
    if (!allowanceConfigs) return 0;
    return allowanceConfigs.reduce((total, config) => {
      if (!config.config?.isActive) return total;
      const amount = config.config.amount;
      switch (config.config.frequency) {
        case "daily":
          return total + amount * 30;
        case "weekly":
          return total + amount * 4;
        case "biweekly":
          return total + amount * 2;
        case "monthly":
          return total + amount;
        default:
          return total;
      }
    }, 0);
  };

  if (!token) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/parent")}
            sx={{ color: "white", mb: 2 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" sx={{ color: "white", fontWeight: "bold" }}>
            Allowance Management
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.8)" }}>
            Set up and manage automatic allowances for your kids
          </Typography>
        </Box>

        {successMessage && (
          <Alert
            severity="success"
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<CheckCircleIcon />}
          >
            {successMessage}
          </Alert>
        )}

        {/* Summary Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "rgba(255,255,255,0.95)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "primary.light", width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {allowanceConfigs?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Kids
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "rgba(255,255,255,0.95)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "success.light", width: 56, height: 56 }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {allowanceConfigs?.filter((c) => c.config?.isActive).length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Allowances
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "rgba(255,255,255,0.95)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "warning.light", width: 56, height: 56 }}>
                  <AttachMoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    ${(calculateMonthlyTotal() / 100).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Est. Monthly Total
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Kids Allowance Cards */}
        <Typography
          variant="h6"
          sx={{ color: "white", mb: 2, fontWeight: "bold" }}
        >
          Allowance by Child
        </Typography>

        {!allowanceConfigs ? (
          <Grid container spacing={3}>
            {[1, 2].map((i) => (
              <Grid size={{ xs: 12, md: 6 }} key={i}>
                <Skeleton
                  variant="rectangular"
                  height={200}
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
            ))}
          </Grid>
        ) : allowanceConfigs.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: "center",
              background: "rgba(255,255,255,0.95)",
            }}
          >
            <PersonIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Kids Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add a child to your account first before setting up allowances.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push("/parent")}
            >
              Go to Dashboard
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {allowanceConfigs.map((kidConfig) => (
              <Grid size={{ xs: 12, md: 6 }} key={kidConfig.kid._id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.95)",
                    position: "relative",
                    overflow: "visible",
                  }}
                >
                  {/* Status Badge */}
                  {kidConfig.config && (
                    <Chip
                      label={kidConfig.config.isActive ? "Active" : "Paused"}
                      color={kidConfig.config.isActive ? "success" : "warning"}
                      size="small"
                      sx={{
                        position: "absolute",
                        top: -10,
                        right: 16,
                        fontWeight: "bold",
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 3 }}>
                    {/* Kid Header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          bgcolor: "primary.main",
                          fontSize: "1.5rem",
                        }}
                      >
                        {kidConfig.kid.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          {kidConfig.kid.name}
                        </Typography>
                        {kidConfig.config ? (
                          <Typography variant="body2" color="text.secondary">
                            {frequencyLabels[kidConfig.config.frequency as Frequency]} allowance
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No allowance set
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {kidConfig.config ? (
                      <>
                        {/* Allowance Details */}
                        <Box
                          sx={{
                            display: "flex",
                            gap: 2,
                            mb: 3,
                          }}
                        >
                          <Paper
                            elevation={0}
                            sx={{
                              flex: 1,
                              p: 2,
                              bgcolor: "grey.50",
                              borderRadius: 2,
                              textAlign: "center",
                            }}
                          >
                            <AttachMoneyIcon color="primary" />
                            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                              ${(kidConfig.config.amount / 100).toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {frequencyLabels[kidConfig.config.frequency as Frequency]}
                            </Typography>
                          </Paper>

                          <Paper
                            elevation={0}
                            sx={{
                              flex: 1,
                              p: 2,
                              bgcolor: "grey.50",
                              borderRadius: 2,
                              textAlign: "center",
                            }}
                          >
                            <ScheduleIcon color="secondary" />
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                              {formatNextPayment(kidConfig.config.nextPaymentAt)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Next Payment
                            </Typography>
                          </Paper>
                        </Box>

                        {/* Schedule Info */}
                        {kidConfig.config.frequency === "weekly" && kidConfig.config.dayOfWeek !== undefined && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                            <CalendarMonthIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Every {daysOfWeek[kidConfig.config.dayOfWeek]}
                            </Typography>
                          </Box>
                        )}
                        {kidConfig.config.frequency === "monthly" && kidConfig.config.dayOfMonth && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                            <CalendarMonthIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              On the {kidConfig.config.dayOfMonth}
                              {kidConfig.config.dayOfMonth === 1
                                ? "st"
                                : kidConfig.config.dayOfMonth === 2
                                ? "nd"
                                : kidConfig.config.dayOfMonth === 3
                                ? "rd"
                                : "th"}{" "}
                              of each month
                            </Typography>
                          </Box>
                        )}

                        <Divider sx={{ my: 2 }} />

                        {/* Actions */}
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenEdit(kidConfig)}
                            sx={{ flex: 1 }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={kidConfig.config.isActive ? "outlined" : "contained"}
                            color={kidConfig.config.isActive ? "warning" : "success"}
                            startIcon={
                              kidConfig.config.isActive ? <PauseIcon /> : <PlayArrowIcon />
                            }
                            onClick={() => handleToggleAllowance(kidConfig)}
                            disabled={loading}
                            sx={{ flex: 1 }}
                          >
                            {kidConfig.config.isActive ? "Pause" : "Resume"}
                          </Button>
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 2 }}>
                        <WarningIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          No allowance configured yet
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AttachMoneyIcon />}
                          onClick={() => handleOpenEdit(kidConfig)}
                        >
                          Set Up Allowance
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Edit Allowance Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={handleCloseEdit}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogTitle>
            {selectedKid?.config
              ? `Edit Allowance for ${selectedKid?.kid?.name}`
              : `Set Up Allowance for ${selectedKid?.kid?.name}`}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency}
                  label="Frequency"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      frequency: e.target.value as Frequency,
                    }))
                  }
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="biweekly">Every 2 Weeks</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>

              {formData.frequency === "weekly" && (
                <FormControl fullWidth>
                  <InputLabel>Day of Week</InputLabel>
                  <Select
                    value={formData.dayOfWeek}
                    label="Day of Week"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dayOfWeek: e.target.value as number,
                      }))
                    }
                  >
                    {daysOfWeek.map((day, index) => (
                      <MenuItem key={day} value={index}>
                        {day}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {formData.frequency === "monthly" && (
                <FormControl fullWidth>
                  <InputLabel>Day of Month</InputLabel>
                  <Select
                    value={formData.dayOfMonth}
                    label="Day of Month"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dayOfMonth: e.target.value as number,
                      }))
                    }
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <MenuItem key={day} value={day}>
                        {day}
                        {day === 1
                          ? "st"
                          : day === 2
                          ? "nd"
                          : day === 3
                          ? "rd"
                          : "th"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: "primary.50",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "primary.200",
                }}
              >
                <Typography variant="body2" color="primary.main">
                  <strong>Summary:</strong> {selectedKid?.kid?.name} will receive{" "}
                  <strong>${formData.amount || "0"}</strong>{" "}
                  {frequencyLabels[formData.frequency].toLowerCase()}.
                </Typography>
              </Paper>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={handleCloseEdit}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveAllowance}
              disabled={loading || !formData.amount}
            >
              {loading ? "Saving..." : "Save Allowance"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
