import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './Breadcrumb.css';

const Breadcrumb = memo(function Breadcrumb({ items = [] }) {
  const ChevronRight = iconMap['ChevronRight'];

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumb-item">
              {item.route && !isLast ? (
                <a href={item.route} className="breadcrumb-link">
                  {item.label}
                </a>
              ) : (
                <span className={`breadcrumb-text ${isLast ? 'breadcrumb-text--active' : ''}`}>
                  {item.label}
                </span>
              )}
              {!isLast && ChevronRight && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  <ChevronRight size={14} />
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
