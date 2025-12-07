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
  TextField,
  CircularProgress,
  IconButton,
  Alert,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  ArrowBack,
  AccountBalanceWallet,
  ShowChart,
  Info,
  LocalAtm,
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

export default function KidInvestmentsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // Fetch data
  const walletData = useQuery(api.wallets.getWallet, token ? { token } : "skip");
  const portfolio = useQuery(api.investments.getPortfolio, token ? { token } : "skip");
  const portfolioSummary = useQuery(api.investments.getPortfolioSummary, token ? { token } : "skip");
  const investmentOptions = useQuery(api.investments.getInvestmentOptions, {});

  // Mutations
  const buyMutation = useMutation(api.investments.buyInvestment);
  const sellMutation = useMutation(api.investments.sellInvestment);
  const seedMutation = useMutation(api.investments.seedInvestmentOptions);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Id<"investmentOptions"> | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<typeof portfolio extends (infer T)[] ? T : never | null>(null);
  const [amount, setAmount] = useState("");
  const [shares, setShares] = useState("");
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "success";
      case "medium":
        return "warning";
      case "high":
        return "error";
      default:
        return "default";
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case "low":
        return t("investments.low");
      case "medium":
        return t("investments.medium");
      case "high":
        return t("investments.high");
      default:
        return risk;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "stocks":
        return "📈";
      case "crypto":
        return "🪙";
      case "savings_bond":
        return "🏦";
      case "fun_fund":
        return "🚀";
      default:
        return "💰";
    }
  };

  const handleBuy = async () => {
    if (!token || !selectedOption) return;
    setError(null);
    setLoading(true);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        throw new Error("Please enter a valid amount");
      }

      await buyMutation({
        token,
        optionId: selectedOption,
        amount: amountInCents,
      });

      setBuyDialogOpen(false);
      setSelectedOption(null);
      setAmount("");
      setSuccess("Investment successful! Check your portfolio.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to buy");
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!token || !selectedInvestment) return;
    setError(null);
    setLoading(true);

    try {
      const sharesToSell = parseFloat(shares);
      if (isNaN(sharesToSell) || sharesToSell <= 0) {
        throw new Error("Please enter valid shares");
      }

      const result = await sellMutation({
        token,
        optionId: selectedInvestment.optionId,
        shares: sharesToSell,
      });

      setSellDialogOpen(false);
      setSelectedInvestment(null);
      setShares("");

      if (result.gainLoss >= 0) {
        setSuccess(`Sold for ${formatCurrency(result.saleValue)}! Profit: ${formatCurrency(result.gainLoss)}`);
      } else {
        setSuccess(`Sold for ${formatCurrency(result.saleValue)}. Loss: ${formatCurrency(Math.abs(result.gainLoss))}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sell");
    } finally {
      setLoading(false);
    }
  };

  const selectedOptionData = investmentOptions?.find((o) => o._id === selectedOption);

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
          background: "linear-gradient(135deg, #9C27B0 0%, #E040FB 100%)",
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
              {t("investments.title")}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <AccountBalanceWallet sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  Available to Invest
                </Typography>
                <Typography variant="h4" fontWeight="700">
                  {formatCurrency(walletData?.wallet?.balance || 0)}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <ShowChart sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  {t("investments.totalValue")}
                </Typography>
                <Typography variant="h4" fontWeight="700">
                  {formatCurrency(portfolioSummary?.totalCurrentValue || 0)}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                {(portfolioSummary?.totalGainLoss || 0) >= 0 ? (
                  <TrendingUp sx={{ fontSize: 40, mb: 1, color: "#00E676" }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 40, mb: 1, color: "#FF5252" }} />
                )}
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  {(portfolioSummary?.totalGainLoss || 0) >= 0 ? t("investments.gain") : t("investments.loss")}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="700"
                  sx={{
                    color: (portfolioSummary?.totalGainLoss || 0) >= 0 ? "#00E676" : "#FF5252",
                  }}
                >
                  {formatCurrency(Math.abs(portfolioSummary?.totalGainLoss || 0))}
                  <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                    ({portfolioSummary?.totalGainLossPercent || 0}%)
                  </Typography>
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

        {/* Tabs */}
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label={t("investments.portfolio")} />
          <Tab label={t("investments.explore")} />
        </Tabs>

        {/* Portfolio Tab */}
        <TabPanel value={tabValue} index={0}>
          {!portfolio || portfolio.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <ShowChart sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No investments yet!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start investing to grow your money. Go to the Explore tab to see options!
              </Typography>
              <Button variant="contained" onClick={() => setTabValue(1)}>
                Explore Investments
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {portfolio.map((inv) => {
                if (!inv) return null;
                const isPositive = inv.gainLoss >= 0;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={inv._id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                          <Typography variant="h4">
                            {getCategoryIcon(inv.option.category)}
                          </Typography>
                          <Box>
                            <Typography variant="h6" fontWeight="600">
                              {inv.option.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {inv.option.symbol}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Shares Owned
                            </Typography>
                            <Typography variant="body1" fontWeight="600">
                              {inv.shares.toFixed(4)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Current Value
                            </Typography>
                            <Typography variant="body1" fontWeight="600">
                              {formatCurrency(inv.currentValue)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="body2" color="text.secondary">
                              {isPositive ? "Profit" : "Loss"}
                            </Typography>
                            <Typography
                              variant="body1"
                              fontWeight="600"
                              sx={{ color: isPositive ? "success.main" : "error.main" }}
                            >
                              {isPositive ? "+" : "-"}
                              {formatCurrency(Math.abs(inv.gainLoss))} ({inv.gainLossPercent}%)
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          size="small"
                          label={getRiskLabel(inv.option.riskLevel)}
                          color={getRiskColor(inv.option.riskLevel) as "success" | "warning" | "error"}
                        />
                      </CardContent>
                      <CardActions>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            setSelectedInvestment(inv);
                            setShares(inv.shares.toFixed(4));
                            setSellDialogOpen(true);
                          }}
                        >
                          {t("investments.sell")}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </TabPanel>

        {/* Explore Tab */}
        <TabPanel value={tabValue} index={1}>
          {!investmentOptions || investmentOptions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Info sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No investment options available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ask your parent to set up investment options.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {investmentOptions.map((option) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={option._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Typography variant="h3">
                          {getCategoryIcon(option.category)}
                        </Typography>
                        <Box>
                          <Typography variant="h6" fontWeight="600">
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.symbol}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
                        {option.description}
                      </Typography>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Typography variant="h5" fontWeight="700" color="primary">
                          {formatCurrency(option.currentPrice)}
                        </Typography>
                        <Chip
                          size="small"
                          label={getRiskLabel(option.riskLevel)}
                          color={getRiskColor(option.riskLevel) as "success" | "warning" | "error"}
                        />
                      </Box>

                      {/* Mini price chart simulation */}
                      {option.priceHistory && option.priceHistory.length > 1 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Recent trend
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: 30 }}>
                            {option.priceHistory.slice(-7).map((ph, i, arr) => {
                              const maxP = Math.max(...arr.map((p) => p.price));
                              const minP = Math.min(...arr.map((p) => p.price));
                              const range = maxP - minP || 1;
                              const height = ((ph.price - minP) / range) * 100;
                              const isUp = i > 0 && ph.price >= arr[i - 1].price;
                              return (
                                <Box
                                  key={i}
                                  sx={{
                                    flex: 1,
                                    height: `${Math.max(20, height)}%`,
                                    bgcolor: isUp ? "success.main" : "error.main",
                                    borderRadius: 0.5,
                                    opacity: 0.7,
                                  }}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                          setSelectedOption(option._id);
                          setBuyDialogOpen(true);
                        }}
                        disabled={(walletData?.wallet?.balance || 0) < option.currentPrice}
                      >
                        {t("investments.buy")}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Educational Tip */}
        <Paper
          sx={{
            p: 3,
            mt: 4,
            background: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box sx={{ fontSize: 50 }}>📊</Box>
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Investment Tip
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Low risk</strong> means your money is safer but grows slowly.
              <strong> High risk</strong> means you could earn more, but also lose more!
              Smart investors spread their money across different investments - this is called &quot;diversification&quot;.
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Buy Dialog */}
      <Dialog open={buyDialogOpen} onClose={() => setBuyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Buy {selectedOptionData?.name}
        </DialogTitle>
        <DialogContent>
          {selectedOptionData && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current Price: {formatCurrency(selectedOptionData.currentPrice)} per share
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Available: {formatCurrency(walletData?.wallet?.balance || 0)}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Amount to invest"
            placeholder="e.g., 10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            helperText={
              amount && selectedOptionData
                ? `You'll get approximately ${(parseFloat(amount) * 100 / selectedOptionData.currentPrice).toFixed(4)} shares`
                : ""
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuyDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleBuy}
            disabled={loading || !amount}
          >
            {loading ? <CircularProgress size={24} /> : t("investments.buy")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sell Dialog */}
      <Dialog open={sellDialogOpen} onClose={() => setSellDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Sell {selectedInvestment?.option?.name}
        </DialogTitle>
        <DialogContent>
          {selectedInvestment && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Current Price: {formatCurrency(selectedInvestment.option.currentPrice)} per share
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                You own: {selectedInvestment.shares.toFixed(4)} shares
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Value: {formatCurrency(selectedInvestment.currentValue)}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Shares to sell"
            value={shares}
            onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ""))}
            helperText={
              shares && selectedInvestment
                ? `You'll receive approximately ${formatCurrency(parseFloat(shares) * selectedInvestment.option.currentPrice)}`
                : ""
            }
          />
          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={() => setShares(selectedInvestment?.shares.toFixed(4) || "")}
          >
            Sell All
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSellDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSell}
            disabled={loading || !shares}
          >
            {loading ? <CircularProgress size={24} /> : t("investments.sell")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
