/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Plus, RefreshCw, Edit, Trash2 } from "lucide-react";
import AddStagRequest from "../stagRequestComponents/AddStagRequest";
import {
  getAllStagRequests,
  updateStagRequest,
  deleteStagRequest,
  updateJiraTicket,
  closeJiraTicket,
} from "../../hooks/stagRequestService";
import moment from "moment";
// -----------------------------
//         TYPES
// -----------------------------

export type EventRequestStatus =
  | "Pending"
  | "Processing"
  | "Completed"
  | "failed"
  | "Ready for QA"
  | "Closed"
  | "Done";

interface EventRequest {
  id: string;
  timestamp: string;
  eventType: string;
  platform: string;
  status: EventRequestStatus;
  progress: number;
  title?: string;
  description?: string;
  jiraTicket?: string;
  requestId?: string;
  sotType?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
  sotProperties?: any[];
  attachments?: any[];
}

interface StagAPIResponse {
  id: string;
  timestamp: string;
  sotType?: string;
  eventType?: string;
  platform?: string;
  jiraStatus?: string;
  title?: string;
  description?: string;
  jiraTicket?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
  sotProperties?: any[];
  attachments?: any[];
}

// -----------------------------
//      STATUS / PROGRESS MAPS
// -----------------------------

const STATUS_MAP: Record<string, EventRequestStatus> = {
  submitted: "Pending",
  pending: "Pending",
  open: "Pending",
  "to do": "Pending",

  processing: "Processing",
  "in progress": "Processing",

  resolved: "Ready for QA",
  "ready for qa": "Ready for QA",

  completed: "Completed",
  success: "Completed",
  done: "Completed",
  closed: "Completed",

  failed: "failed",
  error: "failed",
};

const PROGRESS_MAP: Record<string, number> = {
  submitted: 0,
  pending: 0,
  open: 0,
  "to do": 0,

  "in progress": 50,

  resolved: 75,
  "ready for qa": 75,

  completed: 100,
  done: 100,
  success: 100,
  closed: 100,

  failed: 0,
  error: 0,
};

// -----------------------------
//         UTIL FUNCTIONS
// -----------------------------

const mapStatus = (status?: string): EventRequestStatus => {
  if (!status) return "Pending";
  const normalized = status.toLowerCase();
  return STATUS_MAP[normalized] ?? "Pending";
};

const getProgressFromStatus = (status?: string): number => {
  if (!status) return 0;
  const normalized = status.toLowerCase();
  return PROGRESS_MAP[normalized] ?? 0;
};

const formatTimestamp = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid Date";
  }
};

