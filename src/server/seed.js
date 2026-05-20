const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) return console.error(err.message);
});

db.serialize(() => {
    // Insert more artworks
    db.run(`INSERT INTO Artworks (title, artist, price, category, image, description, is_campaign) VALUES
        ('Cosmic Bloom', 'Alex D.', 1500, 'Digital', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80', 'A colorful display of cosmic flowers.', 1),
        ('Monochrome Reality', 'Sarah L.', 700, 'Photography', 'https://images.unsplash.com/photo-1715481082153-dc97ed9b1559?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'Raw essence of street life.', 0),
        ('Oil on Ocean', 'Michael T.', 950, 'Painting', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', 'Textured canvas depicting rough seas.', 1),
        ('Cyberpunk City', 'Elena R.', 2500, 'Digital', 'https://images.unsplash.com/photo-1563863251222-11d3e3bd3b62?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'Neon streets in a dystopian future.', 0)
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