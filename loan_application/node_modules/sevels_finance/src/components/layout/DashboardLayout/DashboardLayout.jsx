import './DashboardLayout.css';
import Sidebar from '../Sidebar/Sidebar';
import TopNav from '../TopNav/TopNav';
import AppShell from '../AppShell/AppShell';

const DashboardLayout = ({ children, title, subtitle, headerContent, rightContent, hideSidebar = false, sidebarActiveStep = 1, onSidebarStepClick, sidebarCompletedSteps = [], hideProfile = false }) => {
  return (
    <AppShell
      topBar={<TopNav title={title} subtitle={subtitle} headerContent={headerContent} rightContent={rightContent} hideProfile={hideProfile} />}
      sidebar={!hideSidebar ? <Sidebar activeStep={sidebarActiveStep} onStepClick={onSidebarStepClick} completedSteps={sidebarCompletedSteps} /> : null}
    >
      {children}
    </AppShell>
  );
};

export default DashboardLayout;
