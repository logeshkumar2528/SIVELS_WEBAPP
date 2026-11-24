import axiosInstance from '../../../../Core/src/api/axiosInstance';

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
};

const isActive = (row) => row?.isActive !== false && row?.IsActive !== false;

const toOptions = (rows, getId, getLabel) =>
  rows
    .filter(isActive)
    .map((row) => {
      const value = getId(row);
      const label = getLabel(row);
      if (value == null || value === '' || !label) return null;
      return { value: String(value), label: String(label) };
    })
    .filter(Boolean);

export const mastersLookupService = {
  async getDivisions() {
    const response = await axiosInstance.get('/DivisionMaster');
    return toOptions(
      unwrapList(response.data),
      (row) => row.divisionId ?? row.DivisionId ?? row.id,
      (row) => row.divisionName ?? row.DivisionName ?? row.divisionCode ?? row.DivisionCode
    );
  },

  async getPaymentMethods() {
    const response = await axiosInstance.get('/PaymentMethodMaster');
    return toOptions(
      unwrapList(response.data),
      (row) => row.paymentMethodId ?? row.PaymentMethodId ?? row.id,
      (row) =>
        row.paymentMethodName ?? row.PaymentMethodName ?? row.paymentMethodCode ?? row.PaymentMethodCode
    );
  },

  async getFrequencies() {
    const response = await axiosInstance.get('/FrequencyMaster');
    return toOptions(
      unwrapList(response.data),
      (row) => row.frequencyId ?? row.FrequencyId ?? row.id,
      (row) => row.frequencyName ?? row.FrequencyName ?? row.frequencyCode ?? row.FrequencyCode
    );
  },

  async getLoanFlags() {
    const response = await axiosInstance.get('/LoanFlagMaster');
    return toOptions(
      unwrapList(response.data),
      (row) => row.loanFlagId ?? row.LoanFlagId ?? row.id,
      (row) => row.loanFlagName ?? row.LoanFlagName ?? row.loanFlagCode ?? row.LoanFlagCode
    );
  },

  async getCurrencies() {
    const response = await axiosInstance.get('/CurrencyMaster');
    return toOptions(
      unwrapList(response.data),
      (row) => row.currencyId ?? row.CurrencyId ?? row.id,
      (row) => {
        const name = row.currencyName ?? row.CurrencyName ?? '';
        const code = row.currencyCode ?? row.CurrencyCode ?? '';
        const symbol = row.symbol ?? row.Symbol ?? '';
        if (name && code) return symbol ? `${code} - ${name} (${symbol})` : `${code} - ${name}`;
        return name || code || symbol;
      }
    );
  },

  async getDayBases() {
    const response = await axiosInstance.get('/DayBasisMaster');
    return toOptions(
      unwrapList(response.data),
      (row) => row.dayBasisId ?? row.DayBasisId ?? row.id,
      (row) => row.dayBasisName ?? row.DayBasisName ?? row.dayBasisCode ?? row.DayBasisCode
    );
  },
};

export default mastersLookupService;
