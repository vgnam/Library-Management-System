
export enum UserRole {
  READER = 'reader',
  LIBRARIAN = 'librarian',
  MANAGER = 'manager'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum ReaderType {
  STANDARD = 'standard',
  VIP = 'vip'
}

export enum CardStatus {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  SUSPENDED = 'Suspended',
  BLOCKED = 'Blocked'
}

// Matches Python BorrowStatusEnum exactly
export enum BorrowStatus {
  PENDING = 'Pending',
  ACTIVE = 'Active',
  RETURNED = 'Returned',
  OVERDUE = 'Overdue',
  REJECTED = 'Rejected',
  PENDING_RETURN = 'PendingReturn',
  LOST = 'Lost'
}

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

// Corresponds to the "BookTitle" data returned by the Search API
export interface BookSearchResult {
  id?: string; // Mapped ID
  book_title_id?: string; // Raw DB ID
  name: string;
  author: string;
  publisher: string;
  category?: string;
  total_books?: number; // Total number of physical book copies
  borrowed_books?: number; // Number of copies currently borrowed
  available_books?: number; // Number of copies available to borrow
}

// Corresponds to the "Book" class provided (Physical Copy)
export interface PhysicalBook {
  book_id: string; // Primary Key
  book_title_id: string; // ForeignKey
  condition?: string;
  being_borrowed: boolean;
}

export interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  books: BookSearchResult[];
}

// The inner 'book' object in the history record
export interface HistoryBookInfo {
  book_id: string;
  title: string;
  author: string;
  due_date: string | null;
  actual_return_date: string | null;
  is_returned: boolean;
  is_overdue: boolean;
  days_overdue: number;
  status: string;
}

// Penalty information
export interface PenaltyInfo {
  penalty_id: string | null;
  penalty_type: string;
  description: string;
  fine_amount: number;
  days_overdue?: number;
  status: string;
  real_time_calculated?: boolean;
  auto_calculated?: boolean;
}

// Top level history record (Matches provided JSON structure)
export interface BorrowHistoryRecord {
  borrow_slip_id?: string;
  borrow_detail_id?: string;
  borrow_date: string;
  due_date: string | null;      // Slip Due Date
  actual_return_date?: string | null;
  status: string;               // Slip Status
  penalty?: PenaltyInfo | null; // Penalty information if exists
  book: HistoryBookInfo;        // Nested book details
}

export interface HistoryResponse {
  total: number;
  page: number;
  page_size: number;
  history: BorrowHistoryRecord[];
  total_pages?: number;
}

// Matches the flat structure of 'currently_borrowed_books' in provided JSON
export interface CurrentlyBorrowedBook {
  borrow_detail_id: string;
  borrow_slip_id: string;
  book_id: string;
  title: string;
  author: string;
  borrow_date: string;
  due_date: string;
  is_overdue: boolean;
  days_overdue: number;
  status: string;
}

export interface CurrentBorrowedResponse {
  total_borrowed: number;
  currently_borrowed_books: CurrentlyBorrowedBook[];
  card_type?: string;
  card_status?: string;
  max_books?: number;
  remaining_slots?: number;
  has_overdue?: boolean;
}

export interface OverdueResponse {
  total_overdue: number;
  overdue_books: any[]; // Structure likely similar to CurrentlyBorrowedBook
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role?: string;
}

export interface RequestedBook {
  book_id: string;
  name: string;
}

export interface BorrowRequest {
  borrow_slip_id: string; // Maps to bs_id
  reader_name: string;
  request_date: string;
  status: BorrowStatus; // Updated to use the Enum
  books_count: number;
  books?: RequestedBook[];
}

// --- Return Service Types ---

export interface ReturnRequest {
  borrow_detail_id: string;
  book_title: string;
  reader_name: string;
  request_date: string;
  due_date: string;
}

// Reader initiates return
export interface RequestReturnBookRequest {
  borrow_detail_id: string;
}

// Librarian processes return (Generic or Good condition)
export interface ProcessReturnRequest {
  borrow_detail_id: string;
  condition?: string;
  damage_description?: string;
  fine_amount?: number;
}

// Librarian reports damage
export interface ProcessDamageBookRequest {
  borrow_detail_id: string;
  damage_description: string;
  fine_amount?: number;
}

// Librarian reports lost
export interface ProcessLostBookRequest {
  borrow_detail_id: string;
}

export interface ReaderStatusResponse {
  reader_id: string;
  full_name: string;
  card_type: string;
  card_status: string;
  infraction_count?: number;
  borrow_limit: number;
  current_borrowed_count: number;
  available_slots: number;
  can_borrow: boolean;
  active_loans: CurrentlyBorrowedBook[];
  overdue_loans: CurrentlyBorrowedBook[];
}

