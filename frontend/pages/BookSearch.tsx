import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, AlertCircle, BookOpen, Check, 
  ChevronLeft, ChevronRight, Layers, User, PlusCircle, 
  Book, MapPin, Phone, Mail 
} from 'lucide-react';

import { api } from '../services/api';
import { BookSearchResult } from '../types';
import { Button } from '../components/Button';

// --- Helper: Calculate Relevance Score ---
const calculateRelevanceScore = (book: BookSearchResult, keyword: string): number => {
  const term = keyword.toLowerCase().trim();
  if (!term) return 0;

  const title = (book.name || '').toLowerCase();
  const author = (book.author || '').toLowerCase();
  const category = (book.category || '').toLowerCase();
  const publisher = (book.publisher || '').toLowerCase();

  let score = 0;

  // 1. Exact Matches (Highest Priority)
  if (title === term) score += 1000;
  if (author === term) score += 500;

  // 2. Starts With (High Priority)
  if (title.startsWith(term)) score += 300;
  if (author.startsWith(term)) score += 150;

  // 3. Contains Whole Phrase (Medium Priority)
  if (title.includes(term)) score += 100;
  if (author.includes(term)) score += 50;
  if (publisher.includes(term)) score += 20;

  // 4. Individual Word Overlap (Low Priority)
  const words = term.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    words.forEach(word => {
      if (title.includes(word)) score += 10;
      if (author.includes(word)) score += 5;
      if (publisher.includes(word)) score += 2;
    });
  }

  return score;
};

