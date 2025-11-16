/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import { Plus, Download, RefreshCw } from 'lucide-react';
import AddStagRequest from '../stagRequestComponents/AddStagRequest';
import { getAllStagRequests } from '../../hooks/stagRequestService';

interface EventRequest {
  id: string;
  timestamp: string;
  eventType: string;
  platform: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  title?: string;
  description?: string;
  jiraTicket?: string;
  requestId?: string;
  sotType?: string;
  comments?: string;
}

export const EventRequestTab: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const fetchRequests = useCallback(async () => {
    try {
      console.log("Fetching stag requests...");
      const response = await getAllStagRequests();
      console.log("API Response:", response);
      
      if (response.success && response.data) {
        const formattedRequests: EventRequest[] = response.data.map((item: any) => ({
          id: item.id,
          timestamp: item.timestamp,
          eventType: item.sotType || item.eventType || 'Stag Event',
          platform: item.platform || 'All',
          status: mapStatus(item.status),
          progress: getProgressFromStatus(item.status),
          title: item.title,
          description: item.description,
          jiraTicket: item.jiraTicket,
          requestId: item.id,
          sotType: item.sotType,
          comments: item.comments,
        }));
        
        console.log("Formatted requests:", formattedRequests);
        setRequests(formattedRequests);
      } else {
        console.error("Failed to fetch requests:", response.message);
        showSnackBar('Failed to fetch requests', 'error');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      showSnackBar('Error fetching requests', 'error');
    }
  }, []);

  // Fetch requests on component mount and when modal closes
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const mapStatus = (status: string): EventRequest['status'] => {
    if (!status) return 'pending';
    
    switch (status.toLowerCase()) {
      case 'submitted':
      case 'pending':
        return 'pending';
      case 'processing':
      case 'in progress':
        return 'processing';
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'pending';
    }
  };

  const getProgressFromStatus = (status: string): number => {
    switch (status?.toLowerCase()) {
      case 'submitted':
      case 'pending':
        return 0;
      case 'processing':
      case 'in progress':
        return 50;
      case 'completed':
      case 'success':
        return 100;
      case 'failed':
      case 'error':
        return 0;
      default:
        return 0;
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      fetchRequests();
    }, 500);
  };

  const handleDataRefresh = () => {
    fetchRequests();
    showSnackBar('Data refreshed successfully!', 'success');
  };

  const showSnackBar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleDownload = (requestId: string) => {
    console.log(`Downloading request ${requestId}`);
    showSnackBar(`Download started for request ${requestId}`, 'success');
  };

  const handleRefreshRequest = async (requestId: string) => {
    try {
      console.log(`Refreshing request ${requestId}`);
      setRequests(prev => prev.map(req => 
        req.id === requestId && req.status === 'processing' 
          ? { ...req, progress: Math.min(100, (req.progress || 0) + 10) }
          : req
      ));
      showSnackBar(`Refreshed status for request ${requestId}`, 'success');
    } catch (error) {
      console.error('Error refreshing request:', error);
      showSnackBar('Error refreshing request', 'error');
    }
  };

  const getStatusColor = (status: EventRequest['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: EventRequest['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error: unknown) {
      return `Invalid Date: ${error}`;
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        m: 2, // Top margin for header section
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            pl: 1, // Left padding for title
          }}
        >
          Event Requests
        </Typography>
        <Button
          variant="contained"
          onClick={handleOpenModal}
          startIcon={<Plus size={18} />}
          sx={{
            backgroundColor: 'rgb(59 130 246)',
            '&:hover': {
              backgroundColor: 'rgb(37 99 235)'
            },
            textTransform: 'none',
            fontWeight: 'bold',
          }}
        >
          Add Stag Event Request
        </Button>
      </Box>

      {/* Stag Event Request Modal */}
      <Dialog 
        open={isModalOpen} 
        onClose={handleCloseModal} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ 
          sx: { 
            bgcolor: '#1F2937', 
            border: '1px solid #374151',
            minHeight: '600px'
          } 
        }}
      >
        <AddStagRequest
          onClose={handleCloseModal}
          onDataRefresh={handleDataRefresh}
          showSnackBar={showSnackBar}
        />
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            backgroundColor: snackbar.severity === 'success' ? '#10B981' : '#EF4444',
            color: 'white'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Request History */}
      <Card 
        sx={{ 
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid rgb(55 65 81)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid rgb(55 65 81)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 0 }}>
                Request History
              </Typography>
              <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 0.5 }}>
                Track the status of your event generation requests
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={handleDataRefresh}
              startIcon={<RefreshCw size={16} />}
              sx={{
                color: '#06B6D4',
                borderColor: '#06B6D4',
                '&:hover': {
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  borderColor: '#0891B2'
                },
                textTransform: 'none'
              }}
            >
              Refresh
            </Button>
          </Box>

          {requests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" sx={{ color: '#9CA3AF', mb: 2 }}>
                No requests yet.
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                Submit your first event generation request above.
              </Typography>
            </Box>
          ) : (
            <TableContainer 
              component={Paper} 
              sx={{ 
                backgroundColor: 'transparent', 
                boxShadow: 'none',
                borderRadius: 0,
                maxHeight: '600px',
                overflow: 'auto'
              }}
            >
              <Table sx={{ minWidth: 800 }} aria-label="request history table" stickyHeader>
                <TableHead>
                  <TableRow 
                    sx={{
                      '& th': { 
                        py: 1.5,
                        px: 2,
                      } 
                    }}
                  >
                    <TableCell sx={{ color: '#F3F4F6', backgroundColor: '#0f172a', fontWeight: 'bold', fontSize: '14px' }}>
                      Timestamp
                    </TableCell>
                    <TableCell sx={{ color: '#F3F4F6', backgroundColor: '#0f172a', fontWeight: 'bold', fontSize: '14px' }}>
                      Title
                    </TableCell>
                    <TableCell sx={{ color: '#F3F4F6', backgroundColor: '#0f172a', fontWeight: 'bold', fontSize: '14px' }}>
                      Event Type
                    </TableCell>
                    <TableCell sx={{ color: '#F3F4F6', backgroundColor: '#0f172a', fontWeight: 'bold', fontSize: '14px' }}>
                      Platform
                    </TableCell>
                    <TableCell sx={{ color: '#F3F4F6', backgroundColor: '#0f172a', fontWeight: 'bold', fontSize: '14px' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ color: '#F3F4F6', backgroundColor: '#0f172a', fontWeight: 'bold', fontSize: '14px', width: '200px' }}>
                      Progress
                    </TableCell>
                    <TableCell sx={{ color: '#F3F4F6', backgroundColor: '#0f172a', fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow
                      key={request.id}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(55, 65, 81, 0.5)' },
                        transition: 'background-color 0.2s',
                        borderBottom: '1px solid rgb(55 65 81)',
                      }}
                    >
                      <TableCell sx={{ color: '#F3F4F6', fontSize: '14px', py: 2 }}>
                        <Tooltip title={request.timestamp} placement="top">
                          <span>{formatTimestamp(request.timestamp)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ color: '#F3F4F6', fontSize: '14px', py: 2 }}>
                        <Box>
                          <Typography component="div" variant="body2" sx={{ fontWeight: 'medium', color: 'white' }}>
                            {truncateText(request.title || 'Untitled Request', 30)}
                          </Typography>
                          {request.description && (
                            <Typography component="div" variant="caption" sx={{ color: '#9CA3AF' }}>
                              {truncateText(request.description, 40)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#F3F4F6', fontSize: '14px', py: 2 }}>
                        {request.eventType}
                      </TableCell>
                      <TableCell sx={{ color: '#F3F4F6', fontSize: '14px', py: 2 }}>
                        {request.platform}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={getStatusText(request.status)}
                          color={getStatusColor(request.status)}
                          size="small"
                          variant="filled"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '12px',
                            minWidth: '80px',
                            backgroundColor: 
                              request.status === 'completed' ? 'rgb(34 197 94)' :
                              request.status === 'processing' ? 'rgb(59 130 246)' :
                              request.status === 'pending' ? 'rgb(245 158 11)' :
                              'rgb(239 68 68)',
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#F3F4F6', fontSize: '14px', py: 2, minWidth: 150 }}>
                        {request.progress !== undefined ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={request.progress}
                              sx={{ 
                                flexGrow: 1,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'rgb(55 65 81)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 
                                    request.status === 'failed' ? '#EF4444' : 
                                    request.status === 'completed' ? '#10B981' : '#3B82F6',
                                  borderRadius: 3,
                                }
                              }}
                            />
                            <Typography variant="body2" sx={{ color: '#9CA3AF', minWidth: 35, fontSize: '12px' }}>
                              {request.progress}%
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                            Not available
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {request.status === 'completed' && (
                            <Tooltip title="Download results">
                              <IconButton
                                size="small"
                                onClick={() => handleDownload(request.id)}
                                sx={{ 
                                  color: '#10B981',
                                  '&:hover': { 
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Download size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(request.status === 'pending' || request.status === 'processing') && (
                            <Tooltip title="Refresh status">
                              <IconButton
                                size="small"
                                onClick={() => handleRefreshRequest(request.id)}
                                sx={{ 
                                  color: '#F59E0B',
                                  '&:hover': { 
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s',
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
                                rel="noopener noreferrer"
                                sx={{ 
                                  color: '#6366F1',
                                  fontSize: '12px',
                                  '&:hover': { 
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  },
                                  textTransform: 'none'
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
    </div>
  );
};