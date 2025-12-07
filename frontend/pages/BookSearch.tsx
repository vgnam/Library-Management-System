import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookSearchResult } from '../types';
import { Button } from '../components/Button';
import { Search, ShoppingBag, AlertCircle, BookOpen, Check, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Helper to calculate relevance score
const calculateRelevanceScore = (book: BookSearchResult, keyword: string): number => {
  const term = keyword.toLowerCase().trim();
  if (!term) return 0;
  
  const title = (book.name || '').toLowerCase();
  const author = (book.author || '').toLowerCase();
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

  // 4. Individual Word Overlap (Low Priority, handles partial matches)
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
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 12;
  
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [readerStats, setReaderStats] = useState<{
    card_type: string;
    max_books: number;
    current_active_books: number;
    remaining_slots: number;
  } | null>(null);
  
  const navigate = useNavigate();

  // Initial load
  useEffect(() => {
    executeSearch(1);
    fetchReaderStats();
  }, []);

  const fetchReaderStats = async () => {
    try {
      const res = await api.getCurrentlyBorrowed();
      if (res) {
        // Use values directly from backend
        setReaderStats({
          card_type: res.card_type || 'Standard',
          max_books: res.max_books || 5,
          current_active_books: res.total_borrowed || 0,
          remaining_slots: res.remaining_slots || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch reader stats', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const executeSearch = async (page: number) => {
    setLoading(true);
    setErrorMsg('');
    setHasSearched(true);
    
    try {
      const res = await api.searchBooks({
        keyword: keyword,
        page: page
      });
      
      let fetchedBooks = res.books || [];

      // Re-rank results based on relevance to keyword
      if (keyword.trim()) {
        fetchedBooks.sort((a, b) => {
          const scoreA = calculateRelevanceScore(a, keyword);
          const scoreB = calculateRelevanceScore(b, keyword);
          return scoreB - scoreA; // Descending order (Higher score first)
        });
      }
      
      setBooks(fetchedBooks);
      setTotalRecords(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / PAGE_SIZE));
      setCurrentPage(page);

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('Session expired')) {
        navigate('/login');
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg || 'Failed to load books.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      executeSearch(newPage);
    }
  };

  const getBookId = (book: BookSearchResult) => book.id || book.book_title_id || '';

  const toggleBookSelection = (bookId: string) => {
    if (!bookId) return;
    
    setSelectedBooks(prev => {
      if (prev.includes(bookId)) {
        // Deselecting - always allowed
        setWarningMsg('');
        return prev.filter(id => id !== bookId);
      } else {
        // Selecting - check limits
        if (readerStats) {
          // Number of books being selected in this request
          const booksToSelect = prev.length + 1;
          
          // Check: selected books must be <= remaining slots
          if (booksToSelect > readerStats.remaining_slots) {
            setWarningMsg(
              `Cannot select more books. You have ${readerStats.current_active_books} active books and can only borrow ${readerStats.remaining_slots} more (${booksToSelect} selected). Your ${readerStats.card_type} card limit is ${readerStats.max_books} books.`
            );
            setTimeout(() => setWarningMsg(''), 5000);
            return prev;
          }
        }
        setWarningMsg('');
        return [...prev, bookId];
      }
    });
  };
  
  const handleCreateRequest = async () => {
    if (selectedBooks.length === 0) return;
    
    // Double-check limit before submitting
    if (readerStats && selectedBooks.length > readerStats.remaining_slots) {
      setErrorMsg(
        `Cannot create request. You can only borrow ${readerStats.remaining_slots} more books (you have ${readerStats.current_active_books} active, max ${readerStats.max_books}).`
      );
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }
    
    try {
      setLoading(true);
      await api.createBorrowRequest(selectedBooks);
      setSuccessMsg('Borrow request created successfully!');
      setSelectedBooks([]);
      // Refresh reader stats after successful request
      await fetchReaderStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      if (err.message && err.message.includes('Session expired')) {
         navigate('/login');
      }
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Failed to create request');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Browse Collection Header & Search */}
      <div className="space-y-4">
         <h2 className="text-xl font-bold text-gray-900">Browse Collection</h2>
         <form onSubmit={handleSearchSubmit} className="w-full">
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  name="keyword"
                  placeholder="Search by title, author, or publisher..." 
                  value={keyword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base shadow-sm"
                />
              </div>
              <Button type="submit" isLoading={loading} className="min-w-[120px] rounded-lg bg-blue-800 hover:bg-blue-900">
                Search
              </Button>
            </div>
         </form>

         {/* Result Count Display */}
         {hasSearched && (
           <div className="flex items-center justify-between px-1">
              <span className="text-sm text-gray-600">
                Found <span className="font-bold text-gray-900">{totalRecords}</span> results
                {keyword && <span> matching "<span className="font-medium text-gray-900">{keyword}</span>"</span>}
              </span>
           </div>
         )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 flex items-center gap-2 animate-fade-in-up">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="break-words">{errorMsg}</span>
        </div>
      )}

      {warningMsg && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md border border-yellow-200 flex items-center gap-2 animate-fade-in-up">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="break-words">{warningMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 flex items-center gap-2 animate-fade-in-up">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reader Stats Info */}
      {readerStats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Account Type:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${readerStats.card_type === 'VIP' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                  {readerStats.card_type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Currently borrowed: <span className="font-bold text-gray-900">{readerStats.current_active_books}</span> / <span className="font-bold text-gray-900">{readerStats.max_books}</span> books
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
              <Layers className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-700">You can borrow: </span>
              <span className={`text-lg font-bold ${readerStats.remaining_slots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {readerStats.remaining_slots}
              </span>
              <span className="text-sm text-gray-600">more book{readerStats.remaining_slots !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart */}
      {selectedBooks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between sticky top-20 z-10 shadow-md animate-fade-in-up">
          <div className="flex items-center gap-2 text-primary font-medium">
            <ShoppingBag className="h-5 w-5" />
            <span>{selectedBooks.length} book(s) selected</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedBooks([]); setWarningMsg(''); }}>Clear</Button>
            <Button onClick={handleCreateRequest} isLoading={loading}>Create Borrow Request</Button>
          </div>
        </div>
      )}

      {/* Grid of Books - 12 books per page displayed in 4 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {books.length === 0 && !loading && (
           <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200 border-dashed">
             <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
             <p>No books found.</p>
           </div>
        )}

        {books.map((book) => {
          const bookId = getBookId(book);
          const isSelected = selectedBooks.includes(bookId);
          const isOutOfStock = typeof book.available_books === 'number' && book.available_books === 0;

          return (
            <div key={bookId} className={`bg-white p-6 rounded-lg border transition-all duration-200 hover:shadow-lg flex flex-col h-full ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-gray-200'} ${isOutOfStock ? 'opacity-75' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-md ${isOutOfStock ? 'bg-gray-100' : 'bg-blue-100'}`}>
                  <BookOpen className={`h-6 w-6 ${isOutOfStock ? 'text-gray-400' : 'text-primary'}`} />
                </div>
                {book.category && (
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {book.category}
                  </span>
                )}
              </div>

              <div className="flex-grow space-y-2 mb-4">
                <h3 className="font-bold text-lg text-gray-900 line-clamp-2 leading-snug" title={book.name}>{book.name}</h3>
                <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                  <span className="text-gray-400 font-normal">By:</span> {book.author}
                </p>
                <div className="pt-3 mt-1 border-t border-gray-50 flex flex-col gap-1">
                  <p className="text-xs text-gray-500 truncate" title={book.publisher}>
                    Publisher: {book.publisher}
                  </p>

                  {typeof book.available_books === 'number' && typeof book.total_books === 'number' && (
                    <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Total:</span>
                        <span className="text-xs font-semibold text-gray-700">{book.total_books} books</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Borrowed:</span>
                        <span className="text-xs font-semibold text-gray-700">{book.borrowed_books || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Available:</span>
                        <span className={`text-xs font-bold ${book.available_books > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {book.available_books > 0 ? `${book.available_books} left` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-2">
                <Button
                  variant={isSelected ? "secondary" : (isOutOfStock ? "ghost" : "outline")}
                  className={`w-full justify-center ${isOutOfStock ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed hover:bg-gray-100' : 'border-primary text-primary hover:bg-blue-50'}`}
                  onClick={() => toggleBookSelection(bookId)}
                  disabled={isOutOfStock}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4 mr-2" /> Selected
                    </>
                  ) : isOutOfStock ? (
                    "Out of Stock"
                  ) : (
                    "Select to Borrow"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {books.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6 mt-6">
          <div className="text-sm text-gray-600">
            Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};