import React from 'react';
import { 
  BookOpen, Clock, AlertCircle, Ban, DollarSign, 
  CheckCircle, FileText, Shield, Users, Info
} from 'lucide-react';

export const LibraryPolicy: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 mb-8 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 p-3 rounded-lg">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Library Policies & Regulations</h1>
            <p className="text-blue-100 mt-2">National Library - Guidelines for Members</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Membership */}
        <section className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">1. Membership Requirements</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Must be at least 18 years old with a valid ID card or passport</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Complete the online registration form with accurate personal information</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Provide a valid email address and phone number for notifications</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Membership is free and valid for 1 year from the date of registration</span>
                </li>
              </ul>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">STANDARD</span>
                    Standard Card
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Borrow up to <strong>5 books</strong></li>
                    <li>• Loan period: <strong>45 days</strong></li>
                    <li>• Free membership</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 p-4 rounded-lg">
                  <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-1 rounded text-xs">VIP</span>
                    VIP Card
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Borrow up to <strong>8 books</strong></li>
                    <li>• Loan period: <strong>60 days</strong></li>
                    <li>• Priority reservations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Borrowing Rules */}
        <section className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">2. Borrowing Policies</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Borrowing Limits by Card Type</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">STANDARD</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Standard Card Holders</p>
                        <p className="text-sm text-gray-700 mt-1">Maximum <strong>5 books</strong> for <strong>45 days</strong> per loan</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 rounded">
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">VIP</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">VIP Card Holders</p>
                        <p className="text-sm text-gray-700 mt-1">Maximum <strong>8 books</strong> for <strong>60 days</strong> per loan</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">General Rules</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Reference books and rare collections cannot be borrowed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>E-books and digital resources available for online access only</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span className="text-red-700 font-semibold">Members with overdue books cannot borrow additional books until all items are returned</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Return Policies */}
        <section className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-600">
          <div className="flex items-start gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">3. Return & Renewal</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Books must be returned on or before the due date to avoid penalties</span>
                </li>
                <li className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Returns can be made during library hours at the circulation desk</span>
                </li>
                <li className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Online return requests can be submitted through your account</span>
                </li>
                <li className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Book drop boxes are available for after-hours returns</span>
                </li>
                <li className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Renewal requests must be made at least 2 days before the due date</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Penalties */}
        <section className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. Fines & Penalties</h2>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-3">Late Return Penalty System</h3>
                  <div className="bg-white p-4 rounded border-l-4 border-red-500 mb-3">
                    <p className="text-gray-800 font-semibold mb-2">Important Policy:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span><strong>Overdue by 5 days</strong> = <strong className="text-red-600">1 penalty point</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span><strong>Accumulated 3 penalty points</strong> = <strong className="text-red-600">Account BLOCKED</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span><strong>Overdue by 30 days</strong> = <strong className="text-red-600">Immediate BLOCK</strong></span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600 italic">Note: Members with overdue books are not allowed to borrow any additional books until all overdue items are returned.</p>
                </div>

                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-3">Lost or Damaged Books</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span>Lost books: Full replacement cost + 50,000 VND processing fee</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span>Minor damage: 20% of book value</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span>Major damage: 50-100% of book value depending on severity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span>Members may replace lost books with identical copies (same edition)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prohibited Activities */}
        <section className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-600">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Ban className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">5. Prohibited Activities</h2>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Writing, marking, or highlighting in library books</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Tearing pages or damaging book covers</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Lending borrowed books to other individuals</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Using another member's card or account</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Food and beverages in reading areas (except water in sealed bottles)</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Loud conversations or disruptive behavior in quiet zones</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Suspension */}
        <section className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-600">
          <div className="flex items-start gap-4">
            <div className="bg-gray-100 p-3 rounded-lg">
              <AlertCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">6. Account Suspension Policy</h2>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-4">
                <p className="text-red-800 font-bold text-lg mb-2">Your account will be BLOCKED if:</p>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-red-600 font-bold text-xl">•</span>
                  <span className="flex-1">
                    <strong className="text-red-700">Accumulated 3 penalty points</strong>
                    <span className="block text-sm text-gray-600 mt-1">Each 5-day overdue period = 1 penalty point</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 font-bold text-xl">•</span>
                  <span className="flex-1">
                    <strong className="text-red-700">Books are overdue by 30 days or more</strong>
                    <span className="block text-sm text-gray-600 mt-1">Immediate suspension regardless of penalty points</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 font-bold text-xl">•</span>
                  <span>Providing false information during registration</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 font-bold text-xl">•</span>
                  <span>Damaging or losing multiple books</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 font-bold text-xl">•</span>
                  <span>Repeated violations of library policies</span>
                </li>
              </ul>
              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong className="text-yellow-800">To reinstate a blocked account:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  <li>• Return all overdue books</li>
                  <li>• Pay all outstanding fines or replace lost/damaged books</li>
                  <li>• Wait for librarian approval</li>
                </ul>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong className="text-blue-800">Penalty Points Reset Conditions:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  <li>• Penalty points are <strong>permanent</strong> and do not automatically reset</li>
                  <li>• Points only reset after account is blocked and then reinstated by librarian</li>
                  <li>• Upon reinstatement, penalty points reset to 0 and you get a fresh start</li>
                  <li>• If you accumulate 3 points again after reinstatement, account will be blocked again</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy & Rights */}
        <section className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-600">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">7. Privacy & Member Rights</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>Your personal information and borrowing history are kept confidential</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>You have the right to update your contact information at any time</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>You can request a copy of your borrowing history</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>You may cancel your membership after settling all outstanding obligations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>You have the right to appeal any fines or penalties you believe are unfair</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg shadow-md p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Questions or Concerns?</h2>
          <p className="mb-4 text-slate-200">
            If you have any questions about our policies or need clarification on any rules, please don't hesitate to contact us:
          </p>
          <div className="space-y-2 text-slate-200">
            <p>Email: <a href="mailto:support@national_library.vn" className="underline hover:text-white">support@national_library.vn</a></p>
            <p>Phone: (028) 1234 5678</p>
            <p>Hours: Monday - Friday, 8:00 AM - 8:00 PM</p>
          </div>
        </section>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Last updated: January 6, 2026</p>
          <p className="mt-1">These policies are subject to change. Members will be notified of any updates.</p>
        </div>
      </div>
    </div>
  );
};
