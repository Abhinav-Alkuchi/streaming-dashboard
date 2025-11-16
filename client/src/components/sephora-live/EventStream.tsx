/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Fade,
} from "@mui/material";
import {
  Refresh,
  ExpandMore
} from "@mui/icons-material";
import type { EventStreamProps } from "../../types";
import { getEventColor, getEventIcon, scrambleEmail } from "../../utilities";

// Enhanced EventItem with modern design
const EventItem: React.FC<{
  event: any;
  isNew: boolean;
  index: number;
}> = React.memo(({ event, isNew, index }) => {
  const eventType = event.sotType || event.type || "unknown";
  const timestamp =
    event.timestamp ||
    event.event_timestamp ||
    event._receivedAt ||
    new Date().toISOString();
  const user = event.user || event.user_id || event.userId || "anonymous";
  const product = event.product || event.display_product || event.sotV215 || "";
  const priceRaw =
    event?.metadata?.price || event?.price || event?.formatted_price || "";
  const metadata = event.metadata || {};
  const quantity = metadata?.quantity || 1;

  // Safely calculate total from semicolon-separated prices
  const total =
    typeof priceRaw === "string"
      ? priceRaw
          .split(";")
          .map((p) => parseFloat(p.replace(/[^0-9.]/g, "")))
          .reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0)
      : 0;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Fade
      in={true}
      timeout={500}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div
        className={`
          relative flex items-start gap-4 p-4 rounded-xl border-l-4 transition-all duration-300 
          bg-linear-to-r from-gray-800 to-gray-900 shadow-lg hover:shadow-xl hover:scale-[1.02]
          backdrop-blur-sm bg-opacity-90 group
          ${isNew ? "border-l-green-500" : "border-l-gray-600"}
        `}
        style={{
          borderLeftWidth: "4px",
          transform: "translateZ(0)",
        }}
      >
        {/* Event Icon with Glow Effect */}
        <div className="relative">
          <div
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center text-white 
              transition-all duration-300 group-hover:scale-110 shadow-lg
              ${getEventColor(eventType).split(" ")[0]}
            `}
          >
            {getEventIcon(eventType)}
          </div>
          {isNew && (
            <div className="absolute -top-1 -right-1">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full" />
            </div>
          )}
        </div>

        {/* Event Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header with Event Type and Time */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Typography
                variant="subtitle1"
                className="font-bold text-white capitalize tracking-wide"
              >
                {String(eventType).replace(/_/g, " ").toLowerCase()}
              </Typography>
              {isNew && (
                <Chip
                  label="NEW"
                  color="success"
                  size="small"
                  className="animate-pulse font-semibold"
                  sx={{ fontSize: "0.7rem", height: "20px" }}
                />
              )}
            </div>
            <Tooltip title={new Date(timestamp).toLocaleString()}>
              <Typography
                variant="caption"
                className="text-gray-400 font-medium"
              >
                {formatTime(timestamp)}
              </Typography>
            </Tooltip>
          </div>

          {/* User and Product Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <Typography variant="body2" className="text-gray-300 font-medium">
                👤 {scrambleEmail(user)}
              </Typography>
              {product && (
                <Typography
                  variant="body2"
                  className="text-blue-300 font-semibold truncate"
                >
                  🛍️ {product}
                </Typography>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-1 text-xs items-center">
            {event.metadata?.platform && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">🌐</span>
                <span className="text-gray-300">{event.metadata.platform}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-gray-500">📦</span>
              <span className="text-gray-300">Qty: {quantity}</span>
            </div>
            {priceRaw && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">💰</span>
                <span className="text-green-400 font-bold">
                  ${total.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hover Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Tooltip title="View details">
            <IconButton size="small" className="bg-gray-700 hover:bg-gray-600">
              <ExpandMore fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </Fade>
  );
});

EventItem.displayName = "EventItem";

export const EventStream: React.FC<EventStreamProps> = React.memo(
  ({ events, isConnected }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevEventsLengthRef = useRef(0);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [newEventsCount, setNewEventsCount] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const checkIfAtBottom = () => {
      if (!containerRef.current) return true;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      return distanceFromBottom <= 100;
    };

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
    };

    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom);
    };

    // Track new events and auto-scroll logic
    useEffect(() => {
      if (
        events.length > prevEventsLengthRef.current &&
        prevEventsLengthRef.current > 0
      ) {
        const newCount = events.length - prevEventsLengthRef.current;
        setNewEventsCount((prev) => prev + newCount);

        if (isAtBottom) {
          setTimeout(scrollToBottom, 100);
        }
      }
      prevEventsLengthRef.current = events.length;
    }, [events.length, isAtBottom]);

    const handleScrollToBottom = () => {
      scrollToBottom();
      setNewEventsCount(0);
    };

    // Memoize event items
    const eventItems = useMemo(() => {
      return events.map((event, index) => (
        <EventItem
          key={event.id || index}
          event={event}
          isNew={index < 3}
          index={index}
        />
      ));
    }, [events]);

    return (
      <div className="space-y-4">
        {/* Header with Controls */}
        {/* <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <Typography variant="h6" className="font-bold text-white">
            Real-time Events
          </Typography>
          <Badge 
            badgeContent={events.length} 
            color="primary" 
            className="animate-pulse"
          />
          <Chip
            icon={isConnected ? <NotificationsActive /> : <NotificationsOff />}
            label={isConnected ? "Connected" : "Connecting..."}
            color={isConnected ? "success" : "warning"}
            variant="outlined"
            size="small"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip title="Refresh">
            <IconButton className="text-blue-400">
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Filter events">
            <IconButton className="text-purple-400">
              <FilterList />
            </IconButton>
          </Tooltip>
        </div>
      </div> */}

        {/* Events Container */}
        <Card className="bg-gray-800 border border-gray-700 h-[600px] overflow-hidden rounded-2xl shadow-2xl">
          <CardContent className="p-0 h-full">
            <div className="h-full flex flex-col">
              {/* New Events Indicator */}
              {newEventsCount > 0 && !isAtBottom && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
                  <Chip
                    icon={<ExpandMore />}
                    label={`${newEventsCount} new events`}
                    onClick={handleScrollToBottom}
                    color="primary"
                    className="animate-bounce cursor-pointer shadow-lg"
                    sx={{ fontWeight: "bold" }}
                  />
                </div>
              )}

              <div
                ref={containerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
                onScroll={handleScroll}
              >
                {events.length === 0 ? (
                  <div className="text-center text-gray-400 py-16 space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-700 rounded-2xl flex items-center justify-center">
                      <Refresh className="animate-spin" />
                    </div>
                    <Typography variant="h6" className="font-semibold">
                      {isConnected
                        ? "Waiting for events..."
                        : "Connecting to event stream..."}
                    </Typography>
                    <Typography variant="body2">
                      Events will appear here in real-time
                    </Typography>
                  </div>
                ) : (
                  <>
                    {eventItems}
                    <div ref={messagesEndRef} className="h-4" />
                  </>
                )}
              </div>

              {/* Scroll to Bottom Button */}
              {showScrollButton && (
                <div className="absolute bottom-4 right-4">
                  <Tooltip title="Scroll to latest">
                    <IconButton
                      onClick={handleScrollToBottom}
                      className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg"
                      size="large"
                    >
                      <ExpandMore />
                    </IconButton>
                  </Tooltip>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Custom CSS for enhanced scrollbar */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(75, 85, 99, 0.3);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.6);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.8);
          }
        `}</style>
      </div>
    );
  }
);

EventStream.displayName = "EventStream";
