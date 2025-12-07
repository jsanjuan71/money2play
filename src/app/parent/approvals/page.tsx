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
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Divider,
  Alert,
  Skeleton,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SavingsIcon from "@mui/icons-material/Savings";
import SendIcon from "@mui/icons-material/Send";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";

type TabValue = "pending" | "all";

const requestTypeIcons: Record<string, React.ReactNode> = {
  purchase: <ShoppingCartIcon />,
  withdrawal: <SavingsIcon />,
  transfer: <SendIcon />,
  other: <ReceiptIcon />,
};

const requestTypeLabels: Record<string, string> = {
  purchase: "Purchase Request",
  withdrawal: "Withdrawal Request",
  transfer: "Transfer Request",
  other: "Request",
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>("pending");
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [responseAction, setResponseAction] = useState<"approve" | "reject">("approve");
  const [responseNote, setResponseNote] = useState("");
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

  const pendingApprovals = useQuery(
    api.parent.getPendingApprovals,
    token ? { token } : "skip"
  );

  const allApprovals = useQuery(
    api.parent.getAllApprovals,
    token ? { token } : "skip"
  );

  const approveRequest = useMutation(api.parent.approveRequest);
  const rejectRequest = useMutation(api.parent.rejectRequest);

  const handleOpenResponse = (approval: any, action: "approve" | "reject") => {
    setSelectedApproval(approval);
    setResponseAction(action);
    setResponseNote("");
    setResponseDialogOpen(true);
  };

  const handleCloseResponse = () => {
    setResponseDialogOpen(false);
    setSelectedApproval(null);
    setResponseNote("");
  };

  const handleSubmitResponse = async () => {
    if (!token || !selectedApproval) return;

    setLoading(true);
    try {
      if (responseAction === "approve") {
        await approveRequest({
          token,
          approvalId: selectedApproval._id,
          note: responseNote || undefined,
        });
        setSuccessMessage("Request approved successfully!");
      } else {
        await rejectRequest({
          token,
          approvalId: selectedApproval._id,
          note: responseNote || undefined,
        });
        setSuccessMessage("Request rejected");
      }
      setTimeout(() => setSuccessMessage(""), 3000);
      handleCloseResponse();
    } catch (error) {
      console.error("Error responding to request:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "pending":
        return <Chip label="Pending" color="warning" size="small" icon={<PendingIcon />} />;
      case "approved":
        return <Chip label="Approved" color="success" size="small" icon={<CheckCircleIcon />} />;
      case "rejected":
        return <Chip label="Rejected" color="error" size="small" icon={<CancelIcon />} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const displayApprovals = tab === "pending" ? pendingApprovals : allApprovals;

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
            Approval Requests
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.8)" }}>
            Review and respond to requests from your kids
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
                <Avatar sx={{ bgcolor: "warning.light", width: 56, height: 56 }}>
                  <PendingIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {pendingApprovals?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Requests
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
                    {allApprovals?.filter((a) => a.status === "approved").length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved
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
                <Avatar sx={{ bgcolor: "error.light", width: 56, height: 56 }}>
                  <CancelIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {allApprovals?.filter((a) => a.status === "rejected").length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            background: "rgba(255,255,255,0.95)",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              px: 2,
            }}
          >
            <Tab
              label={`Pending (${pendingApprovals?.length || 0})`}
              value="pending"
            />
            <Tab
              label={`All Requests (${allApprovals?.length || 0})`}
              value="all"
            />
          </Tabs>

          {/* Approvals List */}
          <Box sx={{ p: 0 }}>
            {!displayApprovals ? (
              <Box sx={{ p: 3 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={100}
                    sx={{ borderRadius: 2, mb: 2 }}
                  />
                ))}
              </Box>
            ) : displayApprovals.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                {tab === "pending" ? (
                  <>
                    <CheckCircleIcon
                      sx={{ fontSize: 64, color: "success.light", mb: 2 }}
                    />
                    <Typography variant="h6" gutterBottom>
                      All Caught Up!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No pending requests at the moment.
                    </Typography>
                  </>
                ) : (
                  <>
                    <ReceiptIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No Requests Yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      When your kids submit requests, they will appear here.
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {displayApprovals.map((approval, index) => (
                  <Box key={approval._id}>
                    <ListItem
                      sx={{
                        py: 2.5,
                        px: 3,
                        "&:hover": { bgcolor: "grey.50" },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor:
                              approval.status === "pending"
                                ? "warning.light"
                                : approval.status === "approved"
                                ? "success.light"
                                : "error.light",
                          }}
                        >
                          {requestTypeIcons[approval.type] || <ReceiptIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight="bold">
                              {approval.details?.description || requestTypeLabels[approval.type]}
                            </Typography>
                            {getStatusChip(approval.status)}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <PersonIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {approval.kid?.name || "Unknown"}
                                </Typography>
                              </Box>
                              {approval.details?.amount && (
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold", color: "primary.main" }}
                                >
                                  ${(approval.details.amount / 100).toFixed(2)}
                                </Typography>
                              )}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <AccessTimeIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {formatTimeAgo(approval.createdAt)}
                                </Typography>
                              </Box>
                            </Box>
                            {approval.parentNote && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1, fontStyle: "italic" }}
                              >
                                Note: {approval.parentNote}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      {approval.status === "pending" && (
                        <ListItemSecondaryAction>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleOpenResponse(approval, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<CancelIcon />}
                              onClick={() => handleOpenResponse(approval, "reject")}
                            >
                              Reject
                            </Button>
                          </Box>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                    {index < displayApprovals.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Box>
        </Paper>

        {/* Response Dialog */}
        <Dialog
          open={responseDialogOpen}
          onClose={handleCloseResponse}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {responseAction === "approve" ? "Approve Request" : "Reject Request"}
            <IconButton onClick={handleCloseResponse} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedApproval && (
              <Box sx={{ pt: 1 }}>
                {/* Request Summary */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: "grey.50",
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                    <Avatar sx={{ bgcolor: "primary.light" }}>
                      {requestTypeIcons[selectedApproval.type] || <ReceiptIcon />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {selectedApproval.details?.description ||
                          requestTypeLabels[selectedApproval.type]}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        From: {selectedApproval.kid?.name}
                      </Typography>
                    </Box>
                  </Box>
                  {selectedApproval.details?.amount && (
                    <Typography variant="h5" sx={{ mt: 2, fontWeight: "bold" }}>
                      ${(selectedApproval.details.amount / 100).toFixed(2)}
                    </Typography>
                  )}
                </Paper>

                <TextField
                  label="Add a note (optional)"
                  multiline
                  rows={3}
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder={
                    responseAction === "approve"
                      ? "Great job saving up!"
                      : "Let's talk about this first..."
                  }
                  fullWidth
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={handleCloseResponse}>Cancel</Button>
            <Button
              variant="contained"
              color={responseAction === "approve" ? "success" : "error"}
              onClick={handleSubmitResponse}
              disabled={loading}
              startIcon={
                responseAction === "approve" ? <CheckCircleIcon /> : <CancelIcon />
              }
            >
              {loading
                ? "Processing..."
                : responseAction === "approve"
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
