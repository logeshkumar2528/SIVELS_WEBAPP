import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { InterestTypePage } from './pages/masters/InterestTypePage/InterestTypePage';

// Placeholder imports
import { Title } from './pages/masters/Title/Title';
import { Relationship } from './pages/masters/Relationship/Relationship';
import { SourcingChannel } from './pages/masters/SourcingChannel/SourcingChannel';
import { DocumentType } from './pages/masters/DocumentType/DocumentType';
import { StatusRole } from './pages/masters/StatusRole/StatusRole';
import { Status } from './pages/masters/Status/Status';
import { LoanType } from './pages/masters/LoanType/LoanType';
import { LoanProduct } from './pages/masters/LoanProduct/LoanProduct';
import { LoanPurpose } from './pages/masters/LoanPurpose/LoanPurpose';
import { LoanTransactionType } from './pages/masters/LoanTransactionType/LoanTransactionType';
import { Gender } from './pages/masters/Gender/Gender';
import { MaritalStatus } from './pages/masters/MaritalStatus/MaritalStatus';
import { BankBranch } from './pages/masters/BankBranch/BankBranch';
import { State } from './pages/masters/State/State';
import { City } from './pages/masters/City/City';
import { EmploymentType } from './pages/masters/EmploymentType/EmploymentType';
import { Bank } from './pages/masters/Bank/Bank';
import { Country } from './pages/masters/Country/Country';
import { District } from './pages/masters/District/District';
import { EmploymentTypeDocumentMapping } from './pages/masters/EmploymentTypeDocumentMapping/EmploymentTypeDocumentMapping';
import { LoanProductVariation } from './pages/masters/LoanProductVariation/LoanProductVariation';
import { Verification } from './pages/masters/Verification/Verification';
import { Property } from './pages/masters/Property/Property';
import { PropertyUsage } from './pages/masters/PropertyUsage/PropertyUsage';
import { Education } from './pages/masters/Education/Education';
import { Religion } from './pages/masters/Religion/Religion';
import { Caste } from './pages/masters/Caste/Caste';
import { LoanProductCollateral } from './pages/masters/LoanProductCollateral/LoanProductCollateral';
import { RateOfInterest } from './pages/masters/RateOfInterest/RateOfInterest';
import { CompanyConfiguration } from './features/company/CompanyConfiguration';
import AddAgent from '../../Business_Modules/rm_modules/src/pages/AddAgent/AddAgent';
import RelationshipManagerCreate from './pages/RelationshipManager/RelationshipManagerCreate';
import CreateUser from './pages/CreateUser/CreateUser';

function App() {
  return (
    <BrowserRouter basename="/master">
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="add-agent" element={<AddAgent />} />
          <Route path="create-relationship-manager" element={<RelationshipManagerCreate />} />
          <Route path="company" element={<CompanyConfiguration />} />
          
          <Route path="masters">
            <Route index element={<Navigate to="interest-type" replace />} />
            <Route path="interest-type" element={<InterestTypePage />} />
            <Route path="title" element={<Title />} />
            <Route path="relationship" element={<Relationship />} />
            <Route path="sourcing-channel" element={<SourcingChannel />} />
            <Route path="document-type" element={<DocumentType />} />
            <Route path="status-role" element={<StatusRole />} />
            <Route path="status" element={<Status />} />
            <Route path="loan-type" element={<LoanType />} />
            <Route path="loan-product" element={<LoanProduct />} />
            <Route path="loan-purpose" element={<LoanPurpose />} />
            <Route path="loan-transaction-type" element={<LoanTransactionType />} />
            <Route path="gender" element={<Gender />} />
            <Route path="marital-status" element={<MaritalStatus />} />
            <Route path="bank-branch" element={<BankBranch />} />
            <Route path="state" element={<State />} />
            <Route path="city" element={<City />} />
            <Route path="employment-type" element={<EmploymentType />} />
            <Route path="bank" element={<Bank />} />
            <Route path="country" element={<Country />} />
            <Route path="district" element={<District />} />
            <Route path="employment-type-document-mapping" element={<EmploymentTypeDocumentMapping />} />
            <Route path="loan-product-variation" element={<LoanProductVariation />} />
            <Route path="verification" element={<Verification />} />
            <Route path="property" element={<Property />} />
            <Route path="property-usage" element={<PropertyUsage />} />
            <Route path="education" element={<Education />} />
            <Route path="religion" element={<Religion />} />
            <Route path="caste" element={<Caste />} />
            <Route path="loan-product-collateral" element={<LoanProductCollateral />} />
            <Route path="rate-of-interest" element={<RateOfInterest />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
