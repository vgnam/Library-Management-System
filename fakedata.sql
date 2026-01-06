-- =============================================
-- Library Management System - Books Seed Data
-- PostgreSQL Script
-- =============================================

-- =============================================
-- 1. SEED PUBLISHERS
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '🌱 Seeding Publishers...';
END $$;

INSERT INTO publishers (pub_id, name, address) VALUES
('PUB001', 'Penguin Random House', '1745 Broadway, New York, NY 10019, USA'),
('PUB002', 'HarperCollins Publishers', '195 Broadway, New York, NY 10007, USA'),
('PUB003', 'Simon & Schuster', '1230 Avenue of the Americas, New York, NY 10020, USA'),
('PUB004', 'Macmillan Publishers', '120 Broadway, New York, NY 10271, USA'),
('PUB005', 'Hachette Book Group', '1290 Avenue of the Americas, New York, NY 10104, USA'),
('PUB006', 'Scholastic Corporation', '557 Broadway, New York, NY 10012, USA'),
('PUB007', 'Oxford University Press', 'Great Clarendon Street, Oxford, OX2 6DP, UK'),
('PUB008', 'Cambridge University Press', 'University Printing House, Cambridge CB2 8BS, UK'),
('PUB009', 'Wiley', '111 River Street, Hoboken, NJ 07030, USA'),
('PUB010', 'Springer Nature', 'Heidelberger Platz 3, 14197 Berlin, Germany')
ON CONFLICT (pub_id) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Created 10 publishers';
END $$;

-- =============================================
-- 2. SEED BOOK TITLES with ISBN
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '🌱 Seeding Book Titles...';
END $$;

INSERT INTO booktitles (book_title_id, name, total_quantity, available, category, author, publisher_id, isbn, price) VALUES
-- Fiction
('BT0001', 'To Kill a Mockingbird', 15, 15, 'Fiction', 'Harper Lee', 'PUB001', '9780061120084', 150000),
('BT0002', '1984', 20, 20, 'Fiction', 'George Orwell', 'PUB001', '9780451524935', 180000),
('BT0003', 'Pride and Prejudice', 12, 12, 'Fiction', 'Jane Austen', 'PUB002', '9780141439518', 200000),
('BT0004', 'The Great Gatsby', 18, 18, 'Fiction', 'F. Scott Fitzgerald', 'PUB003', '9780743273565', 175000),
('BT0005', 'The Catcher in the Rye', 14, 14, 'Fiction', 'J.D. Salinger', 'PUB002', '9780316769488', 165000),
('BT0006', 'The Hobbit', 16, 16, 'Fiction', 'J.R.R. Tolkien', 'PUB002', '9780547928227', 220000),
('BT0007', 'Animal Farm', 18, 18, 'Fiction', 'George Orwell', 'PUB001', '9780451526342', 140000),
('BT0008', 'Lord of the Flies', 14, 14, 'Fiction', 'William Golding', 'PUB001', '9780399501487', 160000),
('BT0009', 'Brave New World', 15, 15, 'Fiction', 'Aldous Huxley', 'PUB002', '9780060850524', 170000),
('BT0010', 'The Hunger Games', 22, 22, 'Fiction', 'Suzanne Collins', 'PUB006', '9780439023481', 190000),

-- Non-Fiction
('BT0011', 'Sapiens: A Brief History of Humankind', 25, 25, 'Non-Fiction', 'Yuval Noah Harari', 'PUB001', '9780062316097', 250000),
('BT0012', 'Educated', 20, 20, 'Non-Fiction', 'Tara Westover', 'PUB001', '9780399590504', 220000),
('BT0013', 'Thinking, Fast and Slow', 18, 18, 'Non-Fiction', 'Daniel Kahneman', 'PUB004', '9780374533557', 280000),
('BT0014', 'The Immortal Life of Henrietta Lacks', 15, 15, 'Non-Fiction', 'Rebecca Skloot', 'PUB002', '9781400052189', 240000),
('BT0015', 'Becoming', 22, 22, 'Non-Fiction', 'Michelle Obama', 'PUB001', '9781524763138', 300000),
('BT0016', 'The Wright Brothers', 14, 14, 'Non-Fiction', 'David McCullough', 'PUB003', '9781476728742', 260000),
('BT0017', 'Shoe Dog', 16, 16, 'Non-Fiction', 'Phil Knight', 'PUB003', '9781501135910', 240000),
('BT0018', 'Born a Crime', 18, 18, 'Non-Fiction', 'Trevor Noah', 'PUB003', '9780399588174', 230000),
('BT0019', 'The Glass Castle', 15, 15, 'Non-Fiction', 'Jeannette Walls', 'PUB003', '9780743247542', 210000),
('BT0020', 'Into the Wild', 17, 17, 'Non-Fiction', 'Jon Krakauer', 'PUB001', '9780385486804', 200000),

