import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, AlertCircle, BookOpen, 
  ChevronLeft, ChevronRight, Layers, LogIn, UserPlus
} from 'lucide-react';

import { api } from '../services/api';
import { BookSearchResult } from '../types';
import { Button } from '../components/Button';

export const PublicBookBrowse: React.FC = () => {
  const navigate = useNavigate();
  
  // States
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const PAGE_SIZE = 12;

  // Effects
  useEffect(() => {
    executeSearch(1);
  }, []);

  const executeSearch = async (page: number) => {
    setLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    try {
      const res = await api.publicBrowseBooks({ 
        keyword: keyword, 
        page: page
      });
      const fetchedBooks = res.books || [];

      setBooks(fetchedBooks);
      setTotalRecords(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / PAGE_SIZE));
      setCurrentPage(page);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load books.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      executeSearch(newPage);
    }
  };

  const getBookId = (book: BookSearchResult) => book.id || book.book_title_id || '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Hero Section & Search */}
      <header className="relative bg-slate-900 py-24 px-4">
        <div className="absolute inset-0 opacity-30">
          <img 
            src="https://thuvienquocgia.vn/wp-content/uploads/2018/10/5-dieu-ban-doc-can-biet-ve-thu-vien-quoc-gia-viet-nam-1-3.jpg" 
            alt="Library Background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase">
            National Library 
          </h1>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Explore our extensive collection of books. Login to borrow your favorites.
          </p>

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

      {/* Login Prompt Cards */}
      <section className="max-w-7xl mx-auto w-full px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-center gap-5 md:border-r border-gray-100">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><BookOpen className="w-8 h-8" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Browse Books</p>
              <p className="text-lg font-black text-gray-900">Explore our collection freely</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-green-50 rounded-2xl text-green-600"><LogIn className="w-8 h-8" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Want to Borrow?</p>
                <p className="text-lg font-black text-gray-900">Login or Register</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/login')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold">
                <LogIn className="w-4 h-4 mr-2" /> Login
              </Button>
              <Button onClick={() => navigate('/register')} variant="secondary" className="border-2 border-gray-200 hover:border-blue-600 px-6 py-3 rounded-xl font-bold">
                <UserPlus className="w-4 h-4 mr-2" /> Register
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-12">
        {/* Alerts */}
        {errorMsg && (
          <div className="mb-10 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="text-red-600 shrink-0" />
            <p className="text-red-800 font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Results Info */}
        {hasSearched && (
          <div className="flex items-center gap-2 text-gray-500 mb-8 font-medium">
            <Layers className="w-5 h-5" />
            <span>
              Found <span className="text-gray-900 font-bold">{totalRecords}</span> titles
            </span>
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
            const isOutOfStock = book.available_books === 0;

            return (
              <div key={bookId} className="group flex flex-col bg-white rounded-3xl transition-all duration-500 border-2 border-transparent shadow-sm hover:shadow-2xl hover:-translate-y-3 overflow-hidden">
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
                </div>

                {/* Content */}
                <div className="p-7 flex flex-col flex-grow">
                  <h3 className="font-black text-slate-900 text-lg leading-tight mb-2 line-clamp-2 h-14 group-hover:text-blue-600 transition-colors" title={book.name}>
                    {book.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-6 font-medium">by <span className="text-slate-700 not-italic font-bold">{book.author}</span></p>
                  
                  <div className="mt-auto space-y-5">
                    <div className="flex justify-end items-center py-3 border-y border-slate-50">
                      <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase">ISBN: {book.isbn}</span>
                    </div>

                    <Button
                      onClick={() => navigate('/login')}
                      className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-200"
                    >
                      Login to Borrow
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
    </div>
  );
};
