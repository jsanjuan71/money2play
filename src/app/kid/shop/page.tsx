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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  ArrowBack,
  ShoppingBag,
  CheckCircle,
  Lock,
  Star,
  AutoAwesome,
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

const ITEM_TYPES = [
  { value: "body", label: "Body", icon: "🧍" },
  { value: "hair", label: "Hair", icon: "💇" },
  { value: "outfit", label: "Outfit", icon: "👕" },
  { value: "accessory", label: "Accessory", icon: "✨" },
  { value: "pet", label: "Pet", icon: "🐾" },
  { value: "background", label: "Background", icon: "🖼️" },
];

export default function KidShopPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // Fetch data
  const walletData = useQuery(api.wallets.getWallet, token ? { token } : "skip");
  const shopItems = useQuery(api.shop.getShopItems, {});
  const ownedItemIds = useQuery(
    api.shop.getOwnedItemIds,
    token ? { token } : "skip"
  );

  // Mutations
  const purchaseMutation = useMutation(api.shop.purchaseItem);
  const claimStartersMutation = useMutation(api.shop.claimStarterItems);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<string>("");

  // Redirect if not authenticated as kid
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  // Auto-claim starter items on first visit
  useEffect(() => {
    if (token && ownedItemIds && ownedItemIds.length === 0) {
      claimStartersMutation({ token }).catch(() => {});
    }
  }, [token, ownedItemIds, claimStartersMutation]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "#9E9E9E";
      case "uncommon":
        return "#4CAF50";
      case "rare":
        return "#2196F3";
      case "epic":
        return "#9C27B0";
      case "legendary":
        return "#FF9800";
      default:
        return "#9E9E9E";
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "Common";
      case "uncommon":
        return "Uncommon";
      case "rare":
        return "Rare";
      case "epic":
        return "Epic";
      case "legendary":
        return "Legendary";
      default:
        return rarity;
    }
  };

  const getTypeIcon = (type: string) => {
    const found = ITEM_TYPES.find((t) => t.value === type);
    return found?.icon || "📦";
  };

  const handlePurchase = async () => {
    if (!token || !selectedItem) return;
    setError(null);
    setLoading(true);

    try {
      const result = await purchaseMutation({
        token,
        itemId: selectedItem._id as Id<"avatarItems">,
      });

      setBuyDialogOpen(false);
      setSelectedItem(null);
      setSuccess(
        result.coinPrice > 0
          ? `You bought ${result.itemName} for ${result.coinPrice} coins!`
          : `You claimed ${result.itemName}!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purchase");
    } finally {
      setLoading(false);
    }
  };

  const isOwned = (itemId: Id<"avatarItems">) => {
    return ownedItemIds?.includes(itemId) || false;
  };

  const canAfford = (price: number) => {
    return (walletData?.virtualWallet?.coins || 0) >= price;
  };

  // Filter items by current tab type
  const currentType = ITEM_TYPES[tabValue]?.value;
  const filteredItems = shopItems?.filter((item) => {
    if (item.type !== currentType) return false;
    if (filterRarity && item.rarity !== filterRarity) return false;
    return true;
  });

  // Count items by type for badges
  const getTypeCount = (type: string) => {
    return shopItems?.filter((item) => item.type === type && !isOwned(item._id)).length || 0;
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
          background: "linear-gradient(135deg, #7B1FA2 0%, #E040FB 100%)",
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
              Avatar Shop
            </Typography>
            <AutoAwesome />
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h3" sx={{ mb: 1 }}>🪙</Typography>
                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                  Your Coins
                </Typography>
                <Typography variant="h4" fontWeight="700">
                  {walletData?.virtualWallet?.coins || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h3" sx={{ mb: 1 }}>👕</Typography>
                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                  Items Owned
                </Typography>
                <Typography variant="h4" fontWeight="700">
                  {ownedItemIds?.length || 0} / {shopItems?.length || 0}
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

        {/* Category Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {ITEM_TYPES.map((type, index) => (
              <Tab
                key={type.value}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                    {getTypeCount(type.value) > 0 && (
                      <Chip
                        size="small"
                        label={getTypeCount(type.value)}
                        color="primary"
                        sx={{ height: 20, fontSize: 12 }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Paper>

        {/* Rarity Filter */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Rarity</InputLabel>
            <Select
              value={filterRarity}
              label="Rarity"
              onChange={(e) => setFilterRarity(e.target.value)}
            >
              <MenuItem value="">All Rarities</MenuItem>
              <MenuItem value="common">⚪ Common</MenuItem>
              <MenuItem value="uncommon">🟢 Uncommon</MenuItem>
              <MenuItem value="rare">🔵 Rare</MenuItem>
              <MenuItem value="epic">🟣 Epic</MenuItem>
              <MenuItem value="legendary">🟠 Legendary</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push("/kid/avatar")}
            startIcon={<span>🎨</span>}
          >
            Customize Avatar
          </Button>
        </Box>

        {/* Items Grid */}
        {!filteredItems || filteredItems.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <ShoppingBag sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No items in this category
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check back later for new items!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredItems.map((item) => {
              const owned = isOwned(item._id);
              const affordable = canAfford(item.coinPrice);
              const isFree = item.coinPrice === 0;

              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={item._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      border: `2px solid ${getRarityColor(item.rarity)}`,
                      position: "relative",
                      opacity: owned ? 0.7 : 1,
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: owned ? "none" : "translateY(-4px)",
                        boxShadow: owned ? undefined : 6,
                      },
                    }}
                  >
                    {/* Rarity banner */}
                    {item.rarity === "legendary" && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          background: "linear-gradient(90deg, #FF9800, #FFD54F, #FF9800)",
                          color: "white",
                          textAlign: "center",
                          py: 0.5,
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Star sx={{ fontSize: 14 }} /> LEGENDARY <Star sx={{ fontSize: 14 }} />
                      </Box>
                    )}

                    {/* Owned badge */}
                    {owned && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: item.rarity === "legendary" ? 28 : 8,
                          right: 8,
                          bgcolor: "success.main",
                          color: "white",
                          borderRadius: "50%",
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 20 }} />
                      </Box>
                    )}

                    {/* Item preview */}
                    <Box
                      sx={{
                        height: 100,
                        mt: item.rarity === "legendary" ? 3 : 0,
                        background: `linear-gradient(135deg, ${getRarityColor(item.rarity)}22 0%, ${getRarityColor(item.rarity)}44 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 50,
                      }}
                    >
                      {getTypeIcon(item.type)}
                    </Box>

                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="600" noWrap>
                        {item.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={getRarityLabel(item.rarity)}
                        sx={{
                          bgcolor: getRarityColor(item.rarity),
                          color: "white",
                          fontWeight: 600,
                          mt: 0.5,
                          height: 20,
                          fontSize: 11,
                        }}
                      />
                      <Typography
                        variant="h6"
                        fontWeight="700"
                        sx={{
                          mt: 1,
                          color: isFree ? "success.main" : "primary.main",
                        }}
                      >
                        {isFree ? "FREE" : `${item.coinPrice} 🪙`}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ pt: 0 }}>
                      {owned ? (
                        <Button fullWidth disabled variant="outlined" color="success">
                          Owned
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant="contained"
                          disabled={!affordable && !isFree}
                          onClick={() => {
                            setSelectedItem(item);
                            setBuyDialogOpen(true);
                          }}
                          startIcon={!affordable && !isFree ? <Lock /> : undefined}
                        >
                          {isFree ? "Claim" : affordable ? "Buy" : "Need more coins"}
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Shop Tip */}
        <Paper
          sx={{
            p: 3,
            mt: 4,
            background: "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box sx={{ fontSize: 50 }}>🎁</Box>
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              How to Get More Coins
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete <strong>missions</strong> to earn coins! You can also earn coins by
              making <strong>profitable investments</strong> or selling items you don&apos;t need in the
              <strong> marketplace</strong>. Legendary items are super rare - save up!
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Buy Dialog */}
      <Dialog open={buyDialogOpen} onClose={() => setBuyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem?.coinPrice === 0 ? "Claim" : "Buy"} {selectedItem?.name}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              <Box
                sx={{
                  height: 120,
                  background: `linear-gradient(135deg, ${getRarityColor(selectedItem.rarity)}22 0%, ${getRarityColor(selectedItem.rarity)}44 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 70,
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                {getTypeIcon(selectedItem.type)}
              </Box>

              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Chip
                  label={getRarityLabel(selectedItem.rarity)}
                  sx={{
                    bgcolor: getRarityColor(selectedItem.rarity),
                    color: "white",
                    fontWeight: 600,
                  }}
                />
              </Box>

              {selectedItem.coinPrice > 0 ? (
                <>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body1">Price:</Typography>
                    <Typography variant="h5" fontWeight="700" color="primary">
                      {selectedItem.coinPrice} 🪙
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body1">Your coins:</Typography>
                    <Typography variant="h6">
                      {walletData?.virtualWallet?.coins || 0} 🪙
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body1">After purchase:</Typography>
                    <Typography
                      variant="h6"
                      color={
                        (walletData?.virtualWallet?.coins || 0) - selectedItem.coinPrice >= 0
                          ? "success.main"
                          : "error.main"
                      }
                    >
                      {(walletData?.virtualWallet?.coins || 0) - selectedItem.coinPrice} 🪙
                    </Typography>
                  </Box>
                </>
              ) : (
                <Alert severity="success" sx={{ mt: 2 }}>
                  This item is free! Click below to add it to your collection.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : selectedItem?.coinPrice === 0 ? (
              "Claim Item"
            ) : (
              "Confirm Purchase"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