-- Science & Technology
('BT0021', 'A Brief History of Time', 16, 16, 'Science & Technology', 'Stephen Hawking', 'PUB005', '9780553380163', 220000),
('BT0022', 'The Selfish Gene', 14, 14, 'Science & Technology', 'Richard Dawkins', 'PUB007', '9780198788607', 260000),
('BT0023', 'Clean Code', 30, 30, 'Science & Technology', 'Robert C. Martin', 'PUB009', '9780132350884', 350000),
('BT0024', 'Introduction to Algorithms', 25, 25, 'Science & Technology', 'Thomas H. Cormen', 'PUB009', '9780262033848', 450000),
('BT0025', 'The Pragmatic Programmer', 28, 28, 'Science & Technology', 'Andrew Hunt', 'PUB009', '9780135957059', 380000),
('BT0026', 'You Don''t Know JS', 24, 24, 'Science & Technology', 'Kyle Simpson', 'PUB009', '9781491904244', 320000),
('BT0027', 'Design Patterns', 20, 20, 'Science & Technology', 'Erich Gamma', 'PUB009', '9780201633610', 400000),
('BT0028', 'The Phoenix Project', 18, 18, 'Science & Technology', 'Gene Kim', 'PUB009', '9781942788294', 290000),
('BT0029', 'Code Complete', 22, 22, 'Science & Technology', 'Steve McConnell', 'PUB009', '9780735619678', 420000),
('BT0030', 'Refactoring', 19, 19, 'Science & Technology', 'Martin Fowler', 'PUB009', '9780134757599', 380000),

-- Business & Economics
('BT0031', 'Good to Great', 20, 20, 'Business & Economics', 'Jim Collins', 'PUB002', '9780066620992', 280000),
('BT0032', 'The Lean Startup', 24, 24, 'Business & Economics', 'Eric Ries', 'PUB001', '9780307887894', 250000),
('BT0033', 'Zero to One', 18, 18, 'Business & Economics', 'Peter Thiel', 'PUB001', '9780804139298', 240000),
('BT0034', 'Principles', 22, 22, 'Business & Economics', 'Ray Dalio', 'PUB003', '9781501124020', 320000),
('BT0035', 'The Innovator''s Dilemma', 15, 15, 'Business & Economics', 'Clayton Christensen', 'PUB002', '9781633691780', 270000),
('BT0036', 'Start with Why', 19, 19, 'Business & Economics', 'Simon Sinek', 'PUB005', '9781591846444', 230000),
('BT0037', 'The Hard Thing About Hard Things', 17, 17, 'Business & Economics', 'Ben Horowitz', 'PUB002', '9780062273208', 260000),
('BT0038', 'Measure What Matters', 16, 16, 'Business & Economics', 'John Doerr', 'PUB005', '9780525536222', 250000),
('BT0039', 'Built to Last', 18, 18, 'Business & Economics', 'Jim Collins', 'PUB002', '9780060516406', 270000),
('BT0040', 'The Five Dysfunctions of a Team', 20, 20, 'Business & Economics', 'Patrick Lencioni', 'PUB005', '9780787960759', 220000),

