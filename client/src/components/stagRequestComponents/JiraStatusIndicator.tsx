import React from 'react';
import { Box, LinearProgress, Typography, Tooltip } from '@mui/material';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles((theme) => ({
  container: {
    width: '100%',
    minWidth: '120px',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  statusText: {
    fontSize: '0.75rem',
    fontWeight: 500,
    marginTop: 4,
    textAlign: 'center',
  },
}));

interface JiraStatusIndicatorProps {
  status: string;
}

// Map Jira statuses to completion percentages
const getStatusPercentage = (status: string): number => {
  const statusMap: { [key: string]: number } = {
    'To Do': 0,
    'Open': 0,
    'Backlog': 0,
    'In Progress': 50,
    'In Development': 50,
    'Code Review': 60,
    'Testing': 70,
    'QA': 70,
    'Resolved': 75,
    'Ready for Release': 90,
    'Done': 100,
    'Closed': 100,
    'Completed': 100,
  };

  return statusMap[status] ?? 0;
};

// Get color based on percentage
const getProgressColor = (percentage: number): string => {
  if (percentage === 0) return '#9e9e9e'; // Grey
  if (percentage <= 25) return '#f44336'; // Red
  if (percentage <= 50) return '#ff9800'; // Orange
  if (percentage <= 75) return '#2196f3'; // Blue
  return '#4caf50'; // Green
};

const JiraStatusIndicator: React.FC<JiraStatusIndicatorProps> = ({ status }) => {
  const classes = useStyles();
  const percentage = getStatusPercentage(status);
  const color = getProgressColor(percentage);

  return (
    <Tooltip title={`Status: ${status} - ${percentage}% Complete`} arrow>
      <Box className={classes.container}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          className={classes.progressBar}
          sx={{
            '& .MuiLinearProgress-bar': {
              backgroundColor: color,
            },
          }}
        />
        <Typography className={classes.statusText} style={{ color }}>
          {status} ({percentage}%)
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default JiraStatusIndicator;