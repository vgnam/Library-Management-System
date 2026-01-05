import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Publisher } from '../types';
import { Button } from '../components/Button';
import Swal from 'sweetalert2';

export const BookManagement: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Search for existing book titles
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Edit book title
  const [editingBook, setEditingBook] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchPublishers();
    loadAllBooks();
  }, []);

  const loadAllBooks = async () => {
    setLoading(true);
    try {
      // Search with empty keyword to get all books, use large page_size to get everything
      const response = await api.searchBooks({ keyword: '', page: 1, page_size: 10000 });
      setSearchResults(response.books || []);
    } catch (err: any) {
      setError('Failed to load books: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchPublishers = async () => {
    try {
      const response = await api.getPublishers();
      setPublishers(response.data || []);
    } catch (err: any) {
      setError('Failed to load publishers: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSearchBooks = async () => {
    setLoading(true);
    try {
      // If keyword is empty, load all books, use large page_size
      const response = await api.searchBooks({ keyword: searchKeyword.trim(), page: 1, page_size: 10000 });
      setSearchResults(response.books || []);
    } catch (err: any) {
      setError('Search failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditBookTitle = async (book: any) => {
    // Load full book data and show edit form
    setEditingBook({
      book_title_id: book.book_title_id,
      name: book.name,
      author: book.author,
      isbn: book.isbn,
      category: book.category || '',
      publisher_id: book.publisher_id || ''
    });
    setShowEditForm(true);
    // Scroll to edit form
    setTimeout(() => {
      document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleUpdateBookTitle = async () => {
    if (!editingBook.name || !editingBook.author || !editingBook.isbn || !editingBook.category || !editingBook.publisher_id) {
      setError('Please fill all book title fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.updateBookTitle(editingBook.book_title_id, {
        name: editingBook.name,
        author: editingBook.author,
        isbn: editingBook.isbn,
        category: editingBook.category,
        publisher_id: editingBook.publisher_id
      });

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Book title updated successfully',
        timer: 2000,
        showConfirmButton: false
      });

      // Update search results
      setSearchResults(searchResults.map(b => 
        b.book_title_id === editingBook.book_title_id 
          ? { ...b, ...response.data } 
          : b
      ));

      // Close edit form
      setShowEditForm(false);
      setEditingBook(null);
    } catch (err: any) {
      setError('Failed to update book title: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBookTitle = async (bookTitleId: string, bookName: string) => {
    const result = await Swal.fire({
      title: 'Delete Book Title?',
      html: `Are you sure you want to delete <strong>${bookName}</strong>?<br><br><span style="color: #dc2626; font-size: 0.875rem;">This will delete all physical copies of this book. This action cannot be undone.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await api.deleteBookTitle(bookTitleId);
      
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: response.data.message || 'Book title deleted successfully',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Remove from search results
      setSearchResults(searchResults.filter(book => book.book_title_id !== bookTitleId));
      
      // Close edit form if this book was being edited
      if (editingBook?.book_title_id === bookTitleId) {
        setShowEditForm(false);
        setEditingBook(null);
      }
      
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: err.message || 'Failed to delete book title'
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Book Management</h1>
          <p className="text-gray-600 mt-1">Search, edit, and manage book titles in the database</p>
        </div>
        <Button
          onClick={() => navigate('/librarian/acquisition')}
          variant="secondary"
        >
          Add Books (Acquisition)
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

      <div className="space-y-6">
        {/* Search Books */}
        <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Search Book Titles</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Search for existing book titles in the database to view, edit, or delete.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border rounded px-3 py-2"
              placeholder="Search by title, author, ISBN..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchBooks()}
            />
            <Button onClick={handleSearchBooks}>Search</Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 border-2 border-blue-300 rounded max-h-96 overflow-y-auto">
              <div className="bg-blue-100 px-4 py-2 border-b-2 border-blue-300 sticky top-0">
                <p className="text-sm font-semibold text-blue-800">
                  Found {searchResults.length} book title(s)
                </p>
              </div>
              {searchResults.map((book) => (
                <div
                  key={book.book_title_id}
                  className={`p-4 border-b hover:bg-blue-50 transition ${
                    editingBook?.book_title_id === book.book_title_id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {editingBook?.book_title_id === book.book_title_id && (
                          <span className="text-blue-600 text-sm">Editing</span>
                        )}
                        <h3 className="font-semibold text-lg">{book.name}</h3>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        <p><strong>Author:</strong> {book.author}</p>
                        <p><strong>ISBN:</strong> {book.isbn}</p>
                        <p><strong>Publisher:</strong> {book.publisher}</p>
                        <p><strong>Category:</strong> {book.category}</p>
                        <p><strong>Stock:</strong> {book.available_books} available / {book.total_books} total</p>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        ID: {book.book_title_id}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleEditBookTitle(book)}
                        className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
                        title="Edit this book title"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBookTitle(book.book_title_id, book.name)}
                        className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
                        title="Delete this book title"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {searchKeyword && searchResults.length === 0 && (
            <div className="mt-4 text-center text-gray-500 py-8">
              No books found. Try a different search term.
            </div>
          )}
        </div>

        {/* Edit Book Title Form */}
        {showEditForm && editingBook && (
          <div id="edit-form" className="bg-white rounded-lg shadow p-6 border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Edit Book Title</h2>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
              <p className="text-sm text-orange-800">
                <strong>Editing:</strong> {editingBook.name} (ID: {editingBook.book_title_id})
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Book Title *</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="Book Title"
                  value={editingBook.name}
                  onChange={(e) => setEditingBook({ ...editingBook, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ISBN *</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="ISBN"
                  value={editingBook.isbn}
                  onChange={(e) => setEditingBook({ ...editingBook, isbn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Author *</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="Author"
                  value={editingBook.author}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2"
                  placeholder="Category *"
                  value={editingBook.category}
                  onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Publisher *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={editingBook.publisher_id}
                  onChange={(e) => setEditingBook({ ...editingBook, publisher_id: e.target.value })}
                >
                  <option value="">Select Publisher</option>
                  {publishers.map((pub) => (
                    <option key={pub.pub_id} value={pub.pub_id}>
                      {pub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex gap-2">
                <Button onClick={handleUpdateBookTitle} disabled={loading}>
                  {loading ? 'Updating...' : 'Update Book Title'}
                </Button>
                <Button 
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingBook(null);
                  }} 
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
