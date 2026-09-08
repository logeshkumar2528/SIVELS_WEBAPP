/**
 * backOfficeDummyData.js
 * --------------------
 * Single source of truth for Back Office operational and hierarchical monitoring data.
 * Structure: District -> Relationship Manager (RM) -> Field Agent -> Customer
 * All linkages are strictly ID-based (districtId, rmId, agentId, customerId).
 */

export const BACK_OFFICE_DATA = {
  kpis: {
    totalDistricts: 6,
    totalRMs: 24,
    totalAgents: 88,
    totalCustomers: 412,
    totalPortfolio: 184500000,
    totalDisbursed: 151900000,
    totalPending: 32600000,
    overallCompletionRate: 85,
  },

  districts: [
    {
      id: 'DIST_01',
      name: 'Madurai',
      code: 'MDU',
      zone: 'South Zone',
      headquarters: 'Madurai Main Branch, Simmakkal',
      rmCount: 5,
      agentCount: 18,
      customerCount: 82,
      totalPortfolio: 38500000,
      disbursedAmount: 31800000,
      pendingAmount: 6700000,
      pendingCount: 14,
      approvedCount: 58,
      rejectedCount: 10,
      completionRate: 83,
    },
    {
      id: 'DIST_02',
      name: 'Chennai',
      code: 'CHN',
      zone: 'North Zone',
      headquarters: 'Chennai Central Branch, Mount Road',
      rmCount: 8,
      agentCount: 32,
      customerCount: 154,
      totalPortfolio: 72000000,
      disbursedAmount: 61000000,
      pendingAmount: 11000000,
      pendingCount: 22,
      approvedCount: 118,
      rejectedCount: 14,
      completionRate: 86,
    },
    {
      id: 'DIST_03',
      name: 'Coimbatore',
      code: 'CBE',
      zone: 'West Zone',
      headquarters: 'Coimbatore City Branch, Gandhipuram',
      rmCount: 4,
      agentCount: 16,
      customerCount: 76,
      totalPortfolio: 35000000,
      disbursedAmount: 29200000,
      pendingAmount: 5800000,
      pendingCount: 12,
      approvedCount: 54,
      rejectedCount: 10,
      completionRate: 84,
    },
    {
      id: 'DIST_04',
      name: 'Trichy',
      code: 'TRY',
      zone: 'Central Zone',
      headquarters: 'Trichy Main Branch, Thillai Nagar',
      rmCount: 3,
      agentCount: 10,
      customerCount: 46,
      totalPortfolio: 19500000,
      disbursedAmount: 15800000,
      pendingAmount: 3700000,
      pendingCount: 8,
      approvedCount: 33,
      rejectedCount: 5,
      completionRate: 83,
    },
    {
      id: 'DIST_05',
      name: 'Salem',
      code: 'SLM',
      zone: 'West Zone',
      headquarters: 'Salem Town Branch, Fairlands',
      rmCount: 2,
      agentCount: 7,
      customerCount: 32,
      totalPortfolio: 11500000,
      disbursedAmount: 9400000,
      pendingAmount: 2100000,
      pendingCount: 5,
      approvedCount: 24,
      rejectedCount: 3,
      completionRate: 84,
    },
    {
      id: 'DIST_06',
      name: 'Tirunelveli',
      code: 'TNV',
      zone: 'South Zone',
      headquarters: 'Tirunelveli Junction Branch, High Ground',
      rmCount: 2,
      agentCount: 5,
      customerCount: 22,
      totalPortfolio: 8000000,
      disbursedAmount: 6400000,
      pendingAmount: 1600000,
      pendingCount: 4,
      approvedCount: 16,
      rejectedCount: 2,
      completionRate: 82,
    },
  ],

  relationshipManagers: [
    {
      id: 'RM_001',
      code: 'RM001',
      name: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      branch: 'Madurai Main',
      mobile: '9876543210',
      email: 'rajesh.k@sivelsfinance.com',
      agentCount: 4,
      customerCount: 22,
      portfolioAmount: 9800000,
      targetAmount: 11000000,
      targetAchievement: 89,
      pendingCount: 3,
      approvedCount: 17,
      status: 'On track',
      activeSince: '2024-01-15',
    },
    {
      id: 'RM_002',
      code: 'RM002',
      name: 'Anitha Murugan',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      branch: 'Madurai West',
      mobile: '9876543211',
      email: 'anitha.m@sivelsfinance.com',
      agentCount: 4,
      customerCount: 19,
      portfolioAmount: 8500000,
      targetAmount: 10000000,
      targetAchievement: 85,
      pendingCount: 4,
      approvedCount: 13,
      status: 'On track',
      activeSince: '2024-03-10',
    },
    {
      id: 'RM_003',
      code: 'RM003',
      name: 'Karthik Raja',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      branch: 'Madurai South',
      mobile: '9876543212',
      email: 'karthik.r@sivelsfinance.com',
      agentCount: 3,
      customerCount: 15,
      portfolioAmount: 7200000,
      targetAmount: 8500000,
      targetAchievement: 84,
      pendingCount: 2,
      approvedCount: 11,
      status: 'On track',
      activeSince: '2024-02-01',
    },
    {
      id: 'RM_004',
      code: 'RM004',
      name: 'Meena Sundaram',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      branch: 'Madurai East',
      mobile: '9876543213',
      email: 'meena.s@sivelsfinance.com',
      agentCount: 4,
      customerCount: 16,
      portfolioAmount: 7600000,
      targetAmount: 9000000,
      targetAchievement: 84,
      pendingCount: 3,
      approvedCount: 11,
      status: 'On track',
      activeSince: '2024-04-18',
    },
    {
      id: 'RM_005',
      code: 'RM005',
      name: 'Vigneshwaran S',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      branch: 'Madurai Rural',
      mobile: '9876543214',
      email: 'vignesh.s@sivelsfinance.com',
      agentCount: 3,
      customerCount: 10,
      portfolioAmount: 5400000,
      targetAmount: 7500000,
      targetAchievement: 72,
      pendingCount: 2,
      approvedCount: 6,
      status: 'Needs review',
      activeSince: '2024-05-20',
    },
    {
      id: 'RM_006',
      code: 'RM006',
      name: 'Suresh Raina',
      districtId: 'DIST_02',
      districtName: 'Chennai',
      branch: 'Chennai Central',
      mobile: '9876543220',
      email: 'suresh.r@sivelsfinance.com',
      agentCount: 5,
      customerCount: 28,
      portfolioAmount: 13500000,
      targetAmount: 15000000,
      targetAchievement: 90,
      pendingCount: 4,
      approvedCount: 21,
      status: 'On track',
      activeSince: '2023-11-05',
    },
    {
      id: 'RM_007',
      code: 'RM007',
      name: 'Priya Natarajan',
      districtId: 'DIST_02',
      districtName: 'Chennai',
      branch: 'Chennai South',
      mobile: '9876543221',
      email: 'priya.n@sivelsfinance.com',
      agentCount: 4,
      customerCount: 24,
      portfolioAmount: 11200000,
      targetAmount: 12500000,
      targetAchievement: 89,
      pendingCount: 3,
      approvedCount: 19,
      status: 'On track',
      activeSince: '2023-12-12',
    },
    {
      id: 'RM_008',
      code: 'RM008',
      name: 'Balaji R',
      districtId: 'DIST_03',
      districtName: 'Coimbatore',
      branch: 'Coimbatore City',
      mobile: '9876543230',
      email: 'balaji.r@sivelsfinance.com',
      agentCount: 4,
      customerCount: 20,
      portfolioAmount: 9500000,
      targetAmount: 11000000,
      targetAchievement: 86,
      pendingCount: 3,
      approvedCount: 15,
      status: 'On track',
      activeSince: '2024-01-10',
    },
    {
      id: 'RM_009',
      code: 'RM009',
      name: 'Deepak V',
      districtId: 'DIST_03',
      districtName: 'Coimbatore',
      branch: 'Coimbatore North',
      mobile: '9876543231',
      email: 'deepak.v@sivelsfinance.com',
      agentCount: 4,
      customerCount: 18,
      portfolioAmount: 8200000,
      targetAmount: 9500000,
      targetAchievement: 86,
      pendingCount: 2,
      approvedCount: 14,
      status: 'On track',
      activeSince: '2024-02-14',
    },
    {
      id: 'RM_010',
      code: 'RM010',
      name: 'Ganesh Moorthy',
      districtId: 'DIST_04',
      districtName: 'Trichy',
      branch: 'Trichy Main',
      mobile: '9876543240',
      email: 'ganesh.m@sivelsfinance.com',
      agentCount: 4,
      customerCount: 18,
      portfolioAmount: 7800000,
      targetAmount: 9000000,
      targetAchievement: 86,
      pendingCount: 3,
      approvedCount: 13,
      status: 'On track',
      activeSince: '2024-02-28',
    },
    {
      id: 'RM_011',
      code: 'RM011',
      name: 'Kaviarasan S',
      districtId: 'DIST_05',
      districtName: 'Salem',
      branch: 'Salem Town',
      mobile: '9876543250',
      email: 'kaviarasan.s@sivelsfinance.com',
      agentCount: 4,
      customerCount: 17,
      portfolioAmount: 6200000,
      targetAmount: 7500000,
      targetAchievement: 82,
      pendingCount: 2,
      approvedCount: 13,
      status: 'On track',
      activeSince: '2024-03-15',
    },
    {
      id: 'RM_012',
      code: 'RM012',
      name: 'Naveen Kumar',
      districtId: 'DIST_06',
      districtName: 'Tirunelveli',
      branch: 'Tirunelveli Junction',
      mobile: '9876543260',
      email: 'naveen.k@sivelsfinance.com',
      agentCount: 3,
      customerCount: 12,
      portfolioAmount: 4500000,
      targetAmount: 5500000,
      targetAchievement: 81,
      pendingCount: 2,
      approvedCount: 9,
      status: 'On track',
      activeSince: '2024-04-01',
    },
  ],

  agents: [
    {
      id: 'AG_001',
      code: 'AG001',
      name: 'K. Vignesh',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      mobile: '9123456780',
      email: 'vignesh.agent@sivelsfinance.com',
      customerCount: 6,
      applicationCount: 7,
      approvedCount: 5,
      pendingCount: 1,
      rejectedCount: 1,
      portfolioAmount: 2800000,
      conversionRate: 83,
      status: 'Active',
      joinedDate: '2024-02-15',
    },
    {
      id: 'AG_002',
      code: 'AG002',
      name: 'P. Selvam',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      mobile: '9123456781',
      email: 'selvam.p@sivelsfinance.com',
      customerCount: 5,
      applicationCount: 6,
      approvedCount: 4,
      pendingCount: 1,
      rejectedCount: 1,
      portfolioAmount: 2400000,
      conversionRate: 80,
      status: 'Active',
      joinedDate: '2024-02-20',
    },
    {
      id: 'AG_003',
      code: 'AG003',
      name: 'M. Dinesh',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      mobile: '9123456782',
      email: 'dinesh.m@sivelsfinance.com',
      customerCount: 6,
      applicationCount: 7,
      approvedCount: 4,
      pendingCount: 2,
      rejectedCount: 1,
      portfolioAmount: 2600000,
      conversionRate: 78,
      status: 'Active',
      joinedDate: '2024-03-01',
    },
    {
      id: 'AG_004',
      code: 'AG004',
      name: 'R. Gopinath',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      mobile: '9123456783',
      email: 'gopinath.r@sivelsfinance.com',
      customerCount: 5,
      applicationCount: 5,
      approvedCount: 4,
      pendingCount: 1,
      rejectedCount: 0,
      portfolioAmount: 2000000,
      conversionRate: 85,
      status: 'Active',
      joinedDate: '2024-03-15',
    },
    {
      id: 'AG_005',
      code: 'AG005',
      name: 'S. Manikandan',
      rmId: 'RM_002',
      rmName: 'Anitha Murugan',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      mobile: '9123456784',
      email: 'manikandan.s@sivelsfinance.com',
      customerCount: 5,
      applicationCount: 6,
      approvedCount: 3,
      pendingCount: 2,
      rejectedCount: 1,
      portfolioAmount: 2200000,
      conversionRate: 75,
      status: 'Active',
      joinedDate: '2024-03-22',
    },
    {
      id: 'AG_006',
      code: 'AG006',
      name: 'T. Saravanan',
      rmId: 'RM_006',
      rmName: 'Suresh Raina',
      districtId: 'DIST_02',
      districtName: 'Chennai',
      mobile: '9123456790',
      email: 'saravanan.t@sivelsfinance.com',
      customerCount: 7,
      applicationCount: 8,
      approvedCount: 5,
      pendingCount: 2,
      rejectedCount: 1,
      portfolioAmount: 3400000,
      conversionRate: 88,
      status: 'Active',
      joinedDate: '2023-11-20',
    },
    {
      id: 'AG_007',
      code: 'AG007',
      name: 'V. Senthil',
      rmId: 'RM_006',
      rmName: 'Suresh Raina',
      districtId: 'DIST_02',
      districtName: 'Chennai',
      mobile: '9123456791',
      email: 'senthil.v@sivelsfinance.com',
      customerCount: 6,
      applicationCount: 7,
      approvedCount: 5,
      pendingCount: 1,
      rejectedCount: 1,
      portfolioAmount: 2900000,
      conversionRate: 85,
      status: 'Active',
      joinedDate: '2023-12-05',
    },
    {
      id: 'AG_008',
      code: 'AG008',
      name: 'A. Balamurugan',
      rmId: 'RM_008',
      rmName: 'Balaji R',
      districtId: 'DIST_03',
      districtName: 'Coimbatore',
      mobile: '9123456795',
      email: 'bala.m@sivelsfinance.com',
      customerCount: 6,
      applicationCount: 7,
      approvedCount: 4,
      pendingCount: 2,
      rejectedCount: 1,
      portfolioAmount: 2750000,
      conversionRate: 82,
      status: 'Active',
      joinedDate: '2024-01-20',
    },
    {
      id: 'AG_009',
      code: 'AG009',
      name: 'N. Ravichandran',
      rmId: 'RM_010',
      rmName: 'Ganesh Moorthy',
      districtId: 'DIST_04',
      districtName: 'Trichy',
      mobile: '9123456798',
      email: 'ravi.n@sivelsfinance.com',
      customerCount: 5,
      applicationCount: 6,
      approvedCount: 4,
      pendingCount: 1,
      rejectedCount: 1,
      portfolioAmount: 2100000,
      conversionRate: 80,
      status: 'Active',
      joinedDate: '2024-03-05',
    },
    {
      id: 'AG_010',
      code: 'AG010',
      name: 'C. Karthikeyan',
      rmId: 'RM_011',
      rmName: 'Kaviarasan S',
      districtId: 'DIST_05',
      districtName: 'Salem',
      mobile: '9123456799',
      email: 'karthi.c@sivelsfinance.com',
      customerCount: 5,
      applicationCount: 5,
      approvedCount: 4,
      pendingCount: 1,
      rejectedCount: 0,
      portfolioAmount: 1900000,
      conversionRate: 84,
      status: 'Active',
      joinedDate: '2024-03-20',
    },
    {
      id: 'AG_011',
      code: 'AG011',
      name: 'M. Pandian',
      rmId: 'RM_012',
      rmName: 'Naveen Kumar',
      districtId: 'DIST_06',
      districtName: 'Tirunelveli',
      mobile: '9123456801',
      email: 'pandian.m@sivelsfinance.com',
      customerCount: 4,
      applicationCount: 5,
      approvedCount: 3,
      pendingCount: 1,
      rejectedCount: 1,
      portfolioAmount: 1600000,
      conversionRate: 79,
      status: 'Active',
      joinedDate: '2024-04-10',
    },
  ],

  customers: [
    {
      id: 'CUST_001',
      applicationNo: 'SIV-2026-0891',
      customerName: 'Murugan Swaminathan',
      agentId: 'AG_001',
      agentName: 'K. Vignesh',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      loanType: 'Business Loan',
      amount: 450000,
      status: 'Pending',
      appliedDate: '2026-03-01',
      mobile: '9841234567',
      email: 'murugan.s@gmail.com',
      employmentType: 'Self Employed',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Working Capital & Inventory Purchase',
      cibilScore: 742,
    },
    {
      id: 'CUST_002',
      applicationNo: 'SIV-2026-0892',
      customerName: 'Lakshmi Narayanan',
      agentId: 'AG_001',
      agentName: 'K. Vignesh',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      loanType: 'Personal Loan',
      amount: 250000,
      status: 'Approved',
      appliedDate: '2026-02-28',
      mobile: '9841234568',
      email: 'lakshmi.n@gmail.com',
      employmentType: 'Salaried',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Medical Emergency & Healthcare',
      cibilScore: 765,
    },
    {
      id: 'CUST_003',
      applicationNo: 'SIV-2026-0893',
      customerName: 'Kavitha Ramasamy',
      agentId: 'AG_001',
      agentName: 'K. Vignesh',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      loanType: 'Home Loan',
      amount: 1200000,
      status: 'Approved',
      appliedDate: '2026-02-25',
      mobile: '9841234569',
      email: 'kavitha.r@yahoo.com',
      employmentType: 'Salaried',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Residential Property Renovation',
      cibilScore: 780,
    },
    {
      id: 'CUST_004',
      applicationNo: 'SIV-2026-0894',
      customerName: 'Senthamarai Kannan',
      agentId: 'AG_002',
      agentName: 'P. Selvam',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      loanType: 'Vehicle Loan',
      amount: 350000,
      status: 'Under Review',
      appliedDate: '2026-03-02',
      mobile: '9841234570',
      email: 'senthamarai.k@outlook.com',
      employmentType: 'Self Employed',
      kycStatus: 'Under Review',
      panStatus: 'Verified',
      aadhaarStatus: 'Pending',
      purpose: 'Commercial Light Transport Purchase',
      cibilScore: 710,
    },
    {
      id: 'CUST_005',
      applicationNo: 'SIV-2026-0895',
      customerName: 'Ramesh Babu',
      agentId: 'AG_002',
      agentName: 'P. Selvam',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      loanType: 'Business Loan',
      amount: 600000,
      status: 'Approved',
      appliedDate: '2026-02-22',
      mobile: '9841234571',
      email: 'ramesh.b@gmail.com',
      employmentType: 'Business Owner',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Equipment Purchase & Factory Setup',
      cibilScore: 755,
    },
    {
      id: 'CUST_006',
      applicationNo: 'SIV-2026-0896',
      customerName: 'Geetha Sundaram',
      agentId: 'AG_003',
      agentName: 'M. Dinesh',
      rmId: 'RM_001',
      rmName: 'Rajesh Kumar',
      districtId: 'DIST_01',
      districtName: 'Madurai',
      loanType: 'Personal Loan',
      amount: 200000,
      status: 'Rejected',
      appliedDate: '2026-02-20',
      mobile: '9841234572',
      email: 'geetha.s@gmail.com',
      employmentType: 'Salaried',
      kycStatus: 'Rejected',
      panStatus: 'Mismatch',
      aadhaarStatus: 'Verified',
      purpose: 'Higher Education Fee Payment',
      cibilScore: 615,
    },
    {
      id: 'CUST_007',
      applicationNo: 'SIV-2026-0897',
      customerName: 'Vijay Anand',
      agentId: 'AG_006',
      agentName: 'T. Saravanan',
      rmId: 'RM_006',
      rmName: 'Suresh Raina',
      districtId: 'DIST_02',
      districtName: 'Chennai',
      loanType: 'Business Loan',
      amount: 850000,
      status: 'Approved',
      appliedDate: '2026-02-18',
      mobile: '9841234580',
      email: 'vijay.a@chennaibiz.com',
      employmentType: 'Business Owner',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Retail Store Expansion',
      cibilScore: 790,
    },
    {
      id: 'CUST_008',
      applicationNo: 'SIV-2026-0898',
      customerName: 'Anand Kumar P',
      agentId: 'AG_006',
      agentName: 'T. Saravanan',
      rmId: 'RM_006',
      rmName: 'Suresh Raina',
      districtId: 'DIST_02',
      districtName: 'Chennai',
      loanType: 'Home Loan',
      amount: 1500000,
      status: 'Pending',
      appliedDate: '2026-03-03',
      mobile: '9841234581',
      email: 'anand.kp@gmail.com',
      employmentType: 'Salaried',
      kycStatus: 'Under Review',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Apartment Purchase',
      cibilScore: 735,
    },
    {
      id: 'CUST_009',
      applicationNo: 'SIV-2026-0899',
      customerName: 'Srinivasan Raman',
      agentId: 'AG_008',
      agentName: 'A. Balamurugan',
      rmId: 'RM_008',
      rmName: 'Balaji R',
      districtId: 'DIST_03',
      districtName: 'Coimbatore',
      loanType: 'Business Loan',
      amount: 700000,
      status: 'Approved',
      appliedDate: '2026-02-27',
      mobile: '9841234585',
      email: 'srini.r@cbetextiles.com',
      employmentType: 'Business Owner',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Textile Machinery Upgrade',
      cibilScore: 770,
    },
    {
      id: 'CUST_010',
      applicationNo: 'SIV-2026-0900',
      customerName: 'Dhanalakshmi V',
      agentId: 'AG_009',
      agentName: 'N. Ravichandran',
      rmId: 'RM_010',
      rmName: 'Ganesh Moorthy',
      districtId: 'DIST_04',
      districtName: 'Trichy',
      loanType: 'Micro Enterprise Loan',
      amount: 300000,
      status: 'Approved',
      appliedDate: '2026-03-02',
      mobile: '9841234590',
      email: 'dhana.v@gmail.com',
      employmentType: 'Self Employed',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Agri Processing Unit',
      cibilScore: 740,
    },
    {
      id: 'CUST_011',
      applicationNo: 'SIV-2026-0901',
      customerName: 'Chandrasekar M',
      agentId: 'AG_010',
      agentName: 'C. Karthikeyan',
      rmId: 'RM_011',
      rmName: 'Kaviarasan S',
      districtId: 'DIST_05',
      districtName: 'Salem',
      loanType: 'Personal Loan',
      amount: 220000,
      status: 'Approved',
      appliedDate: '2026-02-26',
      mobile: '9841234595',
      email: 'chandra.m@gmail.com',
      employmentType: 'Salaried',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Home Improvement',
      cibilScore: 752,
    },
    {
      id: 'CUST_012',
      applicationNo: 'SIV-2026-0902',
      customerName: 'Subramanian Chettiar',
      agentId: 'AG_011',
      agentName: 'M. Pandian',
      rmId: 'RM_012',
      rmName: 'Naveen Kumar',
      districtId: 'DIST_06',
      districtName: 'Tirunelveli',
      loanType: 'Business Loan',
      amount: 500000,
      status: 'Approved',
      appliedDate: '2026-02-24',
      mobile: '9841234600',
      email: 'subramanian.c@tnvbiz.com',
      employmentType: 'Business Owner',
      kycStatus: 'Verified',
      panStatus: 'Verified',
      aadhaarStatus: 'Verified',
      purpose: 'Wholesale Grocery Inventory',
      cibilScore: 760,
    },
  ],
};

