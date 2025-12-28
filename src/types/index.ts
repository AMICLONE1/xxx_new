// User Types - Navigation and KYC types for PowerNetPro
export interface User {
  id: string;
  email: string; // Primary identifier for authentication
  phoneNumber?: string; // Optional, can be added later
  name?: string;
  profilePictureUrl?: string; // URL to profile picture in Supabase storage
  kycStatus: KYCStatus;
  // Energy asset configuration
  hasSolar?: boolean; // User has solar panels
  hasBattery?: boolean; // User has battery storage
  hasGrid?: boolean; // User has grid connection
  createdAt: Date;
  updatedAt: Date;
}

export type KYCStatus = 'pending' | 'verified' | 'rejected';

// Meter Types
export interface Meter {
  id: string;
  userId: string;
  discomName: string;
  consumerNumber: string;
  meterSerialId: string;
  verificationStatus: MeterVerificationStatus;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MeterVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'requested';

// Energy Data Types
export interface EnergyData {
  id: string;
  meterId: string;
  timestamp: Date;
  generation: number; // kW
  consumption: number; // kW
  netExport: number; // kW (positive = export, negative = import)
  interval: number; // minutes (15 for 15-min intervals)
}

// Trading Types
export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  energyAmount: number; // kWh
  pricePerUnit: number; // INR
  totalPrice: number; // INR
  status: OrderStatus;
  createdAt: Date;
  completedAt?: Date;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Seller {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  pricePerUnit: number; // INR per kWh
  availableEnergy: number; // kWh
  rating?: number; // 0-5
  totalSales?: number; // kWh
  greenEnergy: boolean;
  distance?: number; // km from user
}

// Wallet Types
export interface Wallet {
  userId: string;
  energyBalance: number; // kWh
  cashBalance: number; // INR
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: 'INR' | 'kWh';
  status: TransactionStatus;
  description?: string;
  createdAt: Date;
}

export type TransactionType =
  | 'topup'
  | 'withdrawal'
  | 'energy_purchase'
  | 'energy_sale'
  | 'refund';

export type TransactionStatus = 'pending' | 'completed' | 'failed';

// KYC Types
export interface KYCData {
  userId: string;
  documentType: 'aadhaar' | 'pan' | 'electricity_bill' | 'gst' | 'society_registration';
  documentNumber?: string;
  name?: string;
  dateOfBirth?: string;
  address?: string;
  fileUrl?: string;
  status: KYCStatus;
  rejectionReason?: string;
  submittedAt: Date;
  verifiedAt?: Date;
}

// Trading Bot Types
export interface TradingBotConfig {
  userId: string;
  enabled: boolean;
  reservePower: number; // percentage (0-100)
  minSellPrice: number; // INR per unit
  priority: 'neighbors' | 'grid' | 'both';
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  SignUp: undefined;
  TermsConditions: undefined;
  OTP: { email: string };
  ForgotPassword: undefined;
  VerifyResetCode: { email: string };
  ResetPassword: { email: string; token: string };
  Onboarding: undefined;
  KYC: undefined;
  AadhaarScan: undefined;
  PANScan: undefined;
  ElectricityBillScan: undefined;
  GSTScan: undefined;
  SocietyRegistrationScan: undefined;
  MeterRegistration: { isHardwareRequest?: boolean } | undefined;
  MeterStatus: undefined;
  Home: undefined;
  Marketplace: undefined;
  Wallet: undefined;
  Profile: undefined;
  Order: {
    sellerId: string;
    sellerName: string;
    pricePerUnit: number;
    availableEnergy: number;
  };
  EnergyChart: undefined;
  TradingBot: undefined;
  TopUp: undefined;
  Withdraw: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Marketplace: undefined;
  Wallet: undefined;
  Profile: undefined;
};

