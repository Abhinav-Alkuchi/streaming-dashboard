import { useState } from 'react';
import { Box, IconButton, Tooltip, Badge } from '@mui/material';
import { MessageCircle } from 'lucide-react';
import { ChatBotModal } from './ChatBotModal';

interface ChatBotIconProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const ChatBotIcon: React.FC<ChatBotIconProps> = ({ 
  position = 'bottom-right' 
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'bottom-left':
        return { ...baseStyles, bottom: 24, left: 24 };
      case 'top-right':
        return { ...baseStyles, top: 24, right: 24 };
      case 'top-left':
        return { ...baseStyles, top: 24, left: 24 };
      case 'bottom-right':
      default:
        return { ...baseStyles, bottom: 24, right: 24 };
    }
  };

  const handleOpenModal = () => {
    setModalOpen(true);
    setHasNewMessage(false);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <>
      <Box sx={getPositionStyles()}>
        <Tooltip title="Chat with Data Assistant">
          <IconButton
            onClick={handleOpenModal}
            sx={{
              backgroundColor: 'hsl(var(--chart-1))',
              color: 'white',
              width: 56,
              height: 56,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              '&:hover': {
                backgroundColor: 'hsl(var(--chart-1))',
                transform: 'scale(1.05)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
              },
              transition: 'all 0.3s ease',
              animation: hasNewMessage ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.7)',
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(99, 102, 241, 0)',
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)',
                },
              },
            }}
          >
            <Badge
              color="error"
              variant="dot"
              invisible={!hasNewMessage}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MessageCircle size={24} />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      <ChatBotModal
        open={modalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};