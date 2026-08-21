/**
 * iconMap.js
 * --------------------
 * Purpose:
 *   Centralised Lucide React icon registry for the Back Office module.
 *
 * Responsibilities:
 *   - Single import point for every Lucide icon used anywhere in the module.
 *   - Components resolve icons by name string — they never import Lucide directly.
 *   - To change or replace any icon, edit only this file.
 *     Every component consuming that icon updates automatically.
 *
 * Usage:
 *   import iconMap from '../../config/iconMap';
 *   const Icon = iconMap['LayoutDashboard'];
 *   <Icon size={17} />
 */

import {
  /* ---- Navigation ---- */
  LayoutDashboard,
  FilePlus,
  Clock,
  RotateCcw,
  CheckCircle,
  BadgeIndianRupee,
  CreditCard,
  ShieldCheck,
  Landmark,
  FileText,
  Send,
  History,
  BarChart2,
  ClipboardList,
  UserCircle,
  LogOut,

  /* ---- Layout / Header ---- */
  Menu,
  Bell,
  ChevronDown,
  Calendar,

  /* ---- Support widget ---- */
  Headphones,

  /* ---- Stat card trends / Misc ---- */
  TrendingUp,
  TrendingDown,
  XCircle,
  Wallet,

  /* ---- Table / Actions ---- */
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,

  /* ---- Alerts / Severity ---- */
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,

  /* ---- Tasks ---- */
  FileCheck,
  ShieldAlert,
  Building2,
  Banknote,
  Users,

  /* ---- Misc ---- */
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,

  /* ---- Document Verification & Profile ---- */
  Check,
  ZoomIn,
  Expand,
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  MessageSquare,
  ArrowDown,
  Star,
  Shield,
  Laptop,
  Lock,
  Camera,
  Mail,
  Phone,
  Edit3,
} from 'lucide-react';

/* ==========================================
   ICON REGISTRY
   Keys must exactly match the `icon` field
   values used in navConfig.js and anywhere
   else icons are referenced by name string.
========================================== */
const iconMap = {
  /* Navigation */
  LayoutDashboard,
  FilePlus,
  Clock,
  RotateCcw,
  CheckCircle,
  BadgeIndianRupee,
  CreditCard,
  ShieldCheck,
  Landmark,
  FileText,
  Send,
  History,
  BarChart2,
  ClipboardList,
  UserCircle,
  LogOut,

  /* Layout / Header */
  Menu,
  Bell,
  ChevronDown,
  Calendar,

  /* Support */
  Headphones,

  /* Trends */
  TrendingUp,
  TrendingDown,
  XCircle,
  Wallet,

  /* Table / Actions */
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,

  /* Alerts */
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,

  /* Tasks */
  FileCheck,
  ShieldAlert,
  Building2,
  Banknote,
  Users,

  /* Misc */
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,

  /* Document Verification & Profile */
  Check,
  ZoomIn,
  Expand,
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  MessageSquare,
  ArrowDown,
  Star,
  Shield,
  Laptop,
  Lock,
  Camera,
  Mail,
  Phone,
  Edit3,
};

export default iconMap;
