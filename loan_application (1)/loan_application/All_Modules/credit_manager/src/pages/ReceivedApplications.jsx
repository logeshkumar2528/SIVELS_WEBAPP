import React from 'react';
import { Search, ChevronDown, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import './ReceivedApplications.css';

const receivedApps = [
  { id: 'APP-2026-00018', name: 'Karthik Kumar', amount: '₹ 5,00,000', date: '12 Aug 2026', source: 'Credit Back Office' },
  { id: 'APP-2026-00017', name: 'Priya Natarajan', amount: '₹ 3,50,000', date: '12 Aug 2026', source: 'Credit Back Office' },
  { id: 'APP-2026-00016', name: 'Suresh Babu', amount: '₹ 7,50,000', date: '11 Aug 2026', source: 'Credit Back Office' },
  { id: 'APP-2026-00015', name: 'Meena Lakshmi', amount: '₹ 2,00,000', date: '11 Aug 2026', source: 'Credit Back Office' },
  { id: 'APP-2026-00014', name: 'Rajeshwari R', amount: '₹ 4,00,000', date: '10 Aug 2026', source: 'Credit Back Office' },
  { id: 'APP-2026-00013', name: 'Arjun Dev', amount: '₹ 6,00,000', date: '10 Aug 2026', source: 'Credit Back Office' },
  { id: 'APP-2026-00012', name: 'Kavitha M', amount: '₹ 4,25,000', date: '10 Aug 2026', source: 'Credit Back Office' },
  { id: 'APP-2026-00011', name: 'Vijaykumar S', amount: '₹ 8,00,000', date: '09 Aug 2026', source: 'Credit Back Office' },
];

const ReceivedApplications = () => {
  return (
    <div className="received-apps-container">
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
            All Stages <ChevronDown size={16} />
          </button>
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
              <th>Received Date</th>
              <th>Source</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {receivedApps.map((app, index) => (
              <tr key={index}>
                <td className="font-medium">{app.id}</td>
                <td>{app.name}</td>
                <td>{app.amount}</td>
                <td>{app.date}</td>
                <td>{app.source}</td>
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
            Showing 1 to 8 of 18 entries
          </div>
          <div className="pagination-controls">
            <button className="page-btn"><ChevronLeft size={16} /></button>
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <button className="page-btn">3</button>
            <button className="page-btn"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivedApplications;
