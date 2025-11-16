import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import type {AbandonedCartMetricsCardProps} from '../../types';

export const AbandonedCartMetricsCard: React.FC<AbandonedCartMetricsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
}) => {
  const isPositive = change >= 0;

  return (
    <Card sx={{ 
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid rgb(75 85 99)',
      backdropFilter: 'blur(8px)',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-2px)',
        borderColor: color,
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <div>
            <Typography variant="h6" sx={{ color: 'rgb(156 163 175)', fontSize: '14px', mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              {value}
            </Typography>
          </div>
          <Box
            sx={{
              backgroundColor: color + '20',
              borderRadius: '12px',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={24} color={color} />
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: isPositive ? '#10B981' : '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <span>{isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%</span>
          <span>from previous period</span>
        </Typography>
      </CardContent>
    </Card>
  );
};