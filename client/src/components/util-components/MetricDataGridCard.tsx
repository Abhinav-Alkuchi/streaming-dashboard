import { useState } from "react";
import { MetricCard } from "./MetricCard";
import { Table, Expand, Minimize2 } from "lucide-react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Modal,
  Box,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import type { MetricDataGridCardProps } from "../../types";



export const MetricDataGridCard = ({
  title,
  description,
  data,
  isLoading = false,
}: MetricDataGridCardProps) => {
  const [isEnlarged, setIsEnlarged] = useState(false);
  const handleEnlarge = () => setIsEnlarged(true);
  const handleMinimize = () => setIsEnlarged(false);

  if (isLoading) {
    return (
      <MetricCard
        title={title}
        value="Loading..."
        icon={Table}
        isLoading={true}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <MetricCard
        title={title}
        value="No data"
        change="0 records"
        icon={Table}
        trend="neutral"
      />
    );
  }

  const columns = Object.keys(data[0]);
  const totalRecords = data.length;

  const renderTable = (isModalView = false) => (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: "hsl(var(--card))",
        borderWidth: "1px",
        maxHeight: isModalView ? "calc(95vh - 200px)" : "400px",
        height: isModalView ? "100%" : "400px",
        overflow: "auto",
        '& .MuiTable-root': {
          minWidth: '100%',
        }
      }}
    >
      <MuiTable 
        stickyHeader 
        size="small"
        sx={{
          '& .MuiTableCell-root': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
          }
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column}
                sx={{
                  backgroundColor: "#374151",
                  color: "#F9FAFB",
                  fontWeight: "bold",
                  borderColor: "#4B5563",
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              sx={{
                "&:hover": { backgroundColor: "#374151" },
                borderColor: "#4B5563",
                '&:last-child td': { borderBottom: 0 }
              }}
            >
              {columns.map((column) => (
                <TableCell
                  key={column}
                  sx={{
                    color: "#D1D5DB",
                    borderColor: "#4B5563",
                    fontSize: "0.875rem",
                  }}
                  title={String(row[column] || "")}
                >
                  {typeof row[column] === "number"
                    ? (row[column] as number).toLocaleString()
                    : String(row[column] || "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );

  return (
    <>
      {/* Compact Card View */}
      <Card
        sx={{
          p: 3,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          borderWidth: "1px",
          backgroundColor: "hsl(var(--card))",
          height: "100%",
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CardContent sx={{ 
          p: 0, 
          "&:last-child": { pb: 0 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Table size={20} className="text-blue-400" />
              <div>
                <Typography variant="h6" color="#FFFFFF" component="h3">
                  {title}
                </Typography>
                {description && (
                  <Typography variant="body2" color="hsl(var(--muted-foreground))" className="mt-1">
                    {description}
                  </Typography>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Typography variant="body2" color="#9CA3AF">
                {totalRecords} records
              </Typography>
              <IconButton
                onClick={handleEnlarge}
                sx={{
                  color: "#9CA3AF",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { 
                    color: "hsl(var(--chart-1))", 
                    backgroundColor: "rgba(59, 130, 246, 0.1)" 
                  },
                  width: 40,
                  height: 40,
                }}
              >
                <Expand size={20} />
              </IconButton>
            </div>
          </div>
          
          {/* Table Container with proper height */}
          <div className="flex-1 min-h-0"> {/* This ensures proper flex growth */}
            {renderTable(false)}
          </div>
        </CardContent>
      </Card>

      {/* Enlarged Modal View */}
      <Modal 
        open={isEnlarged} 
        onClose={handleMinimize}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: "95vw",
            height: "95vh",
            maxWidth: "1400px",
            backgroundColor: "hsl(var(--card))",
            borderWidth: "1px",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-800 shrink-0">
            <div>
              <Typography variant="h5" color="#FFFFFF" fontWeight="bold">
                {title}
              </Typography>
              {description && (
                <Typography variant="body1" color="hsl(var(--muted-foreground))" className="mt-1">
                  {description}
                </Typography>
              )}
              <Typography variant="body2" color="#6B7280" className="mt-1">
                Total: {totalRecords} records
              </Typography>
            </div>
            <IconButton
              onClick={handleMinimize}
              sx={{
                color: "#9CA3AF",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { 
                  color: "#EF4444", 
                  backgroundColor: "rgba(239, 68, 68, 0.1)" 
                },
                width: 48,
                height: 48,
              }}
            >
              <Minimize2 size={24} />
            </IconButton>
          </div>

          {/* Modal Content - Takes remaining space */}
          <div className="flex-1 p-6 min-h-0">
            {renderTable(true)}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800 text-center shrink-0">
            <Typography variant="body2" color="#9CA3AF">
              Showing all {totalRecords} records
            </Typography>
          </div>
        </Box>
      </Modal>
    </>
  );
};