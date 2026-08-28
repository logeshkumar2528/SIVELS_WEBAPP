import { useState } from 'react'
import { Eye, ChevronRight } from 'lucide-react'
import Pagination from '../Pagination/Pagination'
import ViewCustomerModal from '../ViewCustomerModal/ViewCustomerModal'
import './PendingLoans.css'

// 30 realistic customer loan collection records
const allLoansData = [
  { id: 1, name: 'Ramesh Kumar', initial: 'R', mobile: '9876543210', loanAmount: '1,50,000', pendingAmount: '15,000', dueDate: '05 Jun 2025', daysOverdue: '5 days', monthsOverdue: 1, status: 'Pending RM Review', loanPurpose: 'Personal Loan', remarks: 'Customer requested 5 days extension.' },
  { id: 2, name: 'Priya N', initial: 'P', mobile: '9876543211', loanAmount: '80,000', pendingAmount: '8,000', dueDate: '03 Jun 2025', daysOverdue: '7 days', monthsOverdue: 2, status: 'Under Review', loanPurpose: 'Business Expansion', remarks: 'Follow up done on 04 Jun.' },
  { id: 3, name: 'Kumaravel M', initial: 'K', mobile: '9876543222', loanAmount: '2,00,000', pendingAmount: '25,000', dueDate: '01 Jun 2025', daysOverdue: '9 days', monthsOverdue: 2, status: 'Submitted', loanPurpose: 'Home Renovation', remarks: 'Salary credited on 1st.' },
  { id: 4, name: 'Suresh B', initial: 'S', mobile: '9876543233', loanAmount: '1,20,000', pendingAmount: '12,000', dueDate: '28 May 2025', daysOverdue: '13 days', monthsOverdue: 3, status: 'Returned by RM', loanPurpose: 'Vehicle Loan', remarks: 'Aadhaar copy needs re-upload.' },
  { id: 5, name: 'Meena Devi', initial: 'M', mobile: '9876543244', loanAmount: '90,000', pendingAmount: '9,000', dueDate: '27 May 2025', daysOverdue: '14 days', monthsOverdue: 3, status: 'Approved by RM', loanPurpose: 'Medical Emergency', remarks: 'Approved for disbursement.' },
  { id: 6, name: 'Karthik S', initial: 'K', mobile: '9876543255', loanAmount: '1,80,000', pendingAmount: '18,000', dueDate: '25 May 2025', daysOverdue: '16 days', monthsOverdue: 4, status: 'Under Review', loanPurpose: 'Education Loan', remarks: 'College fee receipt attached.' },
  { id: 7, name: 'Anitha R', initial: 'A', mobile: '9876543266', loanAmount: '1,10,000', pendingAmount: '11,000', dueDate: '24 May 2025', daysOverdue: '17 days', monthsOverdue: 4, status: 'Pending RM Review', loanPurpose: 'Personal Loan', remarks: 'First time loan applicant.' },
  { id: 8, name: 'Vijay K', initial: 'V', mobile: '9876543277', loanAmount: '2,50,000', pendingAmount: '30,000', dueDate: '22 May 2025', daysOverdue: '19 days', monthsOverdue: 5, status: 'Returned by RM', loanPurpose: 'Business Loan', remarks: 'Bank passbook page 1 missing.' },
]

function PendingLoans() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const totalItems = allLoansData.length

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const paginatedLoans = allLoansData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )


  return (
    <div className="pending-loans">
      {/* Header */}
      <div className="pending-loans-header">
        <div>
          <h2 className="pending-loans-title">Pending Loans (Collection)</h2>
          <p className="pending-loans-subtitle">
            Customers who have loan pending and require collection
          </p>
        </div>
        <button className="pending-loans-view-all">
          View All <ChevronRight size={14} />
        </button>
      </div>

      {/* Table Wrapper */}
      <div className="pending-loans-table-wrapper">
        <table className="pending-loans-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Mobile Number</th>
              <th>Loan Amount</th>
              <th>Pending Amount</th>
              <th>Due Date</th>
              <th>Days Overdue</th>
              <th>Months Overdue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLoans.map((loan) => (
              <tr key={loan.id}>
                <td>
                  <div className="customer-cell">
                    <div className="customer-avatar">
                      {loan.initial}
                    </div>
                    {loan.name}
                  </div>
                </td>
                <td>{loan.mobile}</td>
                <td>₹ {loan.loanAmount}</td>
                <td><span className="amount-pending">₹ {loan.pendingAmount}</span></td>
                <td>{loan.dueDate}</td>
                <td><span className="days-overdue">{loan.daysOverdue}</span></td>
                <td>
                  <span className={`months-due-badge ${loan.monthsOverdue >= 4 ? 'months-due--high' : loan.monthsOverdue >= 2 ? 'months-due--medium' : 'months-due--low'}`}>
                    {loan.monthsOverdue} {loan.monthsOverdue === 1 ? 'Month' : 'Months'}
                  </span>
                </td>
                <td>
                  <button
                    className="action-view"
                    onClick={() => setSelectedCustomer(loan)}
                  >
                    <Eye size={16} strokeWidth={1.8} /> View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Standalone Pagination Component */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[5, 10, 15, 20]}
        useCustomSelect={true}
      />

      {/* View Customer Details Side Drawer */}
      {selectedCustomer && (
        <ViewCustomerModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  )
}

export default PendingLoans

