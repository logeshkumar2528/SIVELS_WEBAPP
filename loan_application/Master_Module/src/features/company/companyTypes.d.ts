export interface CompanyBase {
  id?: string | number;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CompanyType extends CompanyBase { companyTypeName: string; description?: string; }
export interface Company extends CompanyBase { companyName: string; shortName?: string; registrationNumber?: string; }
export interface CompanyChild extends CompanyBase { companyId: string | number; }
export type CompanyRequest = Omit<CompanyBase, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> & Record<string, unknown>;
export type CompanyResponse = CompanyBase & Record<string, unknown>;
