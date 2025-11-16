import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import moment from 'moment';

interface EventAnalysisData {
  event_date: string;
  event_type: string;
  platform: string;
  count: number;
}

interface EventAnalysisTableProps {
  data: EventAnalysisData[];
  eventType: string;
  platform: string;
  formatEventType: (type: string) => string;
  formatPlatform: (platform: string) => string;
  getEventTypeColor: (type: string) => string;
  getPlatformColor: (platform: string) => string;
}

export const EventAnalysisTable: React.FC<EventAnalysisTableProps> = ({
  data,
  eventType,
  platform,
  formatEventType,
  formatPlatform,
  getEventTypeColor,
  getPlatformColor
}) => {
  if (data.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#9CA3AF' }}>
          No data matching filters
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
          Try adjusting your event type or platform filters
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: '600px' }}>
      <Table stickyHeader sx={{ minWidth: 650 }} aria-label="event analysis table">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'hsl(var(--card))' }}>
            <TableCell sx={{ 
              color: '#F3F4F6', 
              fontWeight: 'bold', 
              fontSize: '14px',
              backgroundColor: 'hsl(var(--card)) !important'
            }}>
              Event Date
            </TableCell>
            <TableCell sx={{ 
              color: '#F3F4F6', 
              fontWeight: 'bold', 
              fontSize: '14px',
              backgroundColor: 'hsl(var(--card)) !important'
            }}>
              Event Type
            </TableCell>
            <TableCell sx={{ 
              color: '#F3F4F6', 
              fontWeight: 'bold', 
              fontSize: '14px',
              backgroundColor: 'hsl(var(--card)) !important'
            }}>
              Platform
            </TableCell>
            <TableCell sx={{ 
              color: '#F3F4F6', 
              fontWeight: 'bold', 
              fontSize: '14px', 
              textAlign: 'right',
              backgroundColor: 'hsl(var(--card)) !important'
            }}>
              Count
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data
            .sort((a, b) => moment(b.event_date).valueOf() - moment(a.event_date).valueOf())
            .map((row, index) => (
            <TableRow
              key={`${row.event_date}-${row.event_type}-${row.platform}-${index}`}
              sx={{ 
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { backgroundColor: '#374151' },
                transition: 'background-color 0.2s',
                backgroundColor: 'hsl(var(--card))',
              }}
            >
              <TableCell sx={{ color: '#F3F4F6', fontSize: '14px' }}>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {moment(row.event_date).format('MMM D, YYYY')}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {moment(row.event_date).format('dddd')}
                  </span>
                </div>
              </TableCell>
              <TableCell sx={{ color: '#F3F4F6', fontSize: '14px' }}>
                <Chip
                  label={formatEventType(row.event_type)}
                  size="small"
                  sx={{
                    backgroundColor: getEventTypeColor(row.event_type) + '20',
                    color: getEventTypeColor(row.event_type),
                    border: `1px solid ${getEventTypeColor(row.event_type)}40`,
                    fontWeight: 500,
                  }}
                />
              </TableCell>
              <TableCell sx={{ color: '#F3F4F6', fontSize: '14px' }}>
                <Chip
                  label={formatPlatform(row.platform)}
                  size="small"
                  sx={{
                    backgroundColor: getPlatformColor(row.platform) + '20',
                    color: getPlatformColor(row.platform),
                    border: `1px solid ${getPlatformColor(row.platform)}40`,
                    fontWeight: 500,
                  }}
                />
              </TableCell>
              <TableCell sx={{ color: '#F3F4F6', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                <span className="bg-gray-700 px-2 py-1 rounded-lg">
                  {row.count.toLocaleString()}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <Box sx={{ p: 3, backgroundColor: 'hsl(var(--card))', borderTop: '1px solid #374151' }}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
            Showing {data.length} records • 
            {eventType !== 'all' && ` Event: ${formatEventType(eventType)} •`}
            {platform !== 'all' && ` Platform: ${formatPlatform(platform)} •`}
            Total events: {data.reduce((sum, row) => sum + row.count, 0).toLocaleString()}
          </Typography>
        </div>
      </Box>
    </TableContainer>
  );
};