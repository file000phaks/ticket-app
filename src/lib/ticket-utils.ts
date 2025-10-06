import {
  Search,
  Filter,
  SortAsc,
  Clock,
  AlertTriangle,
  CheckCircle,
  Wrench,
  MapPin,
  User,
  Calendar,
  Plus,
  Eye,
  MoreHorizontal,
  UserPlus,
} from 'lucide-react';

const getPriorityColor = ( priority: string ) => {
  switch ( priority ) {
    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

const getStatusColor = ( status: string ) => {
  switch ( status ) {
    case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'assigned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'in_progress': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'verified': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

const getStatusIcon = ( status: string ) => {
  switch ( status ) {
    case 'open': return Clock;
    case 'assigned': return UserPlus;
    case 'in_progress': return Wrench;
    case 'resolved': case 'verified': case 'closed': return CheckCircle;
    default: return Clock;
  }
};

export {
    getPriorityColor,
    getStatusColor,
    getStatusIcon
}