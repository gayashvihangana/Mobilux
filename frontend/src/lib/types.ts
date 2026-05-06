export type Role = "ADMIN" | "CUSTOMER" | "STAFF";
export type RepairStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "READY_FOR_PICKUP";
export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface AuthResponse {
  token: string;
  role: Role;
  name: string;
  email: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface RepairResponse {
  id: number;
  customer: UserSummary;
  assignedStaff?: UserSummary | null;
  deviceModel: string;
  issueDescription: string;
  status: RepairStatus;
  cost: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface DiscountResponse {
  id?: number | null;
  percentage: number;
  eligibilityRules: string;
  active: boolean;
  createdAt?: string | null;
}

export interface CustomerDashboardResponse {
  activeRepairs: RepairResponse[];
  repairHistory: RepairResponse[];
  discount: DiscountResponse;
}

export interface StaffDashboardResponse {
  assignedRepairs: RepairResponse[];
}

export interface AdminDashboardResponse {
  totalRepairs: number;
  pendingPayments: number;
  activeRepairs: number;
  totalRevenue: number;
}

export interface PaymentResponse {
  id: number;
  repairId: number;
  amount: number;
  receiptUrl?: string | null;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BillItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BillItemResponse {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BillResponse {
  id: number;
  billNumber: string;
  repairId: number;
  customerName: string;
  customerEmail: string;
  deviceModel: string;
  issueDescription: string;
  repairmanName: string;
  spareParts?: string | null;
  discount?: number | null;
  loyaltyPoints?: number | null;
  notes?: string | null;
  subTotal: number;
  total: number;
  items: BillItemResponse[];
  createdAt: string;
}
