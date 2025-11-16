const COLORS = [
  "hsl(var(--chart-1))",  // Primary blue
  "hsl(var(--chart-2))",  // Green
  "hsl(var(--chart-3))",  // Red
  "hsl(var(--chart-4))",  // Purple
  "hsl(var(--chart-5))",  // Amber
  "#27E0F5",              // blue
  "#059669",              // Emerald
  "#DC2626",              // Red
];

// Tab configuration with enable/disable logic
// Index remains constant even when tab is disabled - preserves component logic
const TABS = [
  { index: 0, id: "dashboard", enabled: true, label: "Streaming Dashboard", icon: "BarChart3" },
  { index: 1, id: "historical", enabled: true, label: "Sales Analysis AI", icon: "BadgeDollarSign" },
  { index: 2, id: "purchase-analysis", enabled: true, label: "Click Analysis", icon: "ChartNoAxesCombined" },
  { index: 3, id: "event-stream", enabled: true, label: "Sephora Live", icon: "Radio" },
  { index: 4, id: "customer-journey", enabled: true, label: "Customer Journey", icon: "Users" },
  { index: 5, id: "store-mode", enabled: true, label: "Omni Analytics", icon: "Store" },
  { index: 6, id: "generate-dashboard", enabled: true, label: "Generate Dashboard", icon: "BarChart3" }
] as const;

// Get only enabled tabs for rendering
const getEnabledTabs = () => TABS.filter(tab => tab.enabled);

// Helper function to get tab by index
const getTabByIndex = (index: number) => {
  return TABS.find(tab => tab.index === index);
};

// Helper function to check if tab is enabled
const isTabEnabled = (index: number): boolean => {
  const tab = getTabByIndex(index);
  return tab ? tab.enabled : false;
};

export { COLORS, TABS, getEnabledTabs, getTabByIndex, isTabEnabled };