/* ==========================================
   HELPER UTILITIES & SELECTORS
========================================== */

/**
 * Return dashboard summary KPIs.
 */
export function getKPIs() {
  return BACK_OFFICE_DATA.kpis;
}

export function getDashboardKpis() {
  return BACK_OFFICE_DATA.kpis;
}

/**
 * Return all district records.
 */
export function getAllDistricts() {
  return BACK_OFFICE_DATA.districts;
}

/**
 * Retrieve a district by ID, code, or name.
 */
export function getDistrictById(districtId) {
  if (!districtId) return null;
  const query = String(districtId).trim().toLowerCase();
  return (
    BACK_OFFICE_DATA.districts.find(
      (d) =>
        d.id.toLowerCase() === query ||
        d.code.toLowerCase() === query ||
        d.name.toLowerCase() === query
    ) || null
  );
}

/**
 * Return all relationship managers.
 */
export function getAllRMs() {
  return BACK_OFFICE_DATA.relationshipManagers;
}

/**
 * Retrieve an RM by ID or code.
 */
export function getRMById(rmId) {
  if (!rmId) return null;
  const query = String(rmId).trim().toLowerCase();
  return (
    BACK_OFFICE_DATA.relationshipManagers.find(
      (rm) => rm.id.toLowerCase() === query || rm.code.toLowerCase() === query
    ) || null
  );
}

