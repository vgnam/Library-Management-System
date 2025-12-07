
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
  max_books?: number;
  remaining_slots?: number;
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
  borrow_limit: number;
  current_borrowed_count: number;
  available_slots: number;
  can_borrow: boolean;
  active_loans: CurrentlyBorrowedBook[];
  overdue_loans: CurrentlyBorrowedBook[];
}
