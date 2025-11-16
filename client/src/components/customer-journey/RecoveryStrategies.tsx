import React from 'react';
import { Card, Typography, Box, Button, Chip } from '@mui/material';
import { Send, Mail, MessageCircle, SquarePercent, Clock, TrendingUp } from 'lucide-react';

interface RecoveryStrategiesProps {
  detailed?: boolean;
}

export const RecoveryStrategies: React.FC<RecoveryStrategiesProps> = ({ detailed = false }) => {
  const strategies = [
    {
      name: 'Email Recovery',
      description: 'Send personalized email reminders with product images',
      effectiveness: '15-20%',
      timing: '1-6 hours after abandonment',
      icon: Mail,
      color: '#3B82F6'
    },
    {
      name: 'SMS Notifications',
      description: 'Quick SMS reminders for mobile users',
      effectiveness: '25-30%',
      timing: '30min-2 hours after abandonment',
      icon: MessageCircle,
      color: '#10B981'
    },
    {
      name: 'Discount Offers',
      description: 'Provide limited-time discount codes',
      effectiveness: '30-40%',
      timing: '6-24 hours after abandonment',
      icon: SquarePercent,
      color: '#F59E0B'
    },
    {
      name: 'Push Notifications',
      description: 'Browser push notifications for returning visitors',
      effectiveness: '10-15%',
      timing: '2-8 hours after abandonment',
      icon: Send,
      color: '#EC4899'
    }
  ];

  return (
    <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Recovery Strategies
      </Typography>
      
      <div className="space-y-4">
        {strategies.map((strategy, index) => (
          <Box
            key={strategy.name || index}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 3,
              p: 3,
              backgroundColor: 'hsl(var(--card))',
              borderRadius: '8px',
              border: '1px solid rgb(75 85 99)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: strategy.color,
                transform: 'translateX(4px)'
              }
            }}
          >
            <Box
              sx={{
                backgroundColor: strategy.color + '20',
                borderRadius: '12px',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <strategy.icon size={24} color={strategy.color} />
            </Box>
            
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                {strategy.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgb(156 163 175)', mb: 2 }}>
                {strategy.description}
              </Typography>
              
              {detailed && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<TrendingUp size={14} />}
                    label={`Effectiveness: ${strategy.effectiveness}`}
                    size="small"
                    sx={{ backgroundColor: strategy.color + '20', color: strategy.color }}
                  />
                  <Chip
                    icon={<Clock size={14} />}
                    label={`Timing: ${strategy.timing}`}
                    size="small"
                    sx={{ backgroundColor: '#6B728020', color: '#9CA3AF' }}
                  />
                </Box>
              )}
            </Box>
            
            {/* Implement Button - Right on desktop, below on mobile */}
            <Box sx={{ 
              alignSelf: { xs: 'stretch', md: 'center' },
              minWidth: { xs: 'auto', md: '120px' }
            }}>
              <Button
                variant="outlined"
                startIcon={<Send size={16} />}
                sx={{
                  color: strategy.color,
                  borderColor: strategy.color,
                  whiteSpace: 'nowrap',
                  minWidth: '120px',
                  width: { xs: '100%', md: 'auto' },
                  '&:hover': {
                    backgroundColor: strategy.color + '20',
                    borderColor: strategy.color
                  }
                }}
              >
                Implement
              </Button>
            </Box>
          </Box>
        ))}
      </div>
      
      {!detailed && (
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgb(31 41 55)', borderRadius: '8px' }}>
          <Typography variant="body2" sx={{ color: 'rgb(156 163 175)', textAlign: 'center' }}>
            💡 Combining multiple strategies can increase recovery rates up to 50%
          </Typography>
        </Box>
      )}
    </Card>
  );
};