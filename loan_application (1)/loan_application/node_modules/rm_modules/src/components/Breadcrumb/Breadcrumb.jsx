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
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item}
                </span>
              ) : (
                <span className="breadcrumb-link">{item}</span>
              )}
              {!isLast && ChevronRight && (
                <ChevronRight size={14} className="breadcrumb-separator" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

export default Breadcrumb;
