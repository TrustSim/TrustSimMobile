// API Envelope Standard
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
  timestamp: string;
}

export interface PagedResult<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Enums
export type VerificationStatus = 'UNVERIFIED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'LOCKED';
export type WalletTransactionType = 'TOP_UP' | 'WITHDRAW';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type OwnershipStatus = 'UNVERIFIED' | 'ACTIVE' | 'ENDED' | 'DISPUTED' | 'REVOKED';
export type ContractStatus = 'DRAFT' | 'PENDING_BUYER_SIGNATURE' | 'PENDING_SELLER_SIGNATURE' | 'FULLY_SIGNED' | 'CANCELLED' | 'EXPIRED';
export type TradeTransactionStatus = 'PendingEscrow' | 'PendingContractSigning' | 'PendingTransfer' | 'Completed' | 'Cancelled' | 'Disputed';
export type SimOwnershipSortBy = 'CreatedDate_Desc' | 'CreatedDate_Asc' | 'AssignedDate_Desc' | 'Status_Desc';

// Auth Types
export interface RegisterRequestDto {
  userName: string;
  email: string;
  password: string;
}

export interface RegisterInitiatedDto {
  email: string;
  message: string;
  cooldownSeconds: number;
  expiryMinutes: number;
}

export interface VerifyEmailRequestDto {
  email: string;
  otpCode: string;
}

export interface LoginRequestDto {
  userNameOrEmail: string;
  password: string;
}

export interface AuthResponseDto {
  userId: string;
  userName: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  token: string;
  expiresAt: string;
}

export interface UserProfileDto {
  userId: string;
  userName: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  address?: string;
  avatarImg?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  verificationStatus: VerificationStatus;
  role: string;
  isActive: boolean;
  walletBalance: number;
}

// Wallet Types
export interface WalletDto {
  id: string;
  userAccountId: string;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  walletStatus: WalletStatus;
  lockVersion: number;
}

export interface WalletTransactionDto {
  id: string;
  transactionCode: string;
  type: WalletTransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  description?: string;
}

export interface StatementItemDto {
  id: string;
  transactionCode: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  status: TransactionStatus;
}

export interface DepositRequestDto {
  amount: number;
  note?: string;
  idempotencyKey?: string;
}

export interface DepositResponseDto {
  transactionId: string;
  transactionCode: string;
  amount: number;
  transferContent: string;
  qrCodeUrl: string;
  expiredAt: string;
}

export interface WithdrawRequestDto {
  amount: number;
  destinationBankCode: string;
  destinationBankName: string;
  destinationAccountNumber: string;
  destinationAccountHolderName: string;
  note?: string;
  idempotencyKey?: string;
}

// eKYC Types
export interface EkycSubmitResultDto {
  verificationId: string;
  userProfileId: string;
  verificationStatus: VerificationStatus;
  isAutoApproved: boolean;
  faceSimilarityScore: number;
  extractedFullName: string;
  extractedIdentityNumber: string;
  extractedDateOfBirth: string;
  message: string;
  submittedAt: string;
}

export interface KycStatusDto {
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  identityNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
}

// SIM Ownership Types
export interface SimOwnershipDto {
  id: string;
  simNumberId: string;
  phoneNumber: string;
  price: number;
  formatRhythmId?: string;
  formatRhythmName?: string;
  simStatus: string;
  carrierName: string;
  carrierCode: string;
  carrierLogo?: string;
  ownershipStatus: OwnershipStatus;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  createdDate: string;
}

export interface SimRegisterRequestDto {
  phoneNumber: string;
  price: number;
  carrierId: string;
  formatRhythmId?: string;
}

// Contract & Handover Types
export interface ContractPreviewDto {
  contractId: string;
  tradeId: string;
  tradeCode: string;
  contractStatus: ContractStatus;
  buyerFullName: string;
  buyerSigned: boolean;
  buyerSignedAt?: string | null;
  sellerFullName: string;
  sellerSigned: boolean;
  sellerSignedAt?: string | null;
  htmlContent: string;
  pdfDocumentUrl?: string | null;
  winningNoticeUrl?: string;
  simNumber?: string;
  documentHash?: string;
}

export interface ContractOtpSendResultDto {
  email: string;
  cooldownSeconds: number;
  expirySeconds: number;
  message: string;
}

export interface ContractSignResultDto {
  contractId: string;
  tradeId: string;
  contractStatus: ContractStatus;
  isFullySigned: boolean;
  signedAt: string;
  documentUrl?: string;
  documentHash?: string;
  message: string;
}

export interface ContractIntegrityResultDto {
  isValid: boolean;
  documentStatus: string;
  expectedDocumentHash: string;
  providedSha256: string;
  hashMatched: boolean;
  padesSignatureSerial: string;
  tsaTimestamp: string;
  tsaAuthority: string;
  sealedAt: string;
  totalSignatures: number;
  message: string;
}

export interface SimTransferProgressDto {
  tradeId: string;
  tradeCode: string;
  tradeStatus: TradeTransactionStatus;
  escrowAmount: number;
  escrowStatus: string;
  transferProofUrl?: string | null;
  transferProofNote?: string | null;
  transferDeadline: string;
  canConfirm: boolean;
}

export interface SimTransferConfirmResultDto {
  tradeId: string;
  tradeCode: string;
  tradeStatus: TradeTransactionStatus;
  escrowStatus: string;
  liquidationDocumentUrl?: string;
  message: string;
}
