/**
 * Formats timestamps in Indian Standard Time (Asia/Kolkata).
 * Example: "04/09/2026 04:15 PM"
 */
export {
  formatDate,
  formatTime,
  formatDateTimeSlash as formatDateTime,
  formatDateTime as formatDateTimeFriendly,
  toIstDateInput,
  getDateTimestamp,
} from '../../../Core/src/utils/dateHelper';