export interface BookWithAvailability {
  book_title_id: string;
  name: string;
  author: string;
  total_count: number;
  available_count: number;
  has_pending_request: boolean;
  is_available: boolean;
}

// Acquisition interfaces
export interface Publisher {
  pub_id: string;
  name: string;
  address?: string;
}

export interface BookItemForAcquisition {
  book_title_id: string;
  quantity: number;
  price: number;
}

export interface AcquisitionSlipDetail {
  detail_id?: string;
  book_title_id: string;
  book_name: string;
  author: string;
  category?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface AcquisitionSlip {
  acq_id: string;
  librarian_id: string;
  librarian_name: string;
  acc_date: string;
  total_items: number;
  total_amount: number;
  details?: AcquisitionSlipDetail[];
  details_count?: number;
}

export interface AcquisitionHistoryResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: AcquisitionSlip[];
  };
}

// --- Librarian User Management Types ---

export interface ReadingCardInfo {
  card_id: string;
  card_type: string;
  fee: number;
  register_date: string;
  register_office: string;
  status: string;
}

export interface ReaderInfo {
  reader_id: string;
  total_borrowed: number;
  currently_borrowed: number;
  infraction_count: number;
  reading_card?: ReadingCardInfo;
}

export interface UserInfo {
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  phone_number?: string;
  age?: number;
  dob?: string;
  address?: string;
  gender?: string;
  role: string;
  reader_info?: ReaderInfo;
}

export interface UserBorrowedBook {
  borrow_detail_id: string;
  book_id: string;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  borrow_slip_id: string;
  borrow_date: string;
  due_date?: string;
  status: string;
  is_overdue: boolean;
  days_overdue: number;
  penalty?: {
    penalty_id: string;
    penalty_type: string;
    description: string;
    status: string;
  };
}

export interface ReaderListItem {
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  phone_number?: string;
  reader_id: string;
  total_borrowed: number;
  currently_borrowed: number;
  infraction_count: number;
  card_id: string;
  card_type: string;
  card_status: string;
  register_date: string;
}

export interface ReadersListResponse {
  total: number;
  limit: number;
  offset: number;
  readers: ReaderListItem[];
}

export interface RemoveBanResponse {
  success: boolean;
  message: string;
  user_id: string;
  username: string;
  reader_id: string;
  card_id: string;
  old_status: string;
  new_status: string;
}

export interface UserBorrowHistoryRecord {
  borrow_detail_id: string;
  borrow_slip_id: string;
  book_id: string;
  book_title_id: string;
  book_name: string;
  author: string | null;
  category: string | null;
  borrow_date: string;
  due_date: string | null;
  actual_return_date: string | null;
  status: string;
  is_overdue: boolean;
  penalty: {
    penalty_id: string;
    penalty_type: string;
    description: string;
    status: string;
  } | null;
}

export interface UserBorrowHistoryResponse {
  user_id: string;
  reader_id: string;
  username: string;
  full_name: string;
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  history: UserBorrowHistoryRecord[];
}

// --- Manager Types ---

export interface SystemStatistics {
  cards: {
    total_issued: number;
    active: number;
    suspended: number;
    blocked: number;
  };
  users: {
    total_readers: number;
    total_librarians: number;
  };
  borrowing: {
    total_borrows: number;
    active_borrows: number;
    overdue_borrows: number;
    returned_borrows: number;
    return_rate: number;
  };
  infractions: {
    total_infractions: number;
    readers_with_infractions: number;
    average_per_reader: number;
  };
  penalties: {
    total_penalties: number;
    unpaid_penalties: number;
    total_amount: number;
    unpaid_amount: number;
  };
  trends: {
    recent_borrows_30_days: number;
    avg_borrows_per_day: number;
  };
}

export interface LibrarianInfo {
  lib_id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  phone_number?: string;
  years_of_experience: number;
  total_borrow_slips: number;
}

export interface CreateLibrarianRequest {
  username: string;
  password: string;
  full_name: string;
  email: string;
  phone_number?: string;
  years_of_experience?: number;
}

export interface CreateLibrarianResponse {
  success: boolean;
  message: string;
  librarian: {
    lib_id: string;
    user_id: string;
    username: string;
    full_name: string;
    email: string;
    phone_number?: string;
    years_of_experience: number;
  };
}

export interface DeleteLibrarianResponse {
  success: boolean;
  message: string;
  deleted_librarian: {
    lib_id: string;
    username: string;
    full_name: string;
    had_records: boolean;
  };
}

