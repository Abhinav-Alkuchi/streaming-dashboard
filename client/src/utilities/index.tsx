import {
  ShoppingCart,
  Trash2,
  Heart,
  HeartOff,
  Eye,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import type { JSX } from "react";


interface options {
     visibleChars?: number;
      maskChar?: string;
      minMaskLength?: number
}

/**
 * Returns Tailwind CSS classes for event background & text color
 */
export const getEventColor = (type: string = "unknown"): string => {
  const eventType = type.trim().toLowerCase();

  if (eventType.includes("purchase")) return "bg-green-500 text-white";
  if (eventType.includes("add to basket")) return "bg-blue-500 text-white";
  if (eventType.includes("remove from basket")) return "bg-orange-500 text-white";
  if (eventType.includes("add to loves")) return "bg-pink-500 text-white";
  if (eventType.includes("un love") || eventType.includes("unlove"))
    return "bg-purple-500 text-white";
  if (eventType.includes("page view")) return "bg-cyan-500 text-white";

  return "bg-gray-600 text-gray-200"; // fallback style
};

/**
 * Returns a Lucide React icon element based on event type
 */
export const getEventIcon = (type: string = "unknown"): JSX.Element => {
  const eventType = type.trim().toLowerCase();

  switch (true) {
    case eventType.includes("purchase"):
      return <DollarSign size={16} />;
    case eventType.includes("add to basket"):
      return <ShoppingCart size={16} />;
    case eventType.includes("remove from basket"):
      return <Trash2 size={16} />;
    case eventType.includes("add to loves"):
      return <Heart size={16} />;
    case eventType.includes("un love"):
    case eventType.includes("unlove"):
      return <HeartOff size={16} />;
    case eventType.includes("page view"):
      return <Eye size={16} />;
    default:
      return <RefreshCw size={16} className="text-gray-300" />;
  }
};

export const getTrendColor = (trend: string | undefined) => {
    switch (trend) {
      case "up": return "#10B981";
      case "down": return "#EF4444";
      default: return "#6B7280";
    }
  };

  export const scrambleEmail = (email: string) => {
    const visibleChars = 4,
        maskChar = '#',
        minMaskLength = 3
    
    
    if (!email || typeof email !== 'string') {
        return '';
    }
    
    const [localPart, domain] = email.split('@');
    
    if (!localPart || !domain) {
        return email;
    }
    
    const charsToShow = Math.min(visibleChars, localPart.length);
    const visiblePart = localPart.substring(0, charsToShow);
    const maskLength = Math.max(minMaskLength, localPart.length - charsToShow);
    const maskedPart = maskChar.repeat(maskLength);
    
    return `${visiblePart}${maskedPart}@${domain}`;
}
