import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReceivedApplications from './pages/ReceivedApplications';
import PendingReview from './pages/PendingReview';
import ApprovedApplications from './pages/ApprovedApplications';
import RejectedApplications from './pages/RejectedApplications';
import Reports from './pages/Reports';
import MyProfile from './pages/MyProfile';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './App.css';

const AppContent = () => {
  const location = useLocation();
  
  let title = "Credit Manager Dashboard";
  let subtitle = "Overview of applications received from Credit Back Office";
  
  if (location.pathname === '/received') {
    title = "2. Received Applications";
    subtitle = "Dashboard > Received Applications";
  } else if (location.pathname === '/pending') {
    title = "3. Pending Review";
    subtitle = "Dashboard > Pending Review";
  } else if (location.pathname === '/approved') {
    title = "4. Approved Applications";
    subtitle = "Dashboard > Approved Applications";
  } else if (location.pathname === '/rejected') {
    title = "5. Rejected Applications";
    subtitle = "Dashboard > Rejected Applications";
  } else if (location.pathname === '/reports') {
    title = "Reports";
    subtitle = "Dashboard > Reports";
  } else if (location.pathname === '/profile') {
    title = "My Profile";
    subtitle = "Dashboard > My Profile";
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header title={title} subtitle={subtitle} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/received" element={<ReceivedApplications />} />
            <Route path="/pending" element={<PendingReview />} />
            <Route path="/approved" element={<ApprovedApplications />} />
            <Route path="/rejected" element={<RejectedApplications />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<MyProfile />} />
            {/* Other routes will go here */}
          </Routes>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
