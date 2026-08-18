import React from 'react';
import { Users, Hourglass, CheckCircle, RotateCcw, ArrowRight, CornerUpLeft, Calendar, ChevronDown } from 'lucide-react';
import './Reports.css';

const reportData = [
  { label: 'Received Applications', total: 18, percentage: 100, color: '#10b981' },
  { label: 'Pending Review', total: 12, percentage: 66.67, color: '#f59e0b' },
  { label: 'Approved Applications', total: 15, percentage: 83.33, color: '#10b981' },
  { label: 'Rejected Applications', total: 7, percentage: 38.89, color: '#ef4444' },
  { label: 'Forwarded to Head', total: 15, percentage: 83.33, color: '#8b5cf6' },
  { label: 'Returned to Back Office', total: 7, percentage: 38.89, color: '#3b82f6' },
];

const Reports = () => {
  return (
    <div className="reports-container">
      {/* Filters Section */}
      <div className="report-filters-card">
        <div className="filter-group">
          <label>Report Type</label>
          <div className="dropdown-input">
            All Reports <ChevronDown size={16} className="icon-right" />
          </div>
        </div>
        <div className="filter-group">
          <label>From Date</label>
          <div className="date-input">
            01 Aug 2026 <Calendar size={16} className="icon-right" />
          </div>
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <div className="date-input">
            12 Aug 2026 <Calendar size={16} className="icon-right" />
          </div>
        </div>
        <div className="filter-button-group">
          <button className="btn-generate">Generate Report</button>
        </div>
      </div>

      {/* Mini Metric Cards */}
      <div className="mini-metric-cards">
        <div className="mini-card">
          <div className="mini-icon" style={{ backgroundColor: '#f3e8ff', color: '#8b5cf6' }}>
            <Users size={20} />
          </div>
          <div className="mini-info">
            <p>Total Received</p>
            <h3>18</h3>
          </div>
        </div>
        <div className="mini-card">
          <div className="mini-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
            <Hourglass size={20} />
          </div>
          <div className="mini-info">
            <p>Pending Review</p>
            <h3>12</h3>
          </div>
        </div>
        <div className="mini-card">
          <div className="mini-icon" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="mini-info">
            <p>Approved</p>
            <h3>15</h3>
          </div>
        </div>
        <div className="mini-card">
          <div className="mini-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
            <RotateCcw size={20} />
          </div>
          <div className="mini-info">
            <p>Rejected</p>
            <h3>07</h3>
          </div>
        </div>
        <div className="mini-card">
          <div className="mini-icon" style={{ backgroundColor: '#f3e8ff', color: '#8b5cf6' }}>
            <ArrowRight size={20} />
          </div>
          <div className="mini-info">
            <p>Forwarded to Head</p>
            <h3>15</h3>
          </div>
        </div>
        <div className="mini-card">
          <div className="mini-icon" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
            <CornerUpLeft size={20} />
          </div>
          <div className="mini-info">
            <p>Returned to Back Office</p>
            <h3>07</h3>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="report-table-card">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Report Type</th>
              <th>Total</th>
              <th>Percentage (%)</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, index) => (
              <tr key={index}>
                <td className="font-medium">{item.label}</td>
                <td>{item.total}</td>
                <td>
                  <div className="progress-cell">
                    <span className="pct-value">{item.percentage}%</span>
                    <div className="progress-track">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="report-footer-note">
          * Percentage is calculated based on total received applications.
        </div>
      </div>
    </div>
  );
};

export default Reports;
