/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip
} from '@mui/material';
import { MessageCircle, X, Send, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import type { ChatMessage, ChatBotModalProps, ApiResponse, StatsData } from '../../types';

// Component to render formatted text with bold sections
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <Typography key={index} component="span" sx={{ fontWeight: 'bold', color: 'white' }}>
              {boldText}
            </Typography>
          );
        }
        return (
          <Typography key={index} component="span" sx={{ color: 'white' }}>
            {part}
          </Typography>
        );
      })}
    </>
  );
};

export const ChatBotModal: React.FC<ChatBotModalProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I\'m your Sephora AI Internal Analytics Assistant. I could help you with your queries about purchases, page views, or searches.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API base URL
  const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load stats on mount
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      if (data.totalRecords > 0) {
        console.log(`Loaded stats:`, data);
        console.log(`Total Records: ${data.totalRecords}, Unique Emails: ${data.uniqueEmails}, Unique Dates: ${data.uniqueDates}`);
        console.log(`Previous stats:`, stats);
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [API_BASE, stats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setUploadStatus(`Processing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        setUploadStatus(result.message || 'File uploaded successfully!');
        
        // Load stats
        await loadStats();
        
        // Add success message to chat
        addBotMessage(`Successfully loaded data!\n\n${result.message}\n\nYou can now ask questions about purchases, page views, or searches.`);
      } else {
        setUploadStatus(result.error || 'Upload failed');
        addBotMessage(`Upload failed: ${result.error}`);
      }
    } catch (error: any) {
      setUploadStatus('Error: ' + error.message);
      addBotMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setUploadStatus('Please select a CSV file.');
      return;
    }
    handleFileUpload(file);
  };

  const addBotMessage = (text: string) => {
    const botMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputText;
    setInputText('');

    const thinkingMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: 'Thinking ...',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, thinkingMsg]);

    setTimeout(async () => {
      const response = await generateBotResponse(query);
      setMessages(prev => prev.filter(m => m.id !== thinkingMsg.id).concat({
        id: (Date.now() + 2).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      }));
    }, 800);
  };

  const generateBotResponse = async (query: string): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, topK: 10 }),
      });

      const result: ApiResponse = await response.json();

      if (result.success && result.response) {
        return result.response;
      } else {
        return result.error || "Sorry, I couldn't process your query.";
      }
    } catch (error: any) {
      console.error('Search error:', error);
      return `Error: ${error.message}\n\nPlease make sure you've uploaded data first.`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([messages[0]]);
  };

  const clearData = async () => {
    try {
      const response = await fetch(`${API_BASE}/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' })
      });
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        setUploadStatus('Data cleared from Pinecone');
        setStats(null);
        addBotMessage('All data has been cleared from the database.');
      } else {
        setUploadStatus(result.error || 'Failed to clear data');
      }
    } catch (error: any) {
      setUploadStatus('Error clearing data: ' + error.message);
    }
  };

  const getSuggestedQueries = () => {
    const suggestions = [
      "Show me all purchases from last week",
      "What did john@example.com search for?",
      "Show page views for category 'skincare'",
      "Most expensive purchases",
      "Top 5 search terms",
      "Page views on 2025-10-01",
    ];
    return suggestions;
  };

  // Message component with formatted text
  const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => (
    <Box
      sx={{
        maxWidth: '80%',
        backgroundColor: message.isUser ? 'hsl(var(--chart-1))' : 'rgb(55 65 81)',
        color: 'white',
        p: 2,
        borderRadius: message.isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
        border: `1px solid ${message.isUser ? 'hsl(var(--chart-1))' : 'rgb(75 85 99)'}`,
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        <FormattedText text={message.text} />
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: 0.5, display: 'block', textAlign: 'right' }}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </Box>
  );

  // Stats Panel Component
//   const StatsPanel = () => {
//     if (!stats) {
//       return (
//         <Box sx={{ p: 2, textAlign: 'center', color: '#9CA3AF' }}>
//           <Typography variant="body2">No data loaded yet</Typography>
//         </Box>
//       );
//     }

//     return (
//       <Box sx={{ p: 2 }}>
//         <Typography variant="subtitle2" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
//           Dataset Overview
//         </Typography>
        
//         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
//           <Chip 
//             label={`${stats.totalRecords} Total Events`} 
//             size="small"
//             sx={{ backgroundColor: 'rgb(55 65 81)', color: 'white' }}
//           />
//           <Chip 
//             label={`${stats.uniqueEmails} Users`} 
//             size="small"
//             sx={{ backgroundColor: 'rgb(55 65 81)', color: 'white' }}
//           />
//           <Chip 
//             label={`${stats.uniqueDates} Days`} 
//             size="small"
//             sx={{ backgroundColor: 'rgb(55 65 81)', color: 'white' }}
//           />
//         </Box>

//         <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
//           Events by Type:
//         </Typography>
        
//         <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
//           {stats.byEventType?.purchase && (
//             <Chip 
//               icon={<ShoppingCart size={14} />}
//               label={`${stats.byEventType.purchase} Purchases`}
//               size="small"
//               sx={{ backgroundColor: 'hsl(var(--chart-1))', color: 'white' }}
//             />
//           )}
//           {stats.byEventType?.pageview && (
//             <Chip 
//               icon={<Eye size={14} />}
//               label={`${stats.byEventType.pageview} Page Views`}
//               size="small"
//               sx={{ backgroundColor: 'hsl(var(--chart-2))', color: 'white' }}
//             />
//           )}
//           {stats.byEventType?.search && (
//             <Chip 
//               icon={<SearchIcon size={14} />}
//               label={`${stats.byEventType.search} Searches`}
//               size="small"
//               sx={{ backgroundColor: 'hsl(var(--chart-3))', color: 'white' }}
//             />
//           )}
//         </Box>

//         {stats.byEventType?.purchase && (
//           <Box sx={{ mb: 2 }}>
//             <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
//               Avg Purchase Price: <strong style={{ color: 'white' }}>${stats.avgPrice?.toFixed(2)}</strong>
//             </Typography>
//           </Box>
//         )}

//         {stats.topSearchTerms && stats.topSearchTerms.length > 0 && (
//           <Box>
//             <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
//               Top Search Terms:
//             </Typography>
//             {stats.topSearchTerms.slice(0, 3).map((item, idx) => (
//               <Typography key={idx} variant="caption" sx={{ color: 'white', display: 'block', ml: 1 }}>
//                 • {item.term} ({item.count})
//               </Typography>
//             ))}
//           </Box>
//         )}
//       </Box>
//     );
//   };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{
      sx: {
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid rgb(55 65 81)',
        borderRadius: '12px',
        height: '85vh',
        maxHeight: '850px',
        width: '1200px'
      }
    }}>
      <DialogTitle sx={{ backgroundColor: 'hsl(var(--card))', borderBottom: '1px solid rgb(55 65 81)', color: 'white', py: 2, pr: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MessageCircle size={24} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Sephora AI Interal Analytics Assistant</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Clear chat">
              <Button size="small" onClick={clearChat} sx={{ color: '#9CA3AF', px: 1 }}>
                Clear Chat
              </Button>
            </Tooltip>
            <Tooltip title="Clear data">
              <Button size="small" onClick={clearData} sx={{ color: '#9CA3AF', px: 1 }}>
                Clear Data
              </Button>
            </Tooltip>
            <IconButton onClick={onClose} sx={{ color: '#9CA3AF', '&:hover': { color: 'white' } }}>
              <X size={20} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', height: '100%' }}>
        {/* Main Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Upload Status */}
          {uploadStatus && (
            <Box sx={{ px: 3, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgb(55 65 81)' }}>
              {loading ? <AlertCircle size={16} style={{ color: '#FBBF24' }} /> : <CheckCircle size={16} style={{ color: '#10B981' }} />}
              <Typography variant="caption" sx={{ color: loading ? '#FBBF24' : '#10B981' }}>
                {uploadStatus}
              </Typography>
            </Box>
          )}
          {loading && <LinearProgress sx={{ height: 2 }} />}

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((message) => (
              <Box key={message.id} sx={{ display: 'flex', justifyContent: message.isUser ? 'flex-end' : 'flex-start' }}>
                <MessageBubble message={message} />
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Suggested Queries */}
          {messages.length <= 2 && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
                Try asking:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getSuggestedQueries().slice(0, 3).map((query, idx) => (
                  <Chip
                    key={idx}
                    label={query}
                    size="small"
                    onClick={() => setInputText(query)}
                    sx={{ 
                      backgroundColor: 'rgb(55 65 81)', 
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgb(75 85 99)' }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Input Area */}
          <Box sx={{ p: 3, borderTop: '1px solid rgb(55 65 81)', backgroundColor: 'hsl(var(--card))' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about purchases, page views, or searches..."
                style={{
                  flex: 1,
                  backgroundColor: 'rgb(31 41 55)',
                  border: '1px solid rgb(55 65 81)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: 'white',
                  fontSize: '14px',
                  resize: 'none',
                  minHeight: '44px',
                  maxHeight: '120px',
                  outline: 'none',
                }}
                rows={1}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <Tooltip title="Upload CSV">
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  startIcon={<Upload size={16} />}
                  sx={{
                    borderColor: 'rgb(75 85 99)',
                    color: '#E5E7EB',
                    minWidth: 'auto',
                    px: 2,
                    py: 1.5,
                    '&:hover': {
                      borderColor: 'hsl(var(--chart-1))',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  Upload
                </Button>
              </Tooltip>

              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!inputText.trim() || loading}
                startIcon={<Send size={16} />}
                sx={{
                  backgroundColor: inputText.trim() ? 'hsl(var(--chart-1))' : 'rgb(75 85 99)',
                  color: 'white',
                  px: 2,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: inputText.trim() ? 'hsl(var(--chart-1))' : 'rgb(75 85 99)',
                    transform: inputText.trim() ? 'scale(1.05)' : 'none',
                  },
                }}
              >
                Send
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Stats Sidebar */}
        {/* <Box sx={{ 
          width: '280px', 
          borderLeft: '1px solid rgb(55 65 81)',
          backgroundColor: 'rgb(31 41 55)',
          overflowY: 'auto'
        }}>
          <StatsPanel />
        </Box> */}
      </DialogContent>
    </Dialog>
  );
};