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
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  ArrowBack,
  Storefront,
  Inventory,
  TrendingUp,
  ShoppingCart,
  Sell,
  Cancel,
  LocalOffer,
  History,
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

export default function KidMarketplacePage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // Fetch data
  const walletData = useQuery(api.wallets.getWallet, token ? { token } : "skip");
  const activeListings = useQuery(
    api.marketplace.getActiveListings,
    token ? { token } : {}
  );
  const myInventory = useQuery(
    api.marketplace.getMyInventory,
    token ? { token } : "skip"
  );
  const myListings = useQuery(
    api.marketplace.getMyListings,
    token ? { token } : "skip"
  );
  const stats = useQuery(
    api.marketplace.getMarketplaceStats,
    token ? { token } : "skip"
  );
  const recentTrades = useQuery(api.marketplace.getRecentTrades, { limit: 5 });

  // Mutations
  const createListingMutation = useMutation(api.marketplace.createListing);
  const cancelListingMutation = useMutation(api.marketplace.cancelListing);
  const purchaseMutation = useMutation(api.marketplace.purchaseListing);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterRarity, setFilterRarity] = useState<string>("");

  // Redirect if not authenticated as kid
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

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
    switch (type) {
      case "body":
        return "🧍";
      case "hair":
        return "💇";
      case "eyes":
        return "👀";
      case "mouth":
        return "👄";
      case "outfit":
        return "👕";
      case "accessory":
        return "✨";
      case "background":
        return "🖼️";
      case "pet":
        return "🐾";
      default:
        return "📦";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePurchase = async () => {
    if (!token || !selectedListing) return;
    setError(null);
    setLoading(true);

    try {
      const result = await purchaseMutation({
        token,
        listingId: selectedListing._id as Id<"marketplaceListings">,
      });

      setBuyDialogOpen(false);
      setSelectedListing(null);
      setSuccess(`You bought ${result.itemName} for ${result.coinPrice} coins!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purchase");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!token || !selectedInventoryItem) return;
    setError(null);
    setLoading(true);

    try {
      const price = parseInt(listingPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      await createListingMutation({
        token,
        inventoryId: selectedInventoryItem._id as Id<"inventory">,
        coinPrice: price,
        description: listingDescription || undefined,
      });

      setSellDialogOpen(false);
      setSelectedInventoryItem(null);
      setListingPrice("");
      setListingDescription("");
      setSuccess("Item listed successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (listingId: Id<"marketplaceListings">) => {
    if (!token) return;
    setError(null);

    try {
      await cancelListingMutation({ token, listingId });
      setSuccess("Listing cancelled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  // Filter listings
  const filteredListings = activeListings?.filter((listing) => {
    if (!listing) return false;
    if (filterType && listing.item.type !== filterType) return false;
    if (filterRarity && listing.item.rarity !== filterRarity) return false;
    return true;
  });

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
          background: "linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)",
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
              Marketplace
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 2,
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
                <Typography variant="h5" fontWeight="700">
                  {walletData?.virtualWallet?.coins || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <LocalOffer sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                  My Listings
                </Typography>
                <Typography variant="h5" fontWeight="700">
                  {stats?.activeListings || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                  Total Earned
                </Typography>
                <Typography variant="h5" fontWeight="700">
                  {stats?.totalEarned || 0} 🪙
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <ShoppingCart sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                  Items Sold
                </Typography>
                <Typography variant="h5" fontWeight="700">
                  {stats?.totalSold || 0}
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
          <Tab icon={<Storefront />} label="Browse" iconPosition="start" />
          <Tab icon={<Inventory />} label="My Inventory" iconPosition="start" />
          <Tab icon={<Sell />} label="My Listings" iconPosition="start" />
        </Tabs>

        {/* Browse Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Filters */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="body">🧍 Body</MenuItem>
                <MenuItem value="hair">💇 Hair</MenuItem>
                <MenuItem value="outfit">👕 Outfit</MenuItem>
                <MenuItem value="accessory">✨ Accessory</MenuItem>
                <MenuItem value="pet">🐾 Pet</MenuItem>
                <MenuItem value="background">🖼️ Background</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Rarity</InputLabel>
              <Select
                value={filterRarity}
                label="Rarity"
                onChange={(e) => setFilterRarity(e.target.value)}
              >
                <MenuItem value="">All Rarities</MenuItem>
                <MenuItem value="common">Common</MenuItem>
                <MenuItem value="uncommon">Uncommon</MenuItem>
                <MenuItem value="rare">Rare</MenuItem>
                <MenuItem value="epic">Epic</MenuItem>
                <MenuItem value="legendary">Legendary</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {!filteredListings || filteredListings.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Storefront sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No items for sale right now
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Check back later or list your own items!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredListings.map((listing) => {
                if (!listing) return null;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={listing._id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        border: `2px solid ${getRarityColor(listing.item.rarity)}`,
                        opacity: listing.isOwnListing ? 0.7 : 1,
                      }}
                    >
                      <Box
                        sx={{
                          height: 120,
                          background: `linear-gradient(135deg, ${getRarityColor(listing.item.rarity)}22 0%, ${getRarityColor(listing.item.rarity)}44 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 60,
                        }}
                      >
                        {getTypeIcon(listing.item.type)}
                      </Box>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="600">
                            {listing.item.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={getRarityLabel(listing.item.rarity)}
                            sx={{
                              bgcolor: getRarityColor(listing.item.rarity),
                              color: "white",
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Seller: {listing.seller.name} (Lvl {listing.seller.level})
                        </Typography>
                        {listing.description && (
                          <Typography variant="body2" sx={{ mb: 1, fontStyle: "italic" }}>
                            &quot;{listing.description}&quot;
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary" fontWeight="700">
                          {listing.coinPrice} 🪙
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          fullWidth
                          variant="contained"
                          disabled={
                            listing.isOwnListing ||
                            (walletData?.virtualWallet?.coins || 0) < listing.coinPrice
                          }
                          onClick={() => {
                            setSelectedListing(listing);
                            setBuyDialogOpen(true);
                          }}
                        >
                          {listing.isOwnListing
                            ? "Your Item"
                            : (walletData?.virtualWallet?.coins || 0) < listing.coinPrice
                            ? "Not enough coins"
                            : "Buy"}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* Recent Trades */}
          {recentTrades && recentTrades.length > 0 && (
            <Paper sx={{ mt: 4, p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <History />
                <Typography variant="h6">Recent Trades</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {recentTrades.map((trade) => {
                if (!trade) return null;
                return (
                  <Box
                    key={trade._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography sx={{ fontSize: 24 }}>
                      {getTypeIcon(trade.item.type)}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="600">
                        {trade.item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {trade.seller} → {trade.buyer}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="600" color="primary">
                      {trade.coinPrice} 🪙
                    </Typography>
                  </Box>
                );
              })}
            </Paper>
          )}
        </TabPanel>

        {/* My Inventory Tab */}
        <TabPanel value={tabValue} index={1}>
          {!myInventory || myInventory.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Inventory sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Your inventory is empty
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Buy items from the shop or marketplace to fill it up!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {myInventory.map((inv) => {
                if (!inv) return null;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={inv._id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        border: `2px solid ${getRarityColor(inv.item.rarity)}`,
                        opacity: inv.isListed ? 0.6 : 1,
                      }}
                    >
                      <Box
                        sx={{
                          height: 100,
                          background: `linear-gradient(135deg, ${getRarityColor(inv.item.rarity)}22 0%, ${getRarityColor(inv.item.rarity)}44 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 50,
                          position: "relative",
                        }}
                      >
                        {getTypeIcon(inv.item.type)}
                        {inv.isListed && (
                          <Chip
                            label="Listed"
                            size="small"
                            color="warning"
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                            }}
                          />
                        )}
                      </Box>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          {inv.item.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={getRarityLabel(inv.item.rarity)}
                          sx={{
                            bgcolor: getRarityColor(inv.item.rarity),
                            color: "white",
                            mt: 1,
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                          From: {inv.acquiredFrom}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          fullWidth
                          variant="outlined"
                          disabled={inv.isListed}
                          onClick={() => {
                            setSelectedInventoryItem(inv);
                            setSellDialogOpen(true);
                          }}
                        >
                          {inv.isListed ? "Already Listed" : "Sell"}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </TabPanel>

        {/* My Listings Tab */}
        <TabPanel value={tabValue} index={2}>
          {!myListings || myListings.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Sell sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No active listings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Go to your inventory to list items for sale!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {myListings.map((listing) => {
                if (!listing) return null;
                const isSold = listing.status === "sold";
                const isCancelled = listing.status === "cancelled";

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={listing._id}>
                    <Card
                      sx={{
                        opacity: isSold || isCancelled ? 0.7 : 1,
                        border: isSold
                          ? "2px solid #4CAF50"
                          : isCancelled
                          ? "2px solid #9E9E9E"
                          : `2px solid ${getRarityColor(listing.item.rarity)}`,
                      }}
                    >
                      <Box
                        sx={{
                          height: 80,
                          background: `linear-gradient(135deg, ${getRarityColor(listing.item.rarity)}22 0%, ${getRarityColor(listing.item.rarity)}44 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 40,
                          position: "relative",
                        }}
                      >
                        {getTypeIcon(listing.item.type)}
                        <Chip
                          label={
                            isSold
                              ? "Sold!"
                              : isCancelled
                              ? "Cancelled"
                              : "Active"
                          }
                          size="small"
                          color={
                            isSold
                              ? "success"
                              : isCancelled
                              ? "default"
                              : "primary"
                          }
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                          }}
                        />
                      </Box>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="600">
                          {listing.item.name}
                        </Typography>
                        <Typography variant="h6" color="primary" fontWeight="700">
                          {listing.coinPrice} 🪙
                        </Typography>
                        {isSold && listing.buyer && (
                          <Typography variant="body2" color="success.main">
                            Sold to {listing.buyer.name}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          Listed: {formatDate(listing.createdAt)}
                        </Typography>
                      </CardContent>
                      {listing.status === "active" && (
                        <CardActions>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={() => handleCancelListing(listing._id as Id<"marketplaceListings">)}
                          >
                            Cancel
                          </Button>
                        </CardActions>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </TabPanel>

        {/* Marketplace Tip */}
        <Paper
          sx={{
            p: 3,
            mt: 4,
            background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box sx={{ fontSize: 50 }}>💡</Box>
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Marketplace Tips
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Rare items</strong> are worth more! Check the rarity badge before buying.
              <strong> Legendary</strong> items are super special and hard to find.
              You can earn coins by completing missions and selling items you don&apos;t need!
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Buy Dialog */}
      <Dialog open={buyDialogOpen} onClose={() => setBuyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Buy {selectedListing?.item?.name}
        </DialogTitle>
        <DialogContent>
          {selectedListing && (
            <Box>
              <Box
                sx={{
                  height: 100,
                  background: `linear-gradient(135deg, ${getRarityColor(selectedListing.item.rarity)}22 0%, ${getRarityColor(selectedListing.item.rarity)}44 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 60,
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                {getTypeIcon(selectedListing.item.type)}
              </Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Seller:</strong> {selectedListing.seller.name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Rarity:</strong>{" "}
                <Chip
                  size="small"
                  label={getRarityLabel(selectedListing.item.rarity)}
                  sx={{
                    bgcolor: getRarityColor(selectedListing.item.rarity),
                    color: "white",
                  }}
                />
              </Typography>
              {selectedListing.description && (
                <Typography variant="body2" sx={{ mb: 2, fontStyle: "italic" }}>
                  &quot;{selectedListing.description}&quot;
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body1">Price:</Typography>
                <Typography variant="h5" fontWeight="700" color="primary">
                  {selectedListing.coinPrice} 🪙
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                <Typography variant="body1">Your coins:</Typography>
                <Typography variant="h6">
                  {walletData?.virtualWallet?.coins || 0} 🪙
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                <Typography variant="body1">After purchase:</Typography>
                <Typography
                  variant="h6"
                  color={
                    (walletData?.virtualWallet?.coins || 0) - selectedListing.coinPrice >= 0
                      ? "success.main"
                      : "error.main"
                  }
                >
                  {(walletData?.virtualWallet?.coins || 0) - selectedListing.coinPrice} 🪙
                </Typography>
              </Box>
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
            {loading ? <CircularProgress size={24} /> : "Confirm Purchase"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sell Dialog */}
      <Dialog open={sellDialogOpen} onClose={() => setSellDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          List {selectedInventoryItem?.item?.name} for Sale
        </DialogTitle>
        <DialogContent>
          {selectedInventoryItem && (
            <Box>
              <Box
                sx={{
                  height: 100,
                  background: `linear-gradient(135deg, ${getRarityColor(selectedInventoryItem.item.rarity)}22 0%, ${getRarityColor(selectedInventoryItem.item.rarity)}44 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 60,
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                {getTypeIcon(selectedInventoryItem.item.type)}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Original shop price: {selectedInventoryItem.item.coinPrice} coins
              </Typography>
              <TextField
                fullWidth
                label="Your Price (coins)"
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Set a fair price to attract buyers!"
              />
              <TextField
                fullWidth
                label="Description (optional)"
                multiline
                rows={2}
                value={listingDescription}
                onChange={(e) => setListingDescription(e.target.value)}
                placeholder="Add a note for buyers..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSellDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateListing}
            disabled={loading || !listingPrice}
          >
            {loading ? <CircularProgress size={24} /> : "List for Sale"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
