import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Publisher, BookItemForAcquisition, AcquisitionSlip } from '../types';
import { Button } from '../components/Button';

export const BookAcquisition: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // New book title form
  const [showNewBookForm, setShowNewBookForm] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState({
    name: '',
    author: '',
    category: '',
    publisher_id: ''
  });
  
  // Acquisition items
  const [acquisitionItems, setAcquisitionItems] = useState<BookItemForAcquisition[]>([]);
  const [currentItem, setCurrentItem] = useState({
    book_title_id: '',
    book_name: '',
    quantity: 1,
    price: 0
  });
  
  // History
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AcquisitionSlip[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search for existing book titles
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchPublishers();
  }, []);

  const fetchPublishers = async () => {
    try {
      const response = await api.getPublishers();
      setPublishers(response.data || []);
    } catch (err: any) {
      setError('Failed to load publishers: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSearchBooks = async () => {
    if (!searchKeyword.trim()) return;
    
    try {
      const response = await api.searchBooks({ keyword: searchKeyword, page: 1 });
      setSearchResults(response.books || []);
    } catch (err: any) {
      setError('Search failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const selectBookFromSearch = (book: any) => {
    setCurrentItem({
      ...currentItem,
      book_title_id: book.book_title_id,
      book_name: book.name
    });
    setSearchResults([]);
    setSearchKeyword('');
  };

  const handleCreateNewBookTitle = async () => {
    if (!newBookTitle.name || !newBookTitle.author || !newBookTitle.category || !newBookTitle.publisher_id) {
      setError('Please fill all book title fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.createBookTitle(newBookTitle);
      const bookTitleData = response.data;
      
      setSuccess(`Book title "${bookTitleData.name}" ${bookTitleData.exists ? 'already exists' : 'created successfully'}`);
      
      // Auto-fill current item
      setCurrentItem({
        ...currentItem,
        book_title_id: bookTitleData.book_title_id,
        book_name: bookTitleData.name
      });
      
      // Reset form
      setNewBookTitle({
        name: '',
        author: '',
        category: '',
        publisher_id: ''
      });
      setShowNewBookForm(false);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to create book title: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addItemToAcquisition = () => {
    if (!currentItem.book_title_id || currentItem.quantity < 1 || currentItem.price < 0) {
      setError('Please fill all required fields with valid values');
      return;
    }
    
    // Check if book already in list
    const existingIndex = acquisitionItems.findIndex(
      item => item.book_title_id === currentItem.book_title_id
    );
    
    if (existingIndex >= 0) {
      // Update existing item
      const updated = [...acquisitionItems];
      updated[existingIndex] = {
        book_title_id: currentItem.book_title_id,
        quantity: currentItem.quantity,
        price: currentItem.price
      };
      setAcquisitionItems(updated);
    } else {
      // Add new item
      setAcquisitionItems([
        ...acquisitionItems,
        {
          book_title_id: currentItem.book_title_id,
          quantity: currentItem.quantity,
          price: currentItem.price
        }
      ]);
    }
    
    // Reset current item
    setCurrentItem({
      book_title_id: '',
      book_name: '',
      quantity: 1,
      price: 0
    });
    setError('');
  };

  const removeItem = (bookTitleId: string) => {
    setAcquisitionItems(acquisitionItems.filter(item => item.book_title_id !== bookTitleId));
  };

  const handleSubmitAcquisition = async () => {
    if (acquisitionItems.length === 0) {
      setError('Please add at least one book to acquire');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.createAcquisitionSlip({ books: acquisitionItems });
      const result = response.data;
      
      setSuccess(
        `Acquisition slip created successfully! ` +
        `Total items: ${result.total_items}, ` +
        `Total amount: ${result.total_amount.toLocaleString()} VND`
      );
      
      // Reset form
      setAcquisitionItems([]);
      setCurrentItem({
        book_title_id: '',
        book_name: '',
        quantity: 1,
        price: 0
      });
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Failed to create acquisition slip: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await api.getAcquisitionHistory(page, 10);
      const data = response.data;
      
      setHistory(data.data || []);
      setCurrentPage(data.page);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      setError('Failed to load history: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = acquisitionItems.reduce(
    (sum, item) => sum + (item.quantity * item.price),
    0
  );
  const totalItems = acquisitionItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📦 Book Acquisition</h1>
        <Button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchHistory(1);
          }}
          variant="secondary"
        >
          {showHistory ? 'Create New Acquisition' : 'View History'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {!showHistory ? (
        <div className="space-y-6">
          {/* Search Existing Books */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Search Existing Books</h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border rounded px-3 py-2"
                placeholder="Search by title, author..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchBooks()}
              />
              <Button onClick={handleSearchBooks}>Search</Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-4 border rounded max-h-60 overflow-y-auto">
                {searchResults.map((book) => (
                  <div
                    key={book.book_title_id}
                    className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => selectBookFromSearch(book)}
                  >
                    <div className="font-semibold">{book.name}</div>
                    <div className="text-sm text-gray-600">
                      by {book.author} | {book.publisher} | Available: {book.available_books}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Book Title */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">➕ Create New Book Title</h2>
              <Button
                onClick={() => setShowNewBookForm(!showNewBookForm)}
                variant="secondary"
              >
                {showNewBookForm ? 'Cancel' : 'New Book'}
              </Button>
            </div>

            {showNewBookForm && (
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  className="border rounded px-3 py-2"
                  placeholder="Book Title *"
                  value={newBookTitle.name}
                  onChange={(e) => setNewBookTitle({ ...newBookTitle, name: e.target.value })}
                />
                <input
                  type="text"
                  className="border rounded px-3 py-2"
                  placeholder="Author *"
                  value={newBookTitle.author}
                  onChange={(e) => setNewBookTitle({ ...newBookTitle, author: e.target.value })}
                />
                <input
                  type="text"
                  className="border rounded px-3 py-2"
                  placeholder="Category *"
                  value={newBookTitle.category}
                  onChange={(e) => setNewBookTitle({ ...newBookTitle, category: e.target.value })}
                />
                <select
                  className="border rounded px-3 py-2"
                  value={newBookTitle.publisher_id}
                  onChange={(e) => setNewBookTitle({ ...newBookTitle, publisher_id: e.target.value })}
                >
                  <option value="">Select Publisher *</option>
                  {publishers.map((pub) => (
                    <option key={pub.pub_id} value={pub.pub_id}>
                      {pub.name}
                    </option>
                  ))}
                </select>
                <div className="col-span-2">
                  <Button onClick={handleCreateNewBookTitle} disabled={loading}>
                    Create Book Title
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Add Item to Acquisition */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📝 Add Item to Acquisition</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Selected Book</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 bg-gray-50"
                  placeholder="Search or create book first"
                  value={currentItem.book_name}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (VND) *</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  min="0"
                  value={currentItem.price}
                  onChange={(e) => setCurrentItem({ ...currentItem, price: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-4">
                <Button onClick={addItemToAcquisition} disabled={!currentItem.book_title_id}>
                  Add to List
                </Button>
              </div>
            </div>
          </div>

          {/* Acquisition List */}
          {acquisitionItems.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">📋 Acquisition List</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Book ID</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {acquisitionItems.map((item) => (
                      <tr key={item.book_title_id} className="border-b">
                        <td className="px-4 py-2">{item.book_title_id}</td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{item.price.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {(item.quantity * item.price).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => removeItem(item.book_title_id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-3">TOTAL</td>
                      <td className="px-4 py-3 text-right">{totalItems}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-lg">{totalAmount.toLocaleString()} VND</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Button onClick={handleSubmitAcquisition} disabled={loading}>
                  {loading ? 'Creating...' : 'Submit Acquisition Slip'}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // History View
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📜 Acquisition History</h2>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No acquisition records found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Acquisition ID</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Librarian</th>
                      <th className="px-4 py-2 text-right">Total Items</th>
                      <th className="px-4 py-2 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((slip) => (
                      <tr key={slip.acq_id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{slip.acq_id}</td>
                        <td className="px-4 py-3">
                          {new Date(slip.acc_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3">{slip.librarian_name}</td>
                        <td className="px-4 py-3 text-right">{slip.total_items}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {slip.total_amount.toLocaleString()} VND
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    onClick={() => fetchHistory(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => fetchHistory(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
