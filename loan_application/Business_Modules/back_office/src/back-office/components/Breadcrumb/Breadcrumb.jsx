/**
 * Breadcrumb
 * --------------------
 * Purpose:
 *   Navigation breadcrumb trail for all detail and sub-pages.
 *
 * Responsibilities:
 *   - Render a horizontal breadcrumb list with clickable links.
 *   - Mark the last item as the current page (no link, aria-current).
 *   - Use ChevronRight from iconMap — no direct Lucide import.
 *
 * Props:
 *   items {Array<{ label: string, path?: string }>}
 *         Navigation trail — last item is always the current page.
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import './Breadcrumb.css';

const Breadcrumb = memo(function Breadcrumb({ items = [] }) {
  const ChevronIcon = iconMap['ChevronRight'];

  return (
    <nav className="breadcrumb" aria-label="Page breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="breadcrumb-item">
              {isLast || !item.path ? (
                <span
                  className={isLast ? 'breadcrumb-current' : 'breadcrumb-text'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  {ChevronIcon && <ChevronIcon size={13} strokeWidth={2} />}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

export default Breadcrumb;