const truncate = (text?: string, max = 50): string => {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const getStatusColor = (status: EventRequestStatus) => {
  switch (status) {
    case "Completed":
    case "Closed":
    case "Done":
      return "success";
    case "Processing":
      return "info";
    case "Pending":
      return "warning";
    case "failed":
      return "error";
    default:
      return "default";
  }
};

const getStatusText = (status: EventRequestStatus) => status;

// -----------------------------
//       MAIN COMPONENT
// -----------------------------

export const EventRequestTab: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<EventRequest | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<EventRequest | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Fetch API data
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllStagRequests();

      if (response.success && Array.isArray(response.data)) {
        const formatted: EventRequest[] = response.data.map(
          (item: StagAPIResponse) => ({
            id: item.id,
            timestamp: moment(item.createdAt).isValid()
              ? moment(item.timestamp).toISOString()
              : new Date().toISOString(),
            eventType: item.sotType || item.eventType || "Stag Event",
            platform: item.platform || "All",
            status: mapStatus(item.jiraStatus),
            progress: getProgressFromStatus(item.jiraStatus),
            title: item.title,
            description: item.description,
            jiraTicket: item.jiraTicket,
            requestId: item.id,
            sotType: item.sotType,
            comments: item.comments,
            sotProperties: item.sotProperties,
            attachments: item.attachments || [],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })
        );

        setRequests(formatted);
      } else {
        showSnackBar("Failed to fetch requests", "error");
        setRequests([]);
      }
    } catch (e) {
      showSnackBar("Error fetching requests", "error");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const showSnackBar = (message: string, severity: "success" | "error") =>
    setSnackbar({ open: true, message, severity });

  const handleRefreshRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id && req.status === "Processing"
          ? { ...req, progress: Math.min(100, req.progress + 10) }
          : req
      )
    );

    showSnackBar(`Request ${id} refreshed`, "success");
  };

  const handleEditRequest = (request: EventRequest) => {
    setEditingRequest(request);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (request: EventRequest) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;

    setDeletingId(requestToDelete.id);

    try {
      // Extract issue key from Jira ticket URL
      let issueKey = "";
      if (requestToDelete.jiraTicket) {
        const match = requestToDelete.jiraTicket.match(/browse\/([A-Z]+-\d+)/);
        if (match) {
          issueKey = match[1];
        }
      }

      // Close Jira ticket if exists with deletion comment
      if (issueKey) {
        try {
          await closeJiraTicket(
            issueKey,
            "This ticket has been deleted by the user"
          );
          console.log(
            `Jira ticket ${issueKey} closed successfully with deletion comment`
          );
        } catch (jiraError) {
          console.error("Error closing Jira ticket:", jiraError);
          // Continue with deletion even if Jira close fails
        }
      }

      // Delete from database
      const response = await deleteStagRequest(requestToDelete.id);

      if (response.success) {
        showSnackBar("Request deleted successfully", "success");
        fetchRequests();
      } else {
        throw new Error(response.message || "Failed to delete request");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      showSnackBar(error.message || "Error deleting request", "error");
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRequest(null);
  };

  const handleModalClose = () => {
    handleCloseModal();
    setTimeout(fetchRequests, 500);
  };

  return (
    <>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          m: 2,
        }}
      >
        <Typography variant="h5" sx={{ color: "white", fontWeight: "bold" }}>
          Event Requests
        </Typography>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setIsModalOpen(true)}
          sx={{
            backgroundColor: "rgb(59 130 246)",
            "&:hover": { backgroundColor: "rgb(37 99 235)" },
            textTransform: "none",
            fontWeight: "bold",
          }}
        >
          Add Stag Event Request
        </Button>
      </Box>

      {/* MODAL */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#1F2937",
            border: "1px solid #374151",
            minHeight: "600px",
          },
        }}
      >
        <AddStagRequest
          onClose={handleModalClose}
          onDataRefresh={fetchRequests}
          showSnackBar={showSnackBar}
          editData={editingRequest}
        />
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deletingId && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "#1F2937",
            border: "1px solid #374151",
          },
        }}
      >
        <DialogTitle sx={{ color: "white", borderBottom: "1px solid #374151" }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography sx={{ color: "white", mb: 2 }}>
            Are you sure you want to delete this request?
          </Typography>
          {requestToDelete && (
            <Box sx={{ bgcolor: "#111827", p: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                <strong style={{ color: "white" }}>Title:</strong>{" "}
                {requestToDelete.title}
              </Typography>
              <Typography variant="body2" sx={{ color: "#9CA3AF", mt: 1 }}>
                <strong style={{ color: "white" }}>Request ID:</strong>{" "}
                {requestToDelete.id}
              </Typography>
              {requestToDelete.jiraTicket && (
                <Typography variant="body2" sx={{ color: "#9CA3AF", mt: 1 }}>
                  <strong style={{ color: "white" }}>Note:</strong> The
                  associated Jira ticket will be closed.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #374151", p: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={!!deletingId}
            sx={{ color: "#9CA3AF" }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={!!deletingId}
            variant="contained"
            startIcon={
              deletingId ? <CircularProgress size={16} /> : <Trash2 size={16} />
            }
            sx={{
              bgcolor: "#EF4444",
              "&:hover": { bgcolor: "#DC2626" },
              "&:disabled": { bgcolor: "#4B5563" },
            }}
          >
            {deletingId ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{
            backgroundColor:
              snackbar.severity === "success" ? "#10B981" : "#EF4444",
            color: "white",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* TABLE CARD */}
      <Card
        sx={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid rgb(55 65 81)",
          backdropFilter: "blur(8px)",
          position: "relative",
          minHeight: "400px",
        }}
      >
        {/* LOADING OVERLAY */}
        {loading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
              borderRadius: "8px",
            }}
          >
            <CircularProgress
              size={60}
              sx={{
                color: "rgb(59 130 246)",
                mb: 2,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              Loading Event Requests...
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#9CA3AF",
                mt: 1,
              }}
            >
              Please wait while we fetch your data
            </Typography>
          </Box>
        )}

        <CardContent sx={{ p: 0 }}>
          {/* TABLE HEADER */}
          <Box
            sx={{
              p: 3,
              borderBottom: "1px solid rgb(55 65 81)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ color: "white" }}>
                Request History
              </Typography>
              <Typography variant="body2" sx={{ color: "#9CA3AF", mt: 0.5 }}>
                Track the status of your event generation requests
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={fetchRequests}
              startIcon={<RefreshCw size={16} />}
              disabled={loading}
              sx={{
                with: "15px",
                height: "35px",
                color: "#06B6D4",
                borderColor: "#06B6D4",
                "&:hover": {
                  backgroundColor: "rgba(6, 182, 212, 0.1)",
                  borderColor: "#0891B2",
                },
                "&:disabled": {
                  color: "#6B7280",
                  borderColor: "#6B7280",
                },
                textTransform: "none",
              }}
            >
              Refresh
            </Button>
          </Box>

          {/* CONTENT */}
          {!loading && requests.length === 0 ? (
            // EMPTY STATE
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography sx={{ color: "#9CA3AF", mb: 2 }}>
                No requests yet.
              </Typography>
              <Typography sx={{ color: "#6B7280" }}>
                Submit your first event request.
              </Typography>
            </Box>
          ) : (
            // TABLE
            <TableContainer
              component={Paper}
              sx={{
                backgroundColor: "transparent",
                boxShadow: "none",
                maxHeight: "600px",
                opacity: loading ? 0.5 : 1,
                transition: "opacity 0.3s ease",
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      "Timestamp",
                      "Title",
                      "Event Type",
                      "Platform",
                      "Status",
                      "Progress",
                      "Attachments",
                      "Actions",
                    ].map((head) => (
                      <TableCell
                        key={head}
                        sx={{
                          color: "#F3F4F6",
                          backgroundColor: "#0f172a",
                          fontWeight: "bold",
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {requests.map((request) => (
                    <TableRow
                      key={request.id}
                      sx={{
                        "&:hover": {
                          backgroundColor: "rgba(55, 65, 81, 0.5)",
                        },
                      }}
                    >
                      <TableCell sx={{ color: "white" }}>
                        <Tooltip title={request.timestamp}>
                          <span>{formatTimestamp(request.timestamp)}</span>
                        </Tooltip>
                      </TableCell>

                      <TableCell sx={{ color: "white" }}>
                        <Typography sx={{ fontWeight: "medium" }}>
                          {truncate(request.title, 30)}
                        </Typography>
                        {request.description && (
                          <Typography
                            variant="caption"
                            sx={{ color: "#9CA3AF" }}
                          >
                            {truncate(request.description, 40)}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ color: "white" }}>
                        {request.eventType}
                      </TableCell>

                      <TableCell sx={{ color: "white" }}>
                        {request.platform}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={getStatusText(request.status)}
                          color={getStatusColor(request.status)}
                          size="small"
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            backgroundColor:
                              request.status === "Completed"
                                ? "#22c55e"
                                : request.status === "Processing"
                                ? "#3b82f6"
                                : request.status === "Pending"
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ minWidth: 170 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={request.progress}
                            sx={{
                              flexGrow: 1,
                              height: 6,
                              borderRadius: 3,
                              "& .MuiLinearProgress-bar": {
                                backgroundColor:
                                  request.status === "failed"
                                    ? "#ef4444"
                                    : request.status === "Completed"
                                    ? "#10B981"
                                    : "#3B82F6",
                              },
                            }}
                          />
                          <Typography
                            sx={{ color: "#9CA3AF", fontSize: "12px" }}
                          >
                            {request.progress}%
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ color: "white" }}>
                        {request.attachments &&
                        request.attachments.length > 0 ? (
                          <Tooltip
                            title={
                              <Box>
                                <Typography variant="body2">
                                  Attachments:
                                </Typography>
                                {request.attachments.map((att, index) => (
                                  <Typography key={index} variant="body2">
                                    • {att.name || `attachment_${index + 1}`}
                                  </Typography>
                                ))}
                              </Box>
                            }
                          >
                            <Chip
                              label={`${request.attachments.length} file(s)`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                color: "#06B6D4",
                                borderColor: "#06B6D4",
                                cursor: "pointer",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // You can add a preview modal here if needed
                                console.log(
                                  "Attachments:",
                                  request.attachments
                                );
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" sx={{ color: "#6B7280" }}>
                            None
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="Edit Request">
                            <IconButton
                              size="small"
                              onClick={() => handleEditRequest(request)}
                              sx={{
                                color: "#06B6D4",
                                "&:hover": {
                                  backgroundColor: "rgba(6,182,212,0.1)",
                                },
                              }}
                            >
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Request">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRequest(request)}
                              disabled={deletingId === request.id}
                              sx={{
                                color: "#EF4444",
                                "&:hover": {
                                  backgroundColor: "rgba(239,68,68,0.1)",
                                },
                                "&:disabled": {
                                  color: "#6B7280",
                                },
                              }}
                            >
                              {deletingId === request.id ? (
                                <CircularProgress
                                  size={16}
                                  sx={{ color: "#6B7280" }}
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </IconButton>
                          </Tooltip>

                          {(request.status === "Pending" ||
                            request.status === "Processing") && (
                            <Tooltip title="Refresh status">
                              <IconButton
                                size="small"
                                onClick={() => handleRefreshRequest(request.id)}
                                sx={{
                                  color: "#F59E0B",
                                  "&:hover": {
                                    backgroundColor: "rgba(245,158,11,0.1)",
                                  },
                                }}
                              >
                                <RefreshCw size={16} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {request.jiraTicket && (
                            <Tooltip title="View Jira Ticket">
                              <Button
                                size="small"
                                href={request.jiraTicket}
                                target="_blank"
                                sx={{
                                  color: "#6366F1",
                                  fontSize: "12px",
                                  textTransform: "none",
                                  "&:hover": {
                                    backgroundColor: "rgba(99,102,241,0.1)",
                                  },
                                }}
                              >
                                Jira
                              </Button>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
};
