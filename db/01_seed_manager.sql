-- =====================================================
-- Sample Data Seed for Library Management System
-- =====================================================

-- Manager Account
INSERT INTO users (
    user_id,
    username,
    password,
    full_name,
    email,
    phone_number,
    role
)
VALUES (
    'manager-001',
    'admin_manager',
    '$2b$12$qhdFFM6KPvYeC9/FQcD07ONtzjgpREdLys43Ou3euu19SIHTbxz/m', --password123
    'System Administrator',
    'admin@library.com',
    '0901234567',
    'manager'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO managers (
    manager_id,
    user_id,
    access_level
)
VALUES (
    'MGR-001',
    'manager-001',
    1
)
ON CONFLICT (manager_id) DO NOTHING;

-- Publishers
INSERT INTO publishers (
    pub_id,
    name,
    address
)
VALUES
    ('PUB-001', 'O''Reilly Media', '1005 Gravenstein Highway North, Sebastopol, CA'),
    ('PUB-002', 'MIT Press', '1 Rogers Street, Cambridge, MA'),
    ('PUB-003', 'Pearson Education', '221 River Street, Hoboken, NJ'),
    ('PUB-004', 'Kim Dong Publishing', '55 Quang Trung, Hanoi, Vietnam'),
    ('PUB-005', 'Nha Xuat Ban Tre', '161B Ly Chinh Thang, District 3, HCMC')
ON CONFLICT (pub_id) DO NOTHING;

-- Book Titles (booktitles table)
INSERT INTO booktitles (
    book_title_id,
    name,                  --
    total_quantity,        --
    available,             --
    category,
    author,
    publisher_id,
    isbn,
    price
)
VALUES
    ('BT-0001', 'Introduction to Algorithms', 3, 3, 'Computer Science', 'Thomas H. Cormen', 'PUB-002', '9780262033848', 150000),
    ('BT-0002', 'Database System Concepts', 2, 2, 'Computer Science', 'Abraham Silberschatz', 'PUB-003', '9780073523323', 120000),
    ('BT-0003', 'Learning Python', 4, 4, 'Programming', 'Mark Lutz', 'PUB-001', '9781449355739', 110000),
    ('BT-0004', 'Clean Code', 2, 2, 'Software Engineering', 'Robert C. Martin', 'PUB-003', '9780132350884', 130000),
    ('BT-0005', 'Design Patterns', 3, 3, 'Software Engineering', 'Erich Gamma', 'PUB-001', '9780201633610', 140000),
    ('BT-0006', 'Sapiens: A Brief History of Humankind', 3, 3, 'History', 'Yuval Noah Harari', 'PUB-004', '9780062316097', 95000),
    ('BT-0007', 'The Lean Startup', 2, 2, 'Business', 'Eric Ries', 'PUB-001', '9780307887894', 105000),
    ('BT-0008', 'Thinking, Fast and Slow', 2, 2, 'Psychology', 'Daniel Kahneman', 'PUB-003', '9780374533557', 115000)
ON CONFLICT (book_title_id) DO NOTHING;

-- Physical Books (books table)
INSERT INTO books (
    book_id,
    book_title_id,
    condition,
    being_borrowed
)
VALUES
    -- Introduction to Algorithms (3 copies)
    ('B-100001', 'BT-0001', 'good', false),
    ('B-100002', 'BT-0001', 'good', false),
    ('B-100003', 'BT-0001', 'good', false),
    
    -- Database System Concepts (2 copies)
    ('B-100004', 'BT-0002', 'good', false),
    ('B-100005', 'BT-0002', 'good', false),
    
    -- Learning Python (4 copies)
    ('B-100006', 'BT-0003', 'good', false),
    ('B-100007', 'BT-0003', 'good', false),
    ('B-100008', 'BT-0003', 'good', false),
    ('B-100009', 'BT-0003', 'good', false),
    
    -- Clean Code (2 copies)
    ('B-100010', 'BT-0004', 'good', false),
    ('B-100011', 'BT-0004', 'good', false),
    
    -- Design Patterns (3 copies)
    ('B-100012', 'BT-0005', 'good', false),
    ('B-100013', 'BT-0005', 'good', false),
    ('B-100014', 'BT-0005', 'good', false),
    
    -- Sapiens (3 copies)
    ('B-100015', 'BT-0006', 'good', false),
    ('B-100016', 'BT-0006', 'good', false),
    ('B-100017', 'BT-0006', 'good', false),
    
    -- The Lean Startup (2 copies)
    ('B-100018', 'BT-0007', 'good', false),
    ('B-100019', 'BT-0007', 'good', false),
    
    -- Thinking, Fast and Slow (2 copies)
    ('B-100020', 'BT-0008', 'good', false),
    ('B-100021', 'BT-0008', 'good', false)
ON CONFLICT (book_id) DO NOTHING;
