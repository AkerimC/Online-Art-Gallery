const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) return console.error(err.message);
});

db.serialize(() => {
    // Insert more artworks
    db.run(`INSERT INTO Artworks (title, artist, price, category, image, description) VALUES
        ('Cosmic Bloom', 'Alex D.', 1500, 'Digital', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80', 'A colorful display of cosmic flowers.'),
        ('Monochrome Reality', 'Sarah L.', 700, 'Photography', 'https://images.unsplash.com/photo-1542456073-952de36315c1?auto=format&fit=crop&w=600&q=80', 'Raw essence of street life.'),
        ('Oil on Ocean', 'Michael T.', 950, 'Painting', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', 'Textured canvas depicting rough seas.'),
        ('Cyberpunk City', 'Elena R.', 2500, 'Digital', 'https://images.unsplash.com/photo-1515238152791-8216bf248af0?auto=format&fit=crop&w=600&q=80', 'Neon streets in a dystopian future.')
    `);

    // Insert more workshops
    db.run(`INSERT INTO Workshops (title, date, time, price, capacity, booked, instructor, description) VALUES
        ('Advanced Oil Painting', '2026-06-01', '13:00', 180, 10, 2, 'Michael T.', 'Deep dive into oil textures.'),
        ('Street Photography', '2026-06-12', '09:00', 90, 25, 10, 'Sarah L.', 'Capture candid moments in the city.'),
        ('3D Modeling for Beginners', '2026-06-20', '15:00', 200, 15, 0, 'Alex D.', 'Learn Blender basics.')
    `);
});

db.close(() => {
    console.log("Database seeded successfully with new items.");
});