/**
 * Return all RMs belonging to a specific district ID or name.
 */
export function getRMsByDistrict(districtId) {
  if (!districtId) return [];
  const query = String(districtId).trim().toLowerCase();
  return BACK_OFFICE_DATA.relationshipManagers.filter(
    (rm) =>
      rm.districtId.toLowerCase() === query ||
      rm.districtName.toLowerCase() === query
  );
}

/**
 * Return all field agents.
 */
export function getAllAgents() {
  return BACK_OFFICE_DATA.agents;
}

/**
 * Retrieve an agent by ID or code.
 */
export function getAgentById(agentId) {
  if (!agentId) return null;
  const query = String(agentId).trim().toLowerCase();
  return (
    BACK_OFFICE_DATA.agents.find(
      (ag) => ag.id.toLowerCase() === query || ag.code.toLowerCase() === query
    ) || null
  );
}

/**
 * Return all agents assigned to a specific RM.
 */
export function getAgentsByRM(rmId) {
  if (!rmId) return [];
  const query = String(rmId).trim().toLowerCase();
  return BACK_OFFICE_DATA.agents.filter(
    (ag) => ag.rmId.toLowerCase() === query || (ag.rmName && ag.rmName.toLowerCase() === query)
  );
}

/**
 * Return all agents in a specific district.
 */