-- Self-Help & Personal Development
('BT0041', 'How to Win Friends and Influence People', 25, 25, 'Self-Help', 'Dale Carnegie', 'PUB003', '9780671027032', 190000),
('BT0042', 'The 7 Habits of Highly Effective People', 28, 28, 'Self-Help', 'Stephen Covey', 'PUB003', '9781982137274', 240000),
('BT0043', 'Mindset: The New Psychology of Success', 20, 20, 'Self-Help', 'Carol S. Dweck', 'PUB005', '9780345472328', 220000),
('BT0044', 'Grit: The Power of Passion', 18, 18, 'Self-Help', 'Angela Duckworth', 'PUB003', '9781501111112', 230000),
('BT0045', 'The Subtle Art of Not Giving a F*ck', 24, 24, 'Self-Help', 'Mark Manson', 'PUB002', '9780062457714', 210000),
('BT0046', 'Atomic Habits', 30, 30, 'Self-Help', 'James Clear', 'PUB001', '9780735211292', 230000),
('BT0047', 'The Power of Now', 22, 22, 'Self-Help', 'Eckhart Tolle', 'PUB004', '9781577314806', 210000),
('BT0048', 'Man''s Search for Meaning', 20, 20, 'Self-Help', 'Viktor E. Frankl', 'PUB005', '9780807014295', 180000),
('BT0049', 'Daring Greatly', 17, 17, 'Self-Help', 'Brené Brown', 'PUB001', '9781592408412', 220000),
('BT0050', 'The Four Agreements', 19, 19, 'Self-Help', 'Don Miguel Ruiz', 'PUB004', '9781878424310', 190000)
ON CONFLICT (book_title_id) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Created 50 book titles with ISBNs';
END $$;

-- =============================================
-- 3. SEED BOOKS (Physical Copies)
-- =============================================
DO $$
DECLARE
    book_title_record RECORD;
    i INTEGER;
    book_counter INTEGER := 1;
    conditions TEXT[] := ARRAY['New', 'Good', 'Fair', 'Like New'];
    random_condition TEXT;
BEGIN
    RAISE NOTICE '🌱 Seeding Books (physical copies)...';
    
    FOR book_title_record IN 
        SELECT book_title_id, total_quantity 
        FROM booktitles 
        ORDER BY book_title_id
    LOOP
        FOR i IN 1..book_title_record.total_quantity LOOP
            -- Random condition
            random_condition := conditions[1 + floor(random() * 4)::int];
            
            INSERT INTO books (book_id, book_title_id, condition, being_borrowed)
            VALUES (
                'B' || LPAD(book_counter::TEXT, 6, '0'),
                book_title_record.book_title_id,
                random_condition,
                false
            )
            ON CONFLICT (book_id) DO NOTHING;
            
            book_counter := book_counter + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Created % physical books', book_counter - 1;
END $$;

-- =============================================
-- VERIFICATION
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

SELECT 'Publishers' AS "Table", COUNT(*) AS "Count" FROM publishers
UNION ALL
SELECT 'Book Titles', COUNT(*) FROM booktitles
UNION ALL
SELECT 'Physical Books', COUNT(*) FROM books;

-- Books by Category
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📚 Books by Category:';
END $$;

SELECT 
    category,
    COUNT(*) AS book_titles,
    SUM(total_quantity) AS total_copies
FROM booktitles
GROUP BY category
ORDER BY COUNT(*) DESC;

-- Sample books with ISBN
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📖 Sample Books with ISBN (first 10):';
END $$;

SELECT 
    book_title_id,
    name,
    author,
    category,
    isbn,
    price,
    total_quantity
FROM booktitles
ORDER BY book_title_id
LIMIT 10;

-- Test image URL
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🖼️ Test Image URLs:';
    RAISE NOTICE 'Example: https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg';
END $$;

SELECT 
    name,
    'https://covers.openlibrary.org/b/isbn/' || isbn || '-L.jpg' AS image_url
FROM booktitles
LIMIT 5;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Seed data completed successfully!';
    RAISE NOTICE 'ℹ️ All books are set to available (being_borrowed = false)';
    RAISE NOTICE 'ℹ️ You can now fetch book covers using ISBN from Open Library';
END $$;


