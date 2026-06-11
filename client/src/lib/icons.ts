import {
  Megaphone, TrendingUp, PenTool, Search, Headphones, BarChart2,
  Share2, Database, Users, Compass, LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Megaphone,
  TrendingUp,
  PenTool,
  Search,
  Headphones,
  BarChart2,
  Share2,
  Database,
  Users,
  Compass,
};

export function getLucideIcon(name: string): LucideIcon | null {
  return iconMap[name] || null;
}
