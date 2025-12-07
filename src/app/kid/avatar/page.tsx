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
  CircularProgress,
  IconButton,
  Alert,
  Chip,
  Tabs,
  Tab,
  Card,
  CardActionArea,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  CheckCircle,
  ShoppingBag,
  Clear,
  Save,
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
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const SLOT_TYPES = [
  { value: "background", label: "Background", icon: "🖼️", layer: 0 },
  { value: "body", label: "Body", icon: "🧍", layer: 1 },
  { value: "outfit", label: "Outfit", icon: "👕", layer: 2 },
  { value: "hair", label: "Hair", icon: "💇", layer: 3 },
  { value: "accessory", label: "Accessory", icon: "✨", layer: 4 },
  { value: "pet", label: "Pet", icon: "🐾", layer: 5 },
];

export default function KidAvatarPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // Fetch data
  const avatarConfig = useQuery(
    api.shop.getAvatarConfig,
    token ? { token } : "skip"
  );
  const myInventory = useQuery(
    api.marketplace.getMyInventory,
    token ? { token } : "skip"
  );

  // Mutations
  const equipMutation = useMutation(api.shop.equipItem);
  const unequipMutation = useMutation(api.shop.unequipItem);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const getTypeIcon = (type: string) => {
    const found = SLOT_TYPES.find((t) => t.value === type);
    return found?.icon || "📦";
  };

  const handleEquip = async (itemId: Id<"avatarItems">, slot: string) => {
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      await equipMutation({ token, itemId, slot });
      setSuccess("Item equipped!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to equip");
    } finally {
      setLoading(false);
    }
  };

  const handleUnequip = async (slot: string) => {
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      await unequipMutation({ token, slot });
      setSuccess("Item unequipped!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unequip");
    } finally {
      setLoading(false);
    }
  };

  // Get items by current tab type
  const currentSlot = SLOT_TYPES[tabValue];
  const itemsForSlot = myInventory?.filter(
    (inv) => inv?.item?.type === currentSlot?.value
  );

  // Check if item is currently equipped
  const isEquipped = (itemId: Id<"avatarItems">) => {
    if (!avatarConfig?.equippedItems) return false;
    return Object.values(avatarConfig.equippedItems).includes(itemId);
  };

  // Get equipped item for a slot
  const getEquippedItem = (slot: string) => {
    const items = avatarConfig?.items as Record<string, any> | undefined;
    return items?.[slot] || null;
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
          background: "linear-gradient(135deg, #00BCD4 0%, #00E5FF 100%)",
          py: 4,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <IconButton onClick={() => router.push("/kid")} sx={{ color: "white" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" fontWeight="700">
              Customize Avatar
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Mix and match items from your collection to create your unique look!
          </Typography>
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
          {/* Avatar Preview */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              sx={{
                p: 3,
                textAlign: "center",
                position: "sticky",
                top: 100,
              }}
            >
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Your Avatar
              </Typography>

              {/* Avatar Display */}
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 280,
                  height: 280,
                  mx: "auto",
                  mb: 3,
                  borderRadius: 4,
                  position: "relative",
                  overflow: "hidden",
                  bgcolor: getEquippedItem("background")
                    ? getRarityColor(getEquippedItem("background").rarity) + "33"
                    : "grey.100",
                  border: "4px solid",
                  borderColor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Layered avatar items */}
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Show each equipped item */}
                  {SLOT_TYPES.map((slot) => {
                    const equippedItem = getEquippedItem(slot.value);
                    if (!equippedItem && slot.value !== "body") return null;

                    return (
                      <Box
                        key={slot.value}
                        sx={{
                          position: "absolute",
                          fontSize: slot.value === "background" ? 120 : slot.value === "pet" ? 40 : 60,
                          opacity: slot.value === "background" ? 0.3 : 1,
                          ...(slot.value === "pet" && {
                            bottom: 20,
                            right: 20,
                          }),
                          ...(slot.value === "accessory" && {
                            top: 20,
                            right: 30,
                          }),
                        }}
                      >
                        {equippedItem ? getTypeIcon(equippedItem.type) : (slot.value === "body" ? "🧍" : null)}
                      </Box>
                    );
                  })}

                  {/* Default avatar if nothing equipped */}
                  {!Object.keys(avatarConfig?.items || {}).length && (
                    <Typography sx={{ fontSize: 80 }}>🧍</Typography>
                  )}
                </Box>
              </Box>

              {/* Equipped Items Summary */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Currently Wearing:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                {SLOT_TYPES.map((slot) => {
                  const equippedItem = getEquippedItem(slot.value);
                  if (!equippedItem) return null;

                  return (
                    <Chip
                      key={slot.value}
                      label={`${slot.icon} ${equippedItem.name}`}
                      size="small"
                      onDelete={() => handleUnequip(slot.value)}
                      sx={{
                        bgcolor: getRarityColor(equippedItem.rarity) + "33",
                        borderColor: getRarityColor(equippedItem.rarity),
                        borderWidth: 1,
                        borderStyle: "solid",
                      }}
                    />
                  );
                })}
                {!Object.keys(avatarConfig?.items || {}).length && (
                  <Typography variant="body2" color="text.secondary">
                    No items equipped yet
                  </Typography>
                )}
              </Box>

              <Button
                variant="outlined"
                startIcon={<ShoppingBag />}
                onClick={() => router.push("/kid/shop")}
                sx={{ mt: 3 }}
              >
                Get More Items
              </Button>
            </Paper>
          </Grid>

          {/* Item Selection */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Your Items
              </Typography>

              {/* Category Tabs */}
              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                {SLOT_TYPES.map((slot) => {
                  const count = myInventory?.filter(
                    (inv) => inv?.item?.type === slot.value
                  ).length || 0;
                  const equipped = getEquippedItem(slot.value);

                  return (
                    <Tab
                      key={slot.value}
                      label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <span>{slot.icon}</span>
                          <span>{slot.label}</span>
                          {equipped && (
                            <CheckCircle sx={{ fontSize: 14, color: "success.main" }} />
                          )}
                          <Chip
                            size="small"
                            label={count}
                            sx={{ height: 18, fontSize: 11 }}
                          />
                        </Box>
                      }
                    />
                  );
                })}
              </Tabs>

              {/* Items Grid */}
              {!itemsForSlot || itemsForSlot.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="h1" sx={{ mb: 2 }}>
                    {currentSlot?.icon}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No {currentSlot?.label.toLowerCase()} items yet
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push("/kid/shop")}
                    sx={{ mt: 2 }}
                  >
                    Shop for {currentSlot?.label}
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {/* Unequip option */}
                  {getEquippedItem(currentSlot?.value) && (
                    <Grid size={{ xs: 4, sm: 3 }}>
                      <Card
                        sx={{
                          border: "2px dashed",
                          borderColor: "grey.400",
                          bgcolor: "grey.50",
                        }}
                      >
                        <CardActionArea
                          onClick={() => handleUnequip(currentSlot?.value)}
                          disabled={loading}
                          sx={{ p: 2, textAlign: "center" }}
                        >
                          <Clear sx={{ fontSize: 40, color: "grey.500", mb: 1 }} />
                          <Typography variant="caption" display="block">
                            Remove
                          </Typography>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  )}

                  {itemsForSlot.map((inv) => {
                    if (!inv) return null;
                    const equipped = isEquipped(inv.item._id);

                    return (
                      <Grid size={{ xs: 4, sm: 3 }} key={inv._id}>
                        <Tooltip title={inv.item.name} arrow>
                          <Card
                            sx={{
                              border: "2px solid",
                              borderColor: equipped
                                ? "success.main"
                                : getRarityColor(inv.item.rarity),
                              position: "relative",
                              transition: "transform 0.2s",
                              "&:hover": {
                                transform: "scale(1.05)",
                              },
                            }}
                          >
                            {equipped && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  bgcolor: "success.main",
                                  borderRadius: "50%",
                                  width: 20,
                                  height: 20,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  zIndex: 1,
                                }}
                              >
                                <CheckCircle sx={{ fontSize: 16, color: "white" }} />
                              </Box>
                            )}
                            <CardActionArea
                              onClick={() =>
                                equipped
                                  ? handleUnequip(currentSlot?.value)
                                  : handleEquip(inv.item._id, currentSlot?.value)
                              }
                              disabled={loading}
                              sx={{ p: 1.5, textAlign: "center" }}
                            >
                              <Box
                                sx={{
                                  height: 60,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 40,
                                  bgcolor: getRarityColor(inv.item.rarity) + "22",
                                  borderRadius: 1,
                                  mb: 1,
                                }}
                              >
                                {getTypeIcon(inv.item.type)}
                              </Box>
                              <Typography
                                variant="caption"
                                display="block"
                                noWrap
                                fontWeight={equipped ? 700 : 400}
                              >
                                {inv.item.name}
                              </Typography>
                              <Chip
                                size="small"
                                label={inv.item.rarity}
                                sx={{
                                  height: 16,
                                  fontSize: 10,
                                  mt: 0.5,
                                  bgcolor: getRarityColor(inv.item.rarity),
                                  color: "white",
                                }}
                              />
                            </CardActionArea>
                          </Card>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Paper>

            {/* Tips */}
            <Paper
              sx={{
                p: 3,
                mt: 3,
                background: "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box sx={{ fontSize: 40 }}>💡</Box>
              <Box>
                <Typography variant="subtitle1" fontWeight="600">
                  Avatar Tips
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click an item to equip it. Click again to unequip.
                  Mix different rarities to create a unique look!
                  <strong> Legendary</strong> items have special effects.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
