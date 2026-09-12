import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  FileCheck,
  History,
  AlertCircle
} from 'lucide-react';
import { ROUTES } from '../../config/routeConfig';
import { getCurrentRMContext } from '../../utils/rmContext';
import './CustomerSubmissionHistory.css';

export default function CustomerSubmissionHistory() {
  const navigate = useNavigate();
  const rmContext = getCurrentRMContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Currently, RM-created customer backend API is not active yet.
  // Strictly avoid dummy data or fabricated records.
  const submissions = [];

  const handleCreateCustomer = () => {
    navigate(ROUTES.ADD_CUSTOMER);
  };

  return (
    <div className="rm-csh-page">
      {/* Session Identity Notice if RM ID is missing */}
      {!rmContext.rmId && (
        <div className="rm-add-customer-banner rm-add-customer-banner--warning">
          <AlertCircle size={18} />
          <span>No active Relationship Manager identity detected in session. Please sign in again.</span>
        </div>
      )}

      <div className="rm-csh-card">
        {/* Search & Action Bar */}
        <div className="rm-csh-filter-bar">
          <div className="rm-csh-search-box">
            <Search className="rm-csh-search-icon" size={16} />
            <input
              type="text"
              className="rm-csh-search-input"
              placeholder="Search by customer name, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rm-csh-filter-actions">
            <button
              type="button"
              className="rm-csh-btn-create"
              onClick={handleCreateCustomer}
            >
              <UserPlus size={16} />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {submissions.length > 0 ? (
          <div className="rm-csh-table-container">
            <table className="rm-csh-table">
              <thead>
                <tr>
                  <th className="rm-csh-th">S.NO</th>
                  <th className="rm-csh-th">CUSTOMER ID / REF</th>
                  <th className="rm-csh-th">CUSTOMER NAME</th>
                  <th className="rm-csh-th">MOBILE NUMBER</th>
                  <th className="rm-csh-th">LOAN PURPOSE</th>
                  <th className="rm-csh-th">EXPECTED AMOUNT</th>
                  <th className="rm-csh-th">CREATED DATE</th>
                  <th className="rm-csh-th">STATUS</th>
                  <th className="rm-csh-th">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((row, index) => (
                  <tr key={row.id || index} className="rm-csh-tr">
                    <td className="rm-csh-td">{index + 1}</td>
                    <td className="rm-csh-td">{row.referenceId}</td>
                    <td className="rm-csh-td">{row.customerName}</td>
                    <td className="rm-csh-td">{row.mobileNumber}</td>
                    <td className="rm-csh-td">{row.loanPurpose}</td>
                    <td className="rm-csh-td">{row.expectedAmount}</td>
                    <td className="rm-csh-td">{row.createdDate}</td>
                    <td className="rm-csh-td">{row.status}</td>
                    <td className="rm-csh-td">
                      <button
                        type="button"
                        className="bo-btn bo-btn--outline bo-btn--sm"
                        onClick={() => navigate(`${ROUTES.NEW_APPLICATIONS}/${row.id}/personal`)}
                      >
                        Continue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rm-csh-empty-state">
            <div className="rm-csh-empty-icon">
              <History size={32} />
            </div>
            <h4 className="rm-csh-empty-title">No RM-created customer submissions found</h4>
            <p className="rm-csh-empty-desc">
              Customers created directly by the Relationship Manager will appear here once submitted.
            </p>
            <button
              type="button"
              className="rm-csh-btn-create"
              onClick={handleCreateCustomer}
            >
              <UserPlus size={16} />
              <span>Create First Customer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
