import React from 'react';
import { 
  BookOpen, Clock, AlertCircle, Ban, CheckCircle, 
  Info, Shield, XCircle
} from 'lucide-react';

export const LibraryPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Library Policies</h1>
        <p className="text-gray-600">Please read these policies carefully before using our services</p>
      </div>

      <div className="space-y-6">
        {/* Membership */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Membership</h2>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Requirements:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• Must be at least 18 years old</li>
              <li>• Valid ID card or passport required</li>
              <li>• Provide email and phone number</li>
              <li>• Free membership, valid for 1 year</li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium">Standard</span>
              </div>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Borrow up to 5 books</li>
                <li>• Loan period: 45 days</li>
                <li>• Free</li>
              </ul>
            </div>
            
            <div className="border border-amber-300 rounded-lg p-4 bg-amber-50">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-amber-500 text-white px-3 py-1 rounded text-sm font-medium">VIP</span>
              </div>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Borrow up to 8 books</li>
                <li>• Loan period: 60 days</li>
                <li>• Priority reservations</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Borrowing */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Borrowing Rules</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Borrowing limits:</h3>
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                <p><strong>Standard card:</strong> 5 books for 45 days</p>
                <p><strong>VIP card:</strong> 8 books for 60 days</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Important notes:</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Reference books cannot be borrowed</li>
                <li>• E-books are online access only</li>
                <li className="text-red-600 font-medium">• Members with overdue books cannot borrow more until all items are returned</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Returns */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Returns & Renewals</h2>
          
          <ul className="space-y-2 text-gray-700">
            <li>• Return books on or before the due date</li>
            <li>• Returns accepted during library hours at the desk</li>
            <li>• Book drop boxes available for after-hours</li>
            <li>• Renewal requests must be made 2 days before due date</li>
          </ul>
        </section>

        {/* Penalties */}
        <section className="bg-white rounded-lg border border-red-300 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Penalties</h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-900 mb-3">Late returns:</h3>
            <ul className="space-y-2 text-gray-800">
              <li>• <strong>5 days overdue = 1 penalty point</strong></li>
              <li>• <strong>3 penalty points = Account blocked</strong></li>
              <li>• <strong>30+ days overdue = Immediate block</strong></li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              Note: You cannot borrow books while you have overdue items.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Lost or damaged books:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• Lost: Full replacement cost + 50,000 VND fee</li>
              <li>• Minor damage: 20% of book value</li>
              <li>• Major damage: 50-100% of book value</li>
              <li>• You can replace with an identical copy</li>
            </ul>
          </div>
        </section>

        {/* Prohibited */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Prohibited Activities</h2>
          
          <ul className="space-y-2 text-gray-700">
            <li>• Writing or marking in books</li>
            <li>• Damaging or tearing pages</li>
            <li>• Lending borrowed books to others</li>
            <li>• Using another member's card</li>
            <li>• Food and drinks in reading areas (water in sealed bottles OK)</li>
            <li>• Loud conversations in quiet zones</li>
          </ul>
        </section>

        {/* Account Suspension */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Account Suspension</h2>
          
          <div className="mb-4">
            <p className="font-medium text-red-700 mb-3">Your account will be blocked if:</p>
            <ul className="space-y-2 text-gray-700">
              <li>• You accumulate 3 penalty points</li>
              <li>• Books are 30+ days overdue</li>
              <li>• You provide false information</li>
              <li>• Repeated policy violations</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-4">
            <p className="font-medium text-gray-900 mb-2">To reinstate your account:</p>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>1. Return all overdue books</li>
              <li>2. Pay all fines or replace lost books</li>
              <li>3. Wait for librarian approval</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-300 rounded p-4">
            <p className="font-medium text-gray-900 mb-2">About penalty points:</p>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Penalty points are permanent</li>
              <li>• Points reset to 0 only when account is reinstated</li>
              <li>• After reinstatement, if you get 3 points again, account blocks again</li>
            </ul>
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Privacy & Rights</h2>
          
          <ul className="space-y-2 text-gray-700">
            <li>• Your personal info and history are confidential</li>
            <li>• You can update your contact info anytime</li>
            <li>• You can request your borrowing history</li>
            <li>• You can cancel membership after settling obligations</li>
            <li>• You can appeal any fines you think are unfair</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Questions?</h2>
          <p className="text-gray-700 mb-3">
            Contact us if you need help or have questions:
          </p>
          <div className="space-y-1 text-gray-700">
            <p>Email: support@national_library.vn</p>
            <p>Phone: (028) 1234 5678</p>
            <p>Hours: Mon-Fri, 8:00 AM - 8:00 PM</p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>Last updated: January 6, 2026</p>
        </div>
      </div>
    </div>
  );
};