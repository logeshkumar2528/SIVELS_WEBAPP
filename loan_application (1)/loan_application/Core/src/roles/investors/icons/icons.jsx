/**
 * Global icons entry point.
 *
 * lucide-react is a third-party package, same as bootstrap. Components
 * should import icons from THIS file instead of 'lucide-react' directly —
 * that way every icon used across the app is registered in one place,
 * and swapping icon libraries later only means editing this file.
 *
 * Usage in a component:
 *
 *   import { Bell, User, Wallet } from "../icons/icons";
 *
 * To add a new icon: find it at https://lucide.dev/icons, import it
 * from 'lucide-react' below, and re-export it here.
 */

export {
  // Navigation / layout
  LayoutDashboard,
  PlusCircle,
  Users,
  User,
  LogOut,
  ChevronDown,
  Bell,

  // Dashboard stat cards
  Wallet,
  TrendingUp,
  PiggyBank,
  IndianRupee,
  Landmark,
  UserCheck,

  // Activity / alerts
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Clock,
  FileWarning,
  Sparkles,

  // Login
  Lock,
  Eye,
  EyeOff,
  AlertCircle,

  // New Investment
  Home,
  Building2,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,

  // Sidebar (additional sections)
  CreditCard,
  History,
  BarChart3,

  // Customer Allocations
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Percent,

  // Profile
  Mail,
  Phone,
  Calendar,
  Edit2,
  Shield,
  ShieldCheck,
  Camera,
  FileDown,
  Trash2,
  KeyRound,
} from "lucide-react";