export const BookSearch: React.FC = () => {
  const navigate = useNavigate();
  
  // States
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const [readerStats, setReaderStats] = useState<{
    card_type: string;
    card_status: string;
    max_books: number;
    current_active_books: number;
    remaining_slots: number;
    has_overdue: boolean;
  } | null>(null);

  const PAGE_SIZE = 12;

  // Effects
  useEffect(() => {
    executeSearch(1);
    fetchReaderStats();
  }, []);

  const fetchReaderStats = async () => {
    try {
      const res = await api.getCurrentlyBorrowed();
      if (res) {
        setReaderStats({
          card_type: res.card_type || 'Standard',
          card_status: res.card_status || 'Active',
          max_books: res.max_books || 5,
          current_active_books: res.total_borrowed || 0,
          remaining_slots: res.remaining_slots || 0,
          has_overdue: res.has_overdue || false
        });
        console.log('Reader Stats Set:', {
          has_overdue: res.has_overdue === true,
          remaining_slots: res.remaining_slots || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch reader stats', err);
    }
  };

  const executeSearch = async (page: number) => {
    setLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    try {
      const res = await api.searchBooks({ keyword: keyword, page: page });
      let fetchedBooks = res.books || [];

      if (keyword.trim()) {
        fetchedBooks.sort((a, b) => calculateRelevanceScore(b, keyword) - calculateRelevanceScore(a, keyword));
      }

      setBooks(fetchedBooks);
      setTotalRecords(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / PAGE_SIZE));
      setCurrentPage(page);
    } catch (err: any) {
      if (err.message?.includes('Session expired')) navigate('/login');
      else setErrorMsg(err.message || 'Failed to load books.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      executeSearch(newPage);
    }
  };

  const toggleBookSelection = (bookId: string) => {
    if (!bookId) return;
    console.log('🔍 Toggle Book - readerStats:', readerStats);
    
    setSelectedBooks(prev => {
      if (prev.includes(bookId)) {
        setWarningMsg('');
        return prev.filter(id => id !== bookId);
      }
      
      if (readerStats) {
        if (readerStats.card_status === 'Blocked') {
          setErrorMsg('Cannot borrow books. Your card is permanently blocked.');
          setTimeout(() => setErrorMsg(''), 5000);
          return prev;
        }

        console.log('📌 has_overdue value:', readerStats.has_overdue);
        
        if (readerStats.has_overdue) {
          console.log('🚫 BLOCKED: User has overdue books!');
          setErrorMsg('Cannot borrow books. You have overdue books. Please return them first.');
          setTimeout(() => setErrorMsg(''), 5000);
          return prev;
        }

        const booksToSelect = prev.length + 1;
        if (booksToSelect > readerStats.remaining_slots) {
          setWarningMsg(`Cannot select more books. You have ${readerStats.current_active_books} active books and can only borrow ${readerStats.remaining_slots} more.`);
          setTimeout(() => setWarningMsg(''), 5000);
          return prev;
        }
      }

      setWarningMsg('');
      return [...prev, bookId];
    });
  };

  const handleCreateRequest = async () => {
    if (selectedBooks.length === 0) return;

    if (readerStats?.card_status === 'Blocked') {
      setErrorMsg('Cannot create request. Your card is permanently blocked.');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    if (readerStats?.has_overdue) {
      setErrorMsg('Cannot create request. You have overdue books. Please return them first.');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    if (readerStats && selectedBooks.length > readerStats.remaining_slots) {
      setErrorMsg(`Cannot create request. You can only borrow ${readerStats.remaining_slots} more books.`);
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    try {
      setLoading(true);
      await api.createBorrowRequest(selectedBooks);
      setSuccessMsg('Borrow request created successfully!');
      setSelectedBooks([]);
      await fetchReaderStats();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      if (err.message?.includes('Session expired')) navigate('/login');
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('suspended') || msg.includes('overdue')) {
        setWarningMsg(msg);
        setTimeout(() => setWarningMsg(''), 8000);
      } else {
        setErrorMsg(msg || 'Failed to create request');
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const getBookId = (book: BookSearchResult) => book.id || book.book_title_id || '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1. Blocked Card Warning Modal */}
      {readerStats?.card_status === 'Blocked' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
            <div className="text-center mb-6">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">CARD PERMANENTLY BLOCKED</h2>
              <p className="text-gray-500 text-lg">Your account is currently restricted from borrowing.</p>
            </div>
            <div className="bg-red-50 rounded-xl p-6 mb-6 text-red-800 text-sm space-y-3">
              <p className="font-bold flex items-center gap-2 italic text-base">Important Notice:</p>
              <p>• You may ONLY return books currently in your possession.</p>
              <p>• You CANNOT create new borrow requests.</p>
              <p>• Please settle any outstanding fines and contact management.</p>
            </div>
            <Button onClick={() => navigate('/return-request')} className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold uppercase tracking-wider">
              Go to Return Books
            </Button>
          </div>
        </div>
      )}

      {/* 2. Hero Section & Search */}
      <header className="relative bg-slate-900 py-24 px-4">
        <div className="absolute inset-0 opacity-30">
          <img 
            src="https://thuvienquocgia.vn/wp-content/uploads/2018/10/5-dieu-ban-doc-can-biet-ve-thu-vien-quoc-gia-viet-nam-1-3.jpg" 
            alt="Library Background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase ">
            National Library 
          </h1>

          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); executeSearch(1); }} className="flex flex-col sm:flex-row gap-3 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border-none focus:ring-0 text-gray-900"
                />
              </div>
              <Button type="submit" disabled={loading} className="py-4 px-10 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-xl transition-all">
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* 3. Reader Stats Cards */}
      <section className="max-w-7xl mx-auto w-full px-4 -mt-12 relative z-10">
        {readerStats && (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-5 md:border-r border-gray-100 last:border-0">
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><User className="w-8 h-8" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Membership</p>
                <p className="text-xl font-black text-gray-900">{readerStats.card_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 md:border-r border-gray-100 last:border-0">
              <div className="p-4 bg-orange-50 rounded-2xl text-orange-600"><BookOpen className="w-8 h-8" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Currently Borrowed</p>
                <p className="text-xl font-black text-gray-900">{readerStats.current_active_books} / {readerStats.max_books}</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl ${readerStats.remaining_slots > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <PlusCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Slots</p>
                <p className={`text-xl font-black ${readerStats.remaining_slots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {readerStats.remaining_slots} Items
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-16">
        {/* Alerts */}
        <div className="space-y-4 mb-10">
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center gap-3 shadow-sm">
              <AlertCircle className="text-red-600 shrink-0" />
              <p className="text-red-800 font-medium">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl flex items-center gap-3 shadow-sm">
              <Check className="text-green-600 shrink-0" />
              <p className="text-green-800 font-medium">{successMsg}</p>
            </div>
          )}
          {warningMsg && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl flex items-center gap-3 shadow-sm">
              <AlertCircle className="text-yellow-600 shrink-0" />
              <p className="text-yellow-800 font-medium">{warningMsg}</p>
            </div>
          )}
          {readerStats?.has_overdue && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl flex items-center gap-5 shadow-sm">
              <AlertCircle className="text-orange-600 shrink-0 w-8 h-8" />
              <div>
                <p className="font-black text-orange-900 uppercase">Overdue Books Alert</p>
                <p className="text-orange-800 text-sm">Please return overdue items immediately to restore your borrowing privileges.</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        {hasSearched && (
          <div className="flex items-center gap-2 text-gray-500 mb-8 font-medium">
            <Layers className="w-5 h-5" />
            <span>Found <span className="text-gray-900 font-bold">{totalRecords}</span> titles for your search</span>
          </div>
        )}

        {/* Book Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {books.length === 0 && !loading && (
            <div className="col-span-full text-center py-32 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-xl font-medium">No books match your criteria.</p>
            </div>
          )}
          
          {books.map((book) => {
            const bookId = getBookId(book);
            const isSelected = selectedBooks.includes(bookId);
            const isOutOfStock = book.available_books === 0;
            const canBorrow = !isOutOfStock && !readerStats?.has_overdue && readerStats?.card_status !== 'Blocked';

            return (
              <div key={bookId} className={`group flex flex-col bg-white rounded-3xl transition-all duration-500 border-2 shadow-sm hover:shadow-2xl hover:-translate-y-3 overflow-hidden ${isSelected ? 'border-blue-500 ring-8 ring-blue-50' : 'border-transparent'}`}>
                {/* Cover */}
                <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                  <img 
                    src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`} 
                    alt={book.name}
                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-40' : ''}`}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=No+Cover+Found'; }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                      {book.category}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[3px] flex items-center justify-center animate-in zoom-in duration-300">
                      <div className="bg-white text-blue-600 p-5 rounded-full shadow-2xl scale-110"><Check className="w-10 h-10 stroke-[4]" /></div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-7 flex flex-col flex-grow">
                  <h3 className="font-black text-slate-900 text-lg leading-tight mb-2 line-clamp-2 h-14 group-hover:text-blue-600 transition-colors" title={book.name}>
                    {book.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-6 font-medium">by <span className="text-slate-700 not-italic font-bold">{book.author}</span></p>
                  
                  <div className="mt-auto space-y-5">
                    <div className="flex justify-between items-center py-3 border-y border-slate-50">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg tracking-tighter ${book.available_books > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {book.available_books > 0 ? `${book.available_books} IN STOCK` : 'OUT OF STOCK'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase">ISBN: {book.isbn}</span>
                    </div>

                    <Button
                      onClick={() => toggleBookSelection(bookId)}
                      disabled={!canBorrow && !isSelected}
                      className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                          : !canBorrow ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-200'
                      }`}
                    >
                      {isSelected ? 'Selected' : isOutOfStock ? 'No Stock' : 'Select to Borrow'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {books.length > 0 && (
          <div className="mt-24 flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-white rounded-[2rem] shadow-xl border border-slate-100">
            <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">
              Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className="rounded-2xl px-10 py-4 font-black border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-2" /> Prev
              </Button>
              <Button variant="secondary" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="rounded-2xl px-10 py-4 font-black border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                Next <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* 5. Floating Action Bar */}
      {selectedBooks.length > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-2xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-5 flex items-center gap-10 z-50 animate-in slide-in-from-bottom-20 duration-700 ring-1 ring-black/5">
          <div className="flex items-center gap-5 pl-5 border-r border-slate-200 pr-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selection</p>
              <p className="text-2xl font-black text-blue-600 tracking-tighter">{selectedBooks.length} Books</p>
            </div>
          </div>
          <div className="flex gap-4 pr-2">
            <button onClick={() => { setSelectedBooks([]); setWarningMsg(''); }} className="px-6 py-3 text-sm font-black text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
            <Button onClick={handleCreateRequest} className="bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-[1.25rem] font-black shadow-2xl transition-all uppercase tracking-widest text-xs">
              Confirm Borrowing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};