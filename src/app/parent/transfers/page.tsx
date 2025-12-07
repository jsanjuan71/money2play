"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Chip,
} from "@mui/material";
import {
  ArrowBack,
  Send,
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
  History,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

export default function ParentTransfersPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // Get pre-selected kid from URL
  const preselectedKidId = searchParams.get("kidId");

  // Fetch data
  const kids = useQuery(api.auth.getKids, token ? { token } : "skip");

  // State
  const [selectedKidId, setSelectedKidId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mutations
  const depositMutation = useMutation(api.wallets.depositMoney);

  // Fetch transactions for selected kid
  const transactions = useQuery(
    api.wallets.getTransactions,
    token && selectedKidId
      ? { token, kidId: selectedKidId as Id<"kids">, limit: 10 }
      : "skip"
  );

  // Set preselected kid
  useEffect(() => {
    if (preselectedKidId && kids?.some((k) => k._id === preselectedKidId)) {
      setSelectedKidId(preselectedKidId);
    }
  }, [preselectedKidId, kids]);

  // Redirect if not authenticated as parent
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "parent")) {
      router.push("/auth");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMoney = async () => {
    if (!token || !selectedKidId) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        throw new Error("Please enter a valid amount");
      }

      await depositMutation({
        token,
        kidId: selectedKidId as Id<"kids">,
        amount: amountInCents,
        description: description || undefined,
      });

      setAmount("");
      setDescription("");
      setSuccess(`Successfully sent ${formatCurrency(amountInCents)}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send money");
    } finally {
      setLoading(false);
    }
  };

  const selectedKid = kids?.find((k) => k._id === selectedKidId);

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
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <IconButton onClick={() => router.push("/parent")}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="700">
            {t("parent.transfers")}
          </Typography>
        </Box>

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
          {/* Send Money Form */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight="700" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                <Send color="primary" />
                {t("parent.sendMoney")}
              </Typography>

              {!kids || kids.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    You need to add a child first
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push("/parent")}
                  >
                    Go to Dashboard
                  </Button>
                </Box>
              ) : (
                <>
                  <TextField
                    select
                    fullWidth
                    label="Select Child"
                    value={selectedKidId}
                    onChange={(e) => setSelectedKidId(e.target.value)}
                    sx={{ mb: 3 }}
                  >
                    {kids.map((kid) => (
                      <MenuItem key={kid._id} value={kid._id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                            {kid.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography>{kid.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Balance: {formatCurrency(kid.balance)}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>

                  {selectedKid && (
                    <Card sx={{ mb: 3, bgcolor: "primary.light", color: "white" }}>
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ width: 50, height: 50, bgcolor: "white", color: "primary.main" }}>
                            {selectedKid.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6">{selectedKid.name}</Typography>
                            <Typography variant="body2">
                              Current Balance: {formatCurrency(selectedKid.balance)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  <TextField
                    fullWidth
                    label="Amount"
                    placeholder="e.g., 10.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }}
                    sx={{ mb: 3 }}
                  />

                  <TextField
                    fullWidth
                    label="Note (optional)"
                    placeholder="e.g., Allowance, Birthday money"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    sx={{ mb: 3 }}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
                    onClick={handleSendMoney}
                    disabled={loading || !selectedKidId || !amount}
                  >
                    Send Money
                  </Button>
                </>
              )}
            </Paper>

            {/* Quick Amounts */}
            {selectedKidId && (
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Quick Amounts
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {[5, 10, 20, 50].map((val) => (
                    <Chip
                      key={val}
                      label={`$${val}`}
                      onClick={() => setAmount(val.toString())}
                      variant={amount === val.toString() ? "filled" : "outlined"}
                      color="primary"
                      clickable
                    />
                  ))}
                </Box>
              </Paper>
            )}
          </Grid>

          {/* Transaction History */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight="700" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                <History color="primary" />
                Recent Transactions
              </Typography>

              {!selectedKidId ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  Select a child to view their transaction history
                </Typography>
              ) : transactions === undefined ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : transactions.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <AccountBalanceWallet sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No transactions yet
                  </Typography>
                </Box>
              ) : (
                <List>
                  {transactions.map((tx, index) => (
                    <Box key={tx._id}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemIcon>
                          {tx.amount >= 0 ? (
                            <TrendingUp sx={{ color: "success.main" }} />
                          ) : (
                            <TrendingDown sx={{ color: "error.main" }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={tx.description}
                          secondary={formatDate(tx.createdAt)}
                        />
                        <Typography
                          variant="body1"
                          fontWeight="600"
                          sx={{
                            color: tx.amount >= 0 ? "success.main" : "error.main",
                          }}
                        >
                          {tx.amount >= 0 ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </Typography>
                      </ListItem>
                    </Box>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
