"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  AccountBalanceWallet,
  ArrowBack,
  TrendingUp,
  TrendingDown,
  Savings,
  SwapHoriz,
  AttachMoney,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/Header";

export default function KidWalletPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // Fetch wallet data
  const walletData = useQuery(
    api.wallets.getWallet,
    token ? { token } : "skip"
  );

  const transactions = useQuery(
    api.wallets.getTransactions,
    token ? { token, limit: 20 } : "skip"
  );

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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "allowance":
        return <TrendingUp sx={{ color: "success.main" }} />;
      case "transfer_to_savings":
        return <Savings sx={{ color: "info.main" }} />;
      case "transfer_from_savings":
        return <SwapHoriz sx={{ color: "warning.main" }} />;
      case "investment_buy":
        return <TrendingDown sx={{ color: "error.main" }} />;
      case "investment_sell":
        return <TrendingUp sx={{ color: "success.main" }} />;
      default:
        return <AttachMoney />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? "success.main" : "error.main";
  };

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
          background: "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
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
              {t("kid.wallet")}
            </Typography>
          </Box>

          {/* Balance Card */}
          <Paper
            sx={{
              p: 4,
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              color: "white",
              textAlign: "center",
            }}
          >
            <AccountBalanceWallet sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="overline" sx={{ opacity: 0.8 }}>
              {t("kid.realMoney")}
            </Typography>
            <Typography variant="h2" fontWeight="800">
              {walletData?.wallet
                ? formatCurrency(walletData.wallet.balance)
                : "$0.00"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
              This is real money from your parents
            </Typography>
          </Paper>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Quick Actions */}
        <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<Savings />}
            onClick={() => router.push("/kid/savings")}
            sx={{ flex: 1, minWidth: 150 }}
          >
            Save Money
          </Button>
          <Button
            variant="outlined"
            startIcon={<TrendingUp />}
            onClick={() => router.push("/kid/investments")}
            sx={{ flex: 1, minWidth: 150 }}
          >
            Invest
          </Button>
        </Box>

        {/* Money Tips Card */}
        <Card sx={{ mb: 4, bgcolor: "warning.light" }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ fontSize: 40 }}>💡</Box>
            <Box>
              <Typography variant="subtitle1" fontWeight="600">
                Remember!
              </Typography>
              <Typography variant="body2">
                You can&apos;t withdraw this money, but you can save it, invest it,
                or ask your parents to buy something for you!
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>
          Transaction History
        </Typography>

        {transactions === undefined ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : transactions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <AttachMoney sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No transactions yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When your parents send you money, it will show up here!
            </Typography>
          </Paper>
        ) : (
          <Paper>
            <List>
              {transactions.map((tx, index) => (
                <Box key={tx._id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>{getTransactionIcon(tx.type)}</ListItemIcon>
                    <ListItemText
                      primary={tx.description}
                      secondary={formatDate(tx.createdAt)}
                    />
                    <Typography
                      variant="h6"
                      fontWeight="600"
                      sx={{ color: getTransactionColor(tx.amount) }}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </Typography>
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
