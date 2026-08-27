import React from 'react';
import { Search, ChevronDown, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import './RejectedApplications.css';

const rejectedApps = [
  { id: 'APP-2026-00010', name: 'Nandhini K', amount: '₹ 3,00,000', date: '11 Aug 2026', reason: 'Insufficient documents' },
  { id: 'APP-2026-00006', name: 'Ramesh P', amount: '₹ 4,50,000', date: '10 Aug 2026', reason: 'Low CIBIL score' },
  { id: 'APP-2026-00005', name: 'Logeshwari S', amount: '₹ 2,20,000', date: '09 Aug 2026', reason: 'Income not verified' },
  { id: 'APP-2026-00004', name: 'Krishnan R', amount: '₹ 6,75,000', date: '08 Aug 2026', reason: 'High existing liabilities' },
  { id: 'APP-2026-00003', name: 'Anandhi V', amount: '₹ 3,10,000', date: '07 Aug 2026', reason: 'Incomplete application' },
  { id: 'APP-2026-00002', name: 'Saravanan T', amount: '₹ 5,00,000', date: '06 Aug 2026', reason: 'Business not stable' },
];

const RejectedApplications = () => {
  return (
    <div className="rejected-apps-container">
      {/* Toolbar Area */}
      <div className="toolbar-section">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by Application ID, Customer Name..." 
            className="search-input"
          />
        </div>
        
        <div className="toolbar-filters">
          <button className="filter-dropdown">
            Filter <ChevronDown size={16} />
          </button>
          <button className="btn-export">
            <Download size={16} /> Export <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="table-wrapper">
        <table className="apps-table">
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Customer Name</th>
              <th>Loan Amount</th>
              <th>Rejected Date</th>
              <th>Rejection Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rejectedApps.map((app, index) => (
              <tr key={index}>
                <td className="font-medium">{app.id}</td>
                <td>{app.name}</td>
                <td>{app.amount}</td>
                <td>{app.date}</td>
                <td>{app.reason}</td>
                <td>
                  <button className="btn-view">
                    <Eye size={16} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="pagination-wrapper">
          <div className="pagination-info">
            Showing 1 to 6 of 7 entries
          </div>
          <div className="pagination-controls">
            <button className="page-btn"><ChevronLeft size={16} /></button>
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <button className="page-btn"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectedApplications;
