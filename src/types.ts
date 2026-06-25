import { Timestamp } from "firebase/firestore";

export type UserRole = 'customer' | 'provider' | 'shop_owner' | 'admin' | 'super-admin' | 'sub-admin';
export type ProviderType = 'worker';
export type KYCStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type BookingStatus = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
export type JobType = 'daily' | 'contract' | 'standard';

export interface Category {
  id: string;
  name_en: string;
  name_bn: string;
  icon: string;
  color: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  role: UserRole;
  preferredLanguage: 'bn' | 'en';
  onboardingComplete: boolean;
  createdAt: Timestamp;
  isBlocked: boolean;
  walletBalance: number;
  referralCode: string;
  referredBy?: string | null;
  address?: string;
  location?: { lat: number; lng: number };
  _collection?: 'users' | 'providers' | 'shops';
  
  // Common extended fields for easy access
  isOnline?: boolean;
  isVerified?: boolean;
  kycStatus?: KYCStatus;
  rating?: number;
  totalJobs?: number;
  totalEarnings?: number;
  shopName?: string;
  shopCategory?: string;
  shopAddress?: string;
  isOpen?: boolean;
  totalOrders?: number;
  totalProducts?: number;
  service?: string;
  yearsExperience?: number;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  createdAt: any;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'holiday';
  note?: string;
}

export interface ProviderProfile extends UserProfile {
  providerType: ProviderType;
  skill?: string;
  category: string; // ID of the category (e.g., 'raj_mistri')
  preferredJobType: JobType;
  hourlyRate: number;
  dailyRate?: number;
  contractRate?: number;
  experience: number;
  bio: string;
  isOnline: boolean;
  isVerified: boolean;
  kycStatus: KYCStatus;
  kycSubmittedAt?: Timestamp;
  kycReviewedAt?: Timestamp;
  kycReviewedBy?: string;
  rating: number;
  reviewCount: number;
  totalJobs: number;
  totalEarnings: number;
  walletBalance: number;
  portfolio?: PortfolioItem[];
  attendance?: AttendanceRecord[];
}

export interface ShopProfile extends UserProfile {
  shopName: string;
  shopCategory: string; // ID of the category (e.g., 'construction_material')
  shopAddress: string;
  businessLicenseUrl?: string;
  isVerified: boolean;
  kycStatus: KYCStatus;
  kycSubmittedAt?: Timestamp;
  kycReviewedAt?: Timestamp;
  kycReviewedBy?: string;
  rating: number;
  totalSales: number;
  hasSeenGuide?: boolean;
  images?: string[];
}

export interface Milestone {
  id: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid';
  otp: string;
  requestedAt: any;
  paidAt?: any;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  providerId: string;
  providerName: string;
  providerCollection?: 'providers' | 'shops';
  service: string;
  description: string;
  address: string;
  location?: { lat: number; lng: number };
  date: string;
  time: string;
  hours: number;
  basePrice: number;
  markupPrice: number;
  applicationFee: number;
  paymentCharges: number;
  totalAmount: number; // This will be the markupPrice
  commission: number; // This will be applicationFee + paymentCharges
  providerEarning: number; // This will be basePrice
  paymentMethod: 'bkash' | 'nagad' | 'cash';
  paymentStatus: 'pending' | 'submitted' | 'paid' | 'rejected';
  trxId?: string;
  paymentScreenshotUrl?: string;
  status: BookingStatus;
  jobType: JobType;
  completionOTP?: string;
  otp?: string; // 4-digit start OTP
  isRequestingStartOtp?: boolean;
  isRequestingCompletionOtp?: boolean;
  milestones?: Milestone[];
  provider?: ProviderProfile | UserProfile;
  providerLocation?: { lat: number; lng: number };
  providerAddress?: string;
  createdAt: any;
  updatedAt?: any;
  acceptedAt?: any;
  cancelledAt?: any;
  completedAt?: any;
  reviewSubmitted?: boolean;
  rating?: number;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface AdminConfig {
  applicationFeeRate: number;
  paymentChargeRate: number;
  minWithdrawal: number;
  referralRewardAmount: number;
  isReferralEnabled: boolean;
  bkashNumber: string;
  nagadNumber: string;
}

export interface Chat {
  id: string;
  participants: string[];
  customerId: string;
  providerId: string;
  customerName: string;
  providerName: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  lastSenderId: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  type: 'text' | 'image';
  fileUrl?: string;
  participants: string[];
  createdAt: any;
  read: boolean;
  seen?: boolean;
}

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  message?: string; // Legacy support
  type: 'booking' | 'payment' | 'kyc' | 'promo' | 'system' | 'status' | 'chat';
  read: boolean;
  createdAt: any;
}

export interface Transaction {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userAddress?: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status?: 'pending' | 'approved' | 'rejected';
  method?: 'bkash' | 'nagad';
  trxId?: string;
  screenshotUrl?: string;
  userCollection?: 'users' | 'providers' | 'shops';
  reviewedByAdmin?: string;
  reviewedAt?: any;
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  providerId: string;
  name: string;
  price: number;
  stock: number;
  inStock?: boolean;
  description: string;
  imageUrl: string;
  image?: string; // Legacy support
  category: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Order {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  shopId: string;
  shopName: string;
  productName?: string; // Legacy support
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[];
  totalAmount: number;
  totalItems?: number;
  time?: string;
  deliveryMethod?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'bkash' | 'nagad' | 'cash';
  paymentStatus: 'pending' | 'paid';
  createdAt: any;
  updatedAt?: any;
  deliveredAt?: any;
}

export interface Withdrawal {
  id?: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userAddress?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method: 'bkash' | 'nagad';
  accountNumber: string;
  userCollection?: 'users' | 'providers' | 'shops';
  reviewedByAdmin?: string;
  reviewedAt?: any;
  createdAt: any;
  type?: 'provider' | 'shop';
}

export interface AdminProfile {
  adminId: string;
  uid: string; // duplicate for ease of access
  name: string;
  email: string;
  role: 'super-admin' | 'sub-admin';
  specialty?: string;
  status: 'active' | 'inactive';
  isOnline: boolean;
  currentActiveTickets: number;
  permissions: {
    canManageUsers: boolean;
    canManageWorkers: boolean;
    canViewEarnings: boolean;
    canManageSupport: boolean;
    canDeleteData: boolean;
  };
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
  _collection: 'admins';
}

export interface SupportTicket {
  ticketId: string;
  raisedBy: string;
  requesterRole: 'user' | 'worker';
  requesterName: string;
  requesterPhone: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp | null;
}

export interface SupportMessage {
  messageId: string;
  ticketId: string;
  senderId: string;
  senderType: 'admin' | 'user' | 'worker' | 'shop';
  text: string;
  attachments?: string[];
  timestamp: Timestamp;
}

export interface AppError {
  errorId?: string;
  message: string;
  stackTrace?: string;
  location: {
    page: string;
    component: string;
    platform: 'customer-app' | 'provider-app' | 'admin-panel' | 'shop-app' | 'unknown';
  };
  deviceInfo: {
    os: string;
    browserOrClient: string;
    deviceModel?: string;
  };
  userContext?: {
    userId: string;
    role: string;
    userPhone?: string;
  };
  status: 'unresolved' | 'in-progress' | 'resolved' | 'ignored';
  severity: 'low' | 'medium' | 'critical';
  timestamp: any; // serverTimestamp
}
