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
export type SimOwnershipSortByLegacy = 'CreatedDate_Desc' | 'CreatedDate_Asc' | 'AssignedDate_Desc' | 'Status_Desc';

export enum SortOrder {
  Desc = 0,
  Asc = 1,
}

export type SortOrderType = 0 | 1 | 'Desc' | 'Asc';

export enum SimOwnershipSortBy {
  CreatedDate = 1,
  AssignedDate = 2,
  Status = 3,
}

export enum WalletTransactionSortBy {
  CreatedAt = 1,
  Amount = 2,
  Status = 3,
  TransactionType = 4,
  TransactionCode = 5,
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY FILTER INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseQueryFilter<TSortBy = number> {
  pageIndex?: number;
  pageSize?: number;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: TSortBy;
  sortOrder?: SortOrderType;
}

export interface UnifiedStatementQueryFilter extends BaseQueryFilter<WalletTransactionSortBy | number> {
  sourceType?: 'WALLET' | 'AUCTION' | 'AUCTION_DEPOSIT' | 'ESCROW' | 'COMPENSATION';
  direction?: 'CREDIT' | 'DEBIT' | 'LOCK';
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | TransactionStatus;
  transactionType?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface SimOwnershipQueryFilter extends BaseQueryFilter<SimOwnershipSortBy> {
  status?: 'ACTIVE' | 'TRANSFERRED' | 'REVOKED' | OwnershipStatus;
  simId?: string;
}

export interface UserKycHistoryQueryFilter extends BaseQueryFilter<number> {
  status?: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | VerificationStatus;
  idCardNumber?: string;
}

export interface WalletTransactionQueryFilter extends BaseQueryFilter<WalletTransactionSortBy> {
  type?: WalletTransactionType | string;
  status?: TransactionStatus | string;
  minAmount?: number;
  maxAmount?: number;
}

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
  verifiedAt?: string;
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
  walletId?: string;
  transactionCode: string;
  walletTransactionType?: WalletTransactionType;
  type?: WalletTransactionType;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  transactionStatus?: TransactionStatus;
  status?: TransactionStatus;
  createdAt: string;
  completedAt?: string;
  expiredAt?: string;
  description?: string;
  qrCodeUrl?: string;
  destinationBankCode?: string;
  destinationBankName?: string;
  destinationAccountNumberMasked?: string;
  destinationAccountHolderName?: string;
}

export interface StatementItemDto {
  id: string;
  source?: 'WALLET' | 'AUCTION' | 'AUCTION_DEPOSIT' | 'ESCROW' | 'COMPENSATION' | string;
  transactionType: string;
  direction?: 'CREDIT' | 'DEBIT' | 'LOCK' | string;
  referenceCode?: string;
  transactionCode?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  status: string;
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
  extractedDateOfBirth?: string;
  extractedAddress?: string;
  frontCardUrl?: string;
  backCardUrl?: string;
  selfieUrl?: string;
  message: string;
  submittedAt: string;
}

export interface KycStatusDto {
  id?: string;
  userProfileId?: string;
  userAccountId?: string;
  userName?: string;
  fullName?: string;
  identityNumber?: string;
  frontIdCardUrl?: string;
  backIdCardUrl?: string;
  faceSelfieUrl?: string;
  faceSimilarityScore?: number;
  verificationMethod?: string;
  verificationStatus: VerificationStatus;
  isVerified?: boolean;
  rejectionReason?: string;
  submittedAt?: string;
  verifiedAt?: string;
  dateOfBirth?: string;
}

// Format Rhythm Types
export interface FormatRhythmDto {
  id: string;
  formatRhythmName: string;
  value: string;
  description: string;
  basePriceFactor: number;
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
  formatRhythmId: string;
  categoryIds?: string[];
  phonePrefixId?: string;
  price?: number;
  carrierId?: string;
}

export interface TradeTransactionDto {
  id: string;
  tradeTransactionCode: string;
  auctionId?: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
  simNumberId?: string;
  simPhoneNumber?: string;
  escrowAmount?: number;
  status: TradeTransactionStatus;
  escrowStatus?: string;
  escrowDeadline?: string;
  signingDeadline?: string;
  transferDeadline?: string;
  liquidationDeadline?: string;
  completedAt?: string;
  createdDate?: string;
}

// Contract & Handover Types
export interface ContractPreviewDto {
  tradeId: string;
  tradeTransactionCode?: string;
  tradeCode?: string;
  contractId?: string;
  contractStatus: ContractStatus;
  buyerFullName?: string;
  buyerName?: string;
  buyerSigned: boolean;
  buyerSignedAt?: string | null;
  sellerFullName?: string;
  sellerName?: string;
  sellerSigned: boolean;
  sellerSignedAt?: string | null;
  htmlContent: string;
  documentPdfUrl?: string | null;
  pdfDocumentUrl?: string | null;
  winningNoticeUrl?: string;
  simPhoneNumber?: string;
  simNumber?: string;
  escrowAmount?: number;
  documentHash?: string;
}

export interface ContractOtpSendResultDto {
  email: string;
  cooldownSeconds: number;
  expirySeconds: number;
  message: string;
}

export interface ContractSignResultDto {
  tradeId: string;
  tradeTransactionCode?: string;
  signatureRole?: string;
  signedAt: string;
  isFullySigned: boolean;
  contractStatus: ContractStatus | string;
  message: string;
  contractId?: string;
  documentUrl?: string;
  documentHash?: string;
}

export interface ContractIntegrityResultDto {
  isValid: boolean;
  documentStatus: string;
  expectedDocumentHash?: string;
  providedSha256?: string;
  hashMatched: boolean;
  padesSignatureSerial?: string;
  padesSignatureHash?: string;
  tsaTimestamp?: string;
  tsaAuthority?: string;
  sealedAt?: string;
  isAutoEnforced?: boolean;
  totalSignatures: number;
  message: string;
}

export interface TransferProofDto {
  id?: string;
  proofImageUrl?: string;
  imageUrl?: string;
  description?: string;
  proofStatus?: string;
  verifiedAt?: string;
  createdAt?: string;
  createdDate?: string;
}

export interface SimTransferProgressDto {
  tradeId: string;
  tradeTransactionCode?: string;
  tradeCode?: string;
  simTransferId?: string;
  simTransferStatus?: string;
  tradeStatus?: TradeTransactionStatus | string;
  escrowAmount: number;
  escrowStatus: string;
  simPhoneNumber?: string;
  canConfirmTransfer?: boolean;
  canConfirm?: boolean;
  canSubmitProof?: boolean;
  isSeller?: boolean;
  isBuyer?: boolean;
  deadline?: string;
  transferDeadline?: string;
  proofs?: TransferProofDto[];
  transferProofUrl?: string | null;
  transferProofNote?: string | null;
  platformFeePercent?: number;
  platformFeeAmount?: number;
  netSellerPayout?: number;
  completedAt?: string;
  message?: string;
}

export interface SimTransferConfirmResultDto {
  tradeId: string;
  tradeTransactionCode?: string;
  tradeCode?: string;
  simTransferStatus?: string;
  tradeStatus?: TradeTransactionStatus | string;
  escrowStatus: string;
  liquidationDocumentUrl?: string;
  netSellerPayout?: number;
  completedAt?: string;
  message?: string;
}
