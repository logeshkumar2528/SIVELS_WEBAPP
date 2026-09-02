import axiosInstance from '../../api/axiosInstance';

const endpoints = {
  companyType: '/company/companytypemaster',
  company: '/company/companymaster',
  addressType: '/company/companyaddresstypemaster',
  address: '/company/companyaddressmaster',
  bankAccount: '/company/companybankaccountmaster',
  contactPerson: '/company/companycontactpersonmaster',
  digitalSignature: '/company/companydigitalsignature',
  document: '/company/companydocument',
  emailConfiguration: '/company/companyemailconfiguration',
  smsConfiguration: '/company/companysmsconfiguration',
  numberSeries: '/company/companynumberseries',
  holidayCalendar: '/company/companyholidaycalendar',
  financialSetting: '/company/companyfinancialsetting',
  loanSetting: '/company/companyloansetting',
  accountingDetail: '/company/companyaccountingdetail',
};

const makeCrudApi = (path) => ({
  list: async (params) => (await axiosInstance.get(path, { params })).data,
  get: async (id) => (await axiosInstance.get(`${path}/${id}`)).data,
  create: async (payload) => (await axiosInstance.post(path, payload)).data,
  update: async (id, payload) => (await axiosInstance.put(`${path}/${id}`, payload)).data,
  remove: async (id) => (await axiosInstance.delete(`${path}/${id}`)).data,
});

export const companyApis = Object.fromEntries(
  Object.entries(endpoints).map(([key, path]) => [key, makeCrudApi(path)])
);

export { endpoints };