export function getAgentsByDistrict(districtId) {
  if (!districtId) return [];
  const query = String(districtId).trim().toLowerCase();
  return BACK_OFFICE_DATA.agents.filter(
    (ag) =>
      ag.districtId.toLowerCase() === query ||
      ag.districtName.toLowerCase() === query
  );
}

/**
 * Return all customer applications.
 */
export function getAllCustomers() {
  return BACK_OFFICE_DATA.customers;
}

/**
 * Retrieve a customer by ID or application number.
 */
export function getCustomerById(customerId) {
  if (!customerId) return null;
  const query = String(customerId).trim().toLowerCase();
  return (
    BACK_OFFICE_DATA.customers.find(
      (c) =>
        c.id.toLowerCase() === query ||
        c.applicationNo.toLowerCase() === query
    ) || null
  );
}

/**
 * Return all customers sourced by a specific agent.
 */
export function getCustomersByAgent(agentId) {
  if (!agentId) return [];
  const query = String(agentId).trim().toLowerCase();
  return BACK_OFFICE_DATA.customers.filter(
    (c) => c.agentId.toLowerCase() === query
  );
}

/**
 * Return all customers under an RM.
 */
export function getCustomersByRM(rmId) {
  if (!rmId) return [];
  const query = String(rmId).trim().toLowerCase();
  return BACK_OFFICE_DATA.customers.filter(
    (c) => c.rmId.toLowerCase() === query
  );
}

/**
 * Return all customers in a district.
 */
export function getCustomersByDistrict(districtId) {
  if (!districtId) return [];
  const query = String(districtId).trim().toLowerCase();
  return BACK_OFFICE_DATA.customers.filter(
    (c) =>
      c.districtId.toLowerCase() === query ||
      c.districtName.toLowerCase() === query
  );
}

/**
 * Format currency numbers in Indian Rupee format.
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  if (num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}
