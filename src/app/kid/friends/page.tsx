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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Tooltip,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import StarIcon from "@mui/icons-material/Star";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/Header";

type TabValue = "friends" | "requests" | "sent" | "search";

export default function FriendsPage() {
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabValue>("friends");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  // Queries
  const friends = useQuery(api.friends.getFriends, token ? { token } : "skip");
  const pendingRequests = useQuery(api.friends.getPendingRequests, token ? { token } : "skip");
  const sentRequests = useQuery(api.friends.getSentRequests, token ? { token } : "skip");
  const friendStats = useQuery(api.friends.getFriendStats, token ? { token } : "skip");
  const searchResults = useQuery(
    api.friends.searchKids,
    token && searchTerm.length >= 2 ? { token, searchTerm } : "skip"
  );
  const friendProfile = useQuery(
    api.friends.getFriendProfile,
    token && selectedFriend ? { token, friendId: selectedFriend._id } : "skip"
  );

  // Mutations
  const sendRequest = useMutation(api.friends.sendFriendRequest);
  const acceptRequest = useMutation(api.friends.acceptFriendRequest);
  const declineRequest = useMutation(api.friends.declineFriendRequest);
  const cancelRequest = useMutation(api.friends.cancelFriendRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  const handleSendRequest = async (targetKidId: Id<"kids">) => {
    if (!token) return;
    setLoading(true);
    try {
      await sendRequest({ token, targetKidId });
      setSuccessMessage("Friend request sent!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Error sending request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: Id<"friendships">) => {
    if (!token) return;
    setLoading(true);
    try {
      await acceptRequest({ token, friendshipId });
      setSuccessMessage("Friend request accepted!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error accepting request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async (friendshipId: Id<"friendships">) => {
    if (!token) return;
    setLoading(true);
    try {
      await declineRequest({ token, friendshipId });
    } catch (error) {
      console.error("Error declining request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (friendshipId: Id<"friendships">) => {
    if (!token) return;
    setLoading(true);
    try {
      await cancelRequest({ token, friendshipId });
    } catch (error) {
      console.error("Error cancelling request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!token || !friendToRemove) return;
    setLoading(true);
    try {
      await removeFriend({ token, friendshipId: friendToRemove.friendship._id });
      setConfirmRemoveOpen(false);
      setFriendToRemove(null);
      setSuccessMessage("Friend removed");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error removing friend:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = (friend: any) => {
    setSelectedFriend(friend.friend);
    setProfileOpen(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (authLoading || !isAuthenticated || userType !== "kid") {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Skeleton variant="rectangular" width="100%" height="100vh" />
      </Box>
    );
  }

  return (
    <Box className="min-h-screen" sx={{ bgcolor: "background.default" }}>
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)",
          py: 4,
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/kid")}
            sx={{ color: "white", mb: 2 }}
          >
            Back to Dashboard
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: "rgba(255,255,255,0.2)",
              }}
            >
              <GroupIcon sx={{ fontSize: 36 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ color: "white", fontWeight: "bold" }}>
                Friends
              </Typography>
              <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.9)" }}>
                Connect with other kids!
              </Typography>
            </Box>
          </Box>

          {/* Stats */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.95)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
                  {friendStats?.friendCount || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Friends
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.95)",
                  textAlign: "center",
                }}
              >
                <Badge badgeContent={friendStats?.pendingCount || 0} color="error">
                  <Typography variant="h4" sx={{ fontWeight: "bold", color: "warning.main" }}>
                    {pendingRequests?.length || 0}
                  </Typography>
                </Badge>
                <Typography variant="body2" color="text.secondary">
                  Pending Requests
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {successMessage && (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Alert severity="success" icon={<CheckCircleIcon />}>
            {successMessage}
          </Alert>
        </Container>
      )}

      {/* Tabs */}
      <Container maxWidth="lg" sx={{ mt: -2 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            mb: 3,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            variant="fullWidth"
          >
            <Tab
              value="friends"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <GroupIcon fontSize="small" />
                  Friends ({friends?.length || 0})
                </Box>
              }
            />
            <Tab
              value="requests"
              label={
                <Badge badgeContent={pendingRequests?.length || 0} color="error">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonAddIcon fontSize="small" />
                    Requests
                  </Box>
                </Badge>
              }
            />
            <Tab
              value="sent"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <HourglassEmptyIcon fontSize="small" />
                  Sent ({sentRequests?.length || 0})
                </Box>
              }
            />
            <Tab
              value="search"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <SearchIcon fontSize="small" />
                  Find
                </Box>
              }
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Paper elevation={0} sx={{ borderRadius: 3, p: 2, minHeight: 400 }}>
          {/* Friends Tab */}
          {tab === "friends" && (
            <>
              {!friends ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
                  ))}
                </Box>
              ) : friends.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <GroupIcon sx={{ fontSize: 64, color: "grey.300", mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No friends yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Search for siblings to add as friends!
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={() => setTab("search")}
                  >
                    Find Friends
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {friends.map((friendData) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={friendData.friendship._id}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "primary.main",
                            transform: "translateY(-2px)",
                          },
                        }}
                        onClick={() => handleOpenProfile(friendData)}
                      >
                        <CardContent>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                            <Avatar
                              sx={{
                                width: 56,
                                height: 56,
                                bgcolor: "primary.main",
                                fontSize: "1.5rem",
                              }}
                            >
                              {friendData.friend.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {friendData.friend.name}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Chip
                                  icon={<StarIcon sx={{ fontSize: 14 }} />}
                                  label={`Lvl ${friendData.friend.level}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                {friendData.friend.streak > 0 && (
                                  <Chip
                                    icon={<LocalFireDepartmentIcon sx={{ fontSize: 14 }} />}
                                    label={friendData.friend.streak}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Box sx={{ textAlign: "center" }}>
                              <MonetizationOnIcon fontSize="small" color="warning" />
                              <Typography variant="body2">
                                {friendData.friend.coins}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "center" }}>
                              <EmojiEventsIcon fontSize="small" color="primary" />
                              <Typography variant="body2">
                                {friendData.friend.achievementCount}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {/* Pending Requests Tab */}
          {tab === "requests" && (
            <>
              {!pendingRequests ? (
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              ) : pendingRequests.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <PersonAddIcon sx={{ fontSize: 64, color: "grey.300", mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No pending requests
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Friend requests you receive will appear here.
                  </Typography>
                </Box>
              ) : (
                <List>
                  {pendingRequests.map((requestData, index) => (
                    <Box key={requestData.request._id}>
                      <ListItem sx={{ py: 2 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "warning.main" }}>
                            {requestData.requester.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={requestData.requester.name}
                          secondary={`Level ${requestData.requester.level}`}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Tooltip title="Accept">
                              <IconButton
                                color="success"
                                onClick={() => handleAcceptRequest(requestData.request._id)}
                                disabled={loading}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Decline">
                              <IconButton
                                color="error"
                                onClick={() => handleDeclineRequest(requestData.request._id)}
                                disabled={loading}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < pendingRequests.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              )}
            </>
          )}

          {/* Sent Requests Tab */}
          {tab === "sent" && (
            <>
              {!sentRequests ? (
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              ) : sentRequests.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <SendIcon sx={{ fontSize: 64, color: "grey.300", mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No sent requests
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Friend requests you send will appear here.
                  </Typography>
                </Box>
              ) : (
                <List>
                  {sentRequests.map((requestData, index) => (
                    <Box key={requestData.request._id}>
                      <ListItem sx={{ py: 2 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "grey.400" }}>
                            {requestData.recipient.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={requestData.recipient.name}
                          secondary={
                            <Chip
                              label="Pending"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Cancel Request">
                            <IconButton
                              color="error"
                              onClick={() => handleCancelRequest(requestData.request._id)}
                              disabled={loading}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < sentRequests.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              )}
            </>
          )}

          {/* Search Tab */}
          {tab === "search" && (
            <>
              <TextField
                fullWidth
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {searchTerm.length < 2 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <SearchIcon sx={{ fontSize: 64, color: "grey.300", mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Enter at least 2 characters to search
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    You can search for your siblings to add as friends
                  </Typography>
                </Box>
              ) : !searchResults ? (
                <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
              ) : searchResults.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    No results found for "{searchTerm}"
                  </Typography>
                </Box>
              ) : (
                <List>
                  {searchResults.map((result, index) => (
                    <Box key={result._id}>
                      <ListItem sx={{ py: 2 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.main" }}>
                            {result.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={result.name}
                          secondary={`Level ${result.level}`}
                        />
                        <ListItemSecondaryAction>
                          {result.friendshipStatus === "approved" ? (
                            <Chip label="Friends" color="success" size="small" />
                          ) : result.friendshipStatus === "pending" ? (
                            <Chip label="Pending" color="warning" size="small" />
                          ) : (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<PersonAddIcon />}
                              onClick={() => handleSendRequest(result._id)}
                              disabled={loading}
                            >
                              Add
                            </Button>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < searchResults.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              )}
            </>
          )}
        </Paper>
      </Container>

      {/* Friend Profile Dialog */}
      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedFriend && (
          <>
            <Box
              sx={{
                background: "linear-gradient(135deg, #7C4DFF 0%, #B388FF 100%)",
                py: 4,
                textAlign: "center",
                position: "relative",
              }}
            >
              <IconButton
                onClick={() => setProfileOpen(false)}
                sx={{ position: "absolute", top: 8, right: 8, color: "white" }}
              >
                <CloseIcon />
              </IconButton>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  bgcolor: "rgba(255,255,255,0.2)",
                  fontSize: "2rem",
                  mb: 1,
                }}
              >
                {selectedFriend.name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" sx={{ color: "white", fontWeight: "bold" }}>
                {selectedFriend.name}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1 }}>
                <Chip
                  icon={<StarIcon />}
                  label={`Level ${friendProfile?.level || selectedFriend.level}`}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                />
                {(friendProfile?.streak || selectedFriend.streak) > 0 && (
                  <Chip
                    icon={<LocalFireDepartmentIcon />}
                    label={`${friendProfile?.streak || selectedFriend.streak} day streak`}
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                )}
              </Box>
            </Box>

            <DialogContent>
              {!friendProfile ? (
                <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
              ) : (
                <>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 4 }}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: "center", bgcolor: "grey.50", borderRadius: 2 }}>
                        <MonetizationOnIcon color="warning" />
                        <Typography variant="h6" fontWeight="bold">
                          {friendProfile.coins}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Coins
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: "center", bgcolor: "grey.50", borderRadius: 2 }}>
                        <EmojiEventsIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          {friendProfile.achievementCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Badges
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: "center", bgcolor: "grey.50", borderRadius: 2 }}>
                        <StarIcon color="secondary" />
                        <Typography variant="h6" fontWeight="bold">
                          {friendProfile.missionsCompleted}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Missions
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {friendProfile.recentAchievements.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Recent Achievements
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {friendProfile.recentAchievements.map((achievement: any, i: number) => (
                          <Chip
                            key={i}
                            icon={<EmojiEventsIcon />}
                            label={achievement.name}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {friendProfile.friendSince && (
                    <Typography variant="caption" color="text.secondary">
                      Friends since {formatDate(friendProfile.friendSince)}
                    </Typography>
                  )}
                </>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button
                color="error"
                startIcon={<PersonRemoveIcon />}
                onClick={() => {
                  setFriendToRemove(friends?.find((f) => f.friend._id === selectedFriend._id));
                  setProfileOpen(false);
                  setConfirmRemoveOpen(true);
                }}
              >
                Remove Friend
              </Button>
              <Button variant="contained" onClick={() => setProfileOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Confirm Remove Dialog */}
      <Dialog
        open={confirmRemoveOpen}
        onClose={() => setConfirmRemoveOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Remove Friend?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {friendToRemove?.friend?.name} as a friend?
            You can always add them back later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemoveOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRemoveFriend}
            disabled={loading}
          >
            {loading ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
