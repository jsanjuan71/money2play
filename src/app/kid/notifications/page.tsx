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
  Button,
  Avatar,
  IconButton,
  Chip,
  Divider,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Tooltip,
  Fade,
  Badge,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import StorefrontIcon from "@mui/icons-material/StorefrontOutlined";
import StarIcon from "@mui/icons-material/Star";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import FlagIcon from "@mui/icons-material/Flag";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/Header";

type NotificationType =
  | "approval_request"
  | "approval_response"
  | "allowance_received"
  | "mission_completed"
  | "goal_reached"
  | "marketplace_sale"
  | "level_up"
  | "streak_bonus"
  | "tip";

const notificationConfig: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  approval_request: {
    icon: <ThumbUpIcon />,
    color: "#FF9800",
    bgColor: "#FFF3E0",
  },
  approval_response: {
    icon: <CheckCircleIcon />,
    color: "#4CAF50",
    bgColor: "#E8F5E9",
  },
  allowance_received: {
    icon: <MonetizationOnIcon />,
    color: "#4CAF50",
    bgColor: "#E8F5E9",
  },
  mission_completed: {
    icon: <EmojiEventsIcon />,
    color: "#FFD700",
    bgColor: "#FFFDE7",
  },
  goal_reached: {
    icon: <FlagIcon />,
    color: "#2196F3",
    bgColor: "#E3F2FD",
  },
  marketplace_sale: {
    icon: <StorefrontIcon />,
    color: "#9C27B0",
    bgColor: "#F3E5F5",
  },
  level_up: {
    icon: <StarIcon />,
    color: "#7C4DFF",
    bgColor: "#EDE7F6",
  },
  streak_bonus: {
    icon: <LocalFireDepartmentIcon />,
    color: "#F44336",
    bgColor: "#FFEBEE",
  },
  tip: {
    icon: <LightbulbIcon />,
    color: "#00BCD4",
    bgColor: "#E0F7FA",
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const notificationsData = useQuery(
    api.notifications.getNotificationsGrouped,
    token ? { token } : "skip"
  );

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  const clearOldNotifications = useMutation(api.notifications.clearOldNotifications);
  const checkDailyLogin = useMutation(api.notifications.checkDailyLogin);

  // Check daily login on page load
  useEffect(() => {
    if (token) {
      checkDailyLogin({ token }).catch(console.error);
    }
  }, [token, checkDailyLogin]);

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    if (!token) return;
    try {
      await markAsRead({ token, notificationId });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await markAllAsRead({ token });
      setMenuAnchor(null);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId: Id<"notifications">) => {
    if (!token) return;
    try {
      await deleteNotification({ token, notificationId });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleClearOld = async () => {
    if (!token) return;
    try {
      await clearOldNotifications({ token });
      setMenuAnchor(null);
    } catch (error) {
      console.error("Error clearing old notifications:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderNotificationList = (
    notifications: any[],
    title: string,
    showTitle: boolean = true
  ) => {
    if (notifications.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        {showTitle && (
          <Typography
            variant="overline"
            sx={{
              px: 2,
              py: 1,
              display: "block",
              color: "text.secondary",
              fontWeight: "bold",
            }}
          >
            {title}
          </Typography>
        )}
        <List sx={{ p: 0 }}>
          {notifications.map((notification, index) => {
            const config = notificationConfig[notification.type as NotificationType] ||
              notificationConfig.tip;

            return (
              <Fade in key={notification._id}>
                <Box>
                  <ListItem
                    sx={{
                      py: 2,
                      px: 2,
                      bgcolor: notification.isRead ? "transparent" : "action.hover",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: "action.selected",
                      },
                    }}
                    onClick={() => {
                      if (!notification.isRead) {
                        handleMarkAsRead(notification._id);
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        color="primary"
                        variant="dot"
                        invisible={notification.isRead}
                        overlap="circular"
                        anchorOrigin={{ vertical: "top", horizontal: "left" }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: config.bgColor,
                            color: config.color,
                          }}
                        >
                          {config.icon}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: notification.isRead ? "normal" : "bold",
                          }}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 0.5 }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatTime(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                          sx={{
                            opacity: 0.5,
                            "&:hover": { opacity: 1 },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider component="li" />}
                </Box>
              </Fade>
            );
          })}
        </List>
      </Box>
    );
  };

  if (authLoading || !isAuthenticated || userType !== "kid") {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Skeleton variant="rectangular" width="100%" height="100vh" />
      </Box>
    );
  }

  const hasNotifications =
    notificationsData &&
    (notificationsData.today.length > 0 ||
      notificationsData.yesterday.length > 0 ||
      notificationsData.earlier.length > 0);

  return (
    <Box className="min-h-screen" sx={{ bgcolor: "background.default" }}>
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #7C4DFF 0%, #B388FF 100%)",
          py: 4,
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/kid")}
            sx={{ color: "white", mb: 2 }}
          >
            Back to Dashboard
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "rgba(255,255,255,0.2)",
                }}
              >
                <Badge
                  badgeContent={notificationsData?.unreadCount || 0}
                  color="error"
                  max={99}
                >
                  <NotificationsIcon sx={{ fontSize: 36 }} />
                </Badge>
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ color: "white", fontWeight: "bold" }}>
                  Notifications
                </Typography>
                <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.9)" }}>
                  {notificationsData?.unreadCount
                    ? `${notificationsData.unreadCount} unread`
                    : "All caught up!"}
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: "white" }}
            >
              <MoreVertIcon />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={handleMarkAllAsRead}>
                <DoneAllIcon sx={{ mr: 1 }} fontSize="small" />
                Mark all as read
              </MenuItem>
              <MenuItem onClick={handleClearOld}>
                <ClearAllIcon sx={{ mr: 1 }} fontSize="small" />
                Clear old notifications
              </MenuItem>
            </Menu>
          </Box>
        </Container>
      </Box>

      {/* Notifications List */}
      <Container maxWidth="md" sx={{ mt: -2, pb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            minHeight: 400,
          }}
        >
          {!notificationsData ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box key={i} sx={{ display: "flex", gap: 2, mb: 2, p: 1 }}>
                  <Skeleton variant="circular" width={48} height={48} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="90%" />
                    <Skeleton variant="text" width="30%" />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : !hasNotifications ? (
            <Box
              sx={{
                p: 6,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 400,
              }}
            >
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "grey.100",
                  mb: 2,
                }}
              >
                <NotificationsIcon sx={{ fontSize: 40, color: "grey.400" }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                No notifications yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                When you complete missions, earn achievements, or receive updates,
                they'll appear here.
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push("/kid/missions")}
                sx={{ mt: 3 }}
              >
                Start a Mission
              </Button>
            </Box>
          ) : (
            <Box>
              {renderNotificationList(notificationsData.today, "Today")}
              {renderNotificationList(notificationsData.yesterday, "Yesterday")}
              {renderNotificationList(notificationsData.earlier, "Earlier")}
            </Box>
          )}
        </Paper>

        {/* Notification Legend */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: "grey.50",
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Notification Types
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {Object.entries(notificationConfig).map(([type, config]) => (
              <Chip
                key={type}
                icon={
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: config.bgColor,
                      color: config.color,
                    }}
                  >
                    {config.icon}
                  </Avatar>
                }
                label={type.replace(/_/g, " ")}
                size="small"
                variant="outlined"
                sx={{ textTransform: "capitalize" }}
              />
            ))}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
