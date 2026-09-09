/**
 * ProfileAvatar
 * --------------------
 * Universal avatar component for Sivels Finance.
 * Displays backend profile images using role + ID or direct URL,
 * with automatic fallback to name initials on load failure or missing image.
 *
 * Props:
 *   name              {string}        - User/entity full name (used for initials and alt text)
 *   role              {string}        - Role name ('BackOffice', 'RM', 'Agent', 'AMS')
 *   id                {string|number} - Entity ID (backOfficeId, rmId, agentId, amsId)
 *   avatarUrl         {string}        - Direct image URL override if already known
 *   src               {string}        - Alias for avatarUrl
 *   className         {string}        - Additional wrapper or element className
 *   imgClassName      {string}        - CSS class for <img> element
 *   initialsClassName {string}        - CSS class for fallback initials element
 *   alt               {string}        - Custom alt text
 */

import { useState, useEffect } from 'react';
import { getProfileImageUrl, getInitials } from '../../../utils/profileImageHelper';

export default function ProfileAvatar({
  name = '',
  role = '',
  id = null,
  avatarUrl = null,
  src = null,
  className = '',
  imgClassName = 'header-avatar-img',
  initialsClassName = 'header-avatar-initials',
  alt,
  ...rest
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const resolvedUrl = src || avatarUrl || (role && id ? getProfileImageUrl(role, id) : null);

  // Reset error state whenever resolvedUrl changes
  useEffect(() => {
    setImageFailed(false);
  }, [resolvedUrl]);

  if (resolvedUrl && !imageFailed) {
    return (
      <img
        src={resolvedUrl}
        alt={alt || `${name || 'User'} avatar`}
        className={imgClassName}
        onError={() => setImageFailed(true)}
        {...rest}
      />
    );
  }

  const initials = getInitials(name, 'BO');

  return (
    <div className={initialsClassName} aria-hidden="true" {...rest}>
      {initials}
    </div>
  );
}
