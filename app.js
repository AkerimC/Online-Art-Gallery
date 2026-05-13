const API_URL = 'http://localhost:3000/api';

// ==== GLOBAL STATE ====
const State = {
    currentUser: null, 
    artworks: [],
    workshops: [],
    favorites: [],
    cart: [],
    reservations: [],
    orders: [],
    compareList: [], 
    compareMode: false,
    currentView: 'home'
};

async function loadData() {
    try {
        const artRes = await fetch(`${API_URL}/artworks`);
        State.artworks = await artRes.json();
        
        const wsRes = await fetch(`${API_URL}/workshops`);
        State.workshops = await wsRes.json();
    } catch(err) {
        showToast('Error connecting to database. Make sure server is running.', 'error');
    }
}

// ==== ROUTING & RENDER ENGINE ====
async function navigate(view) {
    State.currentView = view;
    const main = document.getElementById('app-content');
    
    // Clear Compare Mode when navigating
    State.compareMode = false;
    State.compareList = [];

    if(State.artworks.length === 0) await loadData();

    switch(view) {
        case 'home':
            const categories = [...new Set(State.artworks.map(a => a.category))].filter(Boolean);
            main.innerHTML = `
                <div class="page-header">
                    <h2>Explore the Collection</h2>
                    <p class="text-muted">Curated artworks from visionary creators</p>
                    <div style="margin-top: 1rem; display:flex; gap:1rem; justify-content:center; align-items:center;">
                        <select id="category-filter" onchange="renderArtworks()" style="padding:0.6rem 1rem; background:var(--glass-bg); color:#fff; border:1px solid var(--glass-border); border-radius:8px; cursor:pointer;">
                            <option value="all">All Categories</option>
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                        <button class="btn-secondary" onclick="toggleCompareMode('artwork')">Compare Artworks</button>
                    </div>
                </div>
                <div id="compare-action-bar" style="display:none;" class="floating-action">
                    <span style="display:flex;align-items:center;">Select items to compare</span>
                    <button class="btn-primary" onclick="showComparison()">Compare Selected</button>
                </div>
                <div class="grid-container" id="artworks-grid"></div>
            `;
            renderArtworks();
            break;
        case 'events':
            const instructors = [...new Set(State.workshops.map(w => w.instructor))].filter(Boolean);
            main.innerHTML = `
                <div class="page-header">
                    <h2>Workshops & Events</h2>
                    <p class="text-muted">Learn from the masters themselves.</p>
                    <div style="margin-top: 1rem; display:flex; gap:1rem; justify-content:center; align-items:center;">
                        <select id="instructor-filter" onchange="renderWorkshops()" style="padding:0.6rem 1rem; background:var(--glass-bg); color:#fff; border:1px solid var(--glass-border); border-radius:8px; cursor:pointer;">
                            <option value="all">All Instructors</option>
                            ${instructors.map(i => `<option value="${i}">${i}</option>`).join('')}
                        </select>
                        <button class="btn-secondary" onclick="toggleCompareMode('workshop')">Compare Workshops</button>
                    </div>
                </div>
                <div id="compare-action-bar" style="display:none;" class="floating-action">
                    <span style="display:flex;align-items:center;">Select items to compare</span>
                    <button class="btn-primary" onclick="showComparison()">Compare Selected</button>
                </div>
                <div class="grid-container" id="events-grid"></div>
            `;
            renderWorkshops();
            break;
        case 'favorites':
            if (!State.currentUser) return showToast('Please login to view favorites', 'error');
            main.innerHTML = `
                <div class="page-header"><h2>Your Favorites</h2></div>
                <div class="grid-container" id="favorites-grid"></div>
            `;
            renderFavorites();
            break;
        case 'cart':
            renderCart();
            break;
        case 'profile':
            renderProfile();
            break;
        case 'admin':
            if(!State.currentUser || State.currentUser.role !== 'admin') return showToast('Unauthorized', 'error');
            renderAdminDashboard();
            break;
    }
    updateNavUI();
    lucide.createIcons();
}

// ==== RENDERERS ====
function renderArtworks() {
    const grid = document.getElementById('artworks-grid');
    const filterEl = document.getElementById('category-filter');
    const filterVal = filterEl ? filterEl.value : 'all';
    
    const filteredArts = filterVal === 'all' ? State.artworks : State.artworks.filter(a => a.category === filterVal);
    
    if(filteredArts.length === 0) {
        grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align:center;">No artworks found in this category.</p>';
        return;
    }

    grid.innerHTML = filteredArts.map(art => `
        <div class="glass-card" style="position:relative;">
            ${State.compareMode ? `<input type="checkbox" class="compare-checkbox" onchange="toggleCompareItem('artwork', ${art.id})" ${State.compareList.find(c => c.item.id === art.id) ? 'checked':''}>` : ''}
            <img src="${art.image}" alt="${art.title}">
            <div class="card-body">
                <h3 class="card-title">${art.title}</h3>
                <p class="card-artist">By ${art.artist} | ${art.category}</p>
                <div class="card-footer">
                    <span class="price">$${art.price}</span>
                    <div style="display:flex;gap:0.5rem;">
                        <button class="icon-btn" onclick="toggleFavorite(${art.id})" style="color: ${State.favorites.includes(art.id) ? 'var(--accent)' : ''}">
                            <i data-lucide="heart"></i>
                        </button>
                        <button class="btn-primary" onclick="showArtworkDetails(${art.id})">Details</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderWorkshops() {
    const grid = document.getElementById('events-grid');
    const filterEl = document.getElementById('instructor-filter');
    const filterVal = filterEl ? filterEl.value : 'all';
    
    const filteredWs = filterVal === 'all' ? State.workshops : State.workshops.filter(w => w.instructor === filterVal);
    
    if(filteredWs.length === 0) {
        grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align:center;">No workshops found for this instructor.</p>';
        return;
    }

    grid.innerHTML = filteredWs.map(ws => `
        <div class="glass-card" style="position:relative;">
            ${State.compareMode ? `<input type="checkbox" class="compare-checkbox" onchange="toggleCompareItem('workshop', ${ws.id})" ${State.compareList.find(c => c.item.id === ws.id) ? 'checked':''}>` : ''}
            <div class="card-body">
                <h3 class="card-title">${ws.title}</h3>
                <p class="card-artist">Instructor: ${ws.instructor}</p>
                <p class="text-muted" style="margin-bottom:0.5rem;"><i data-lucide="calendar" style="width:16px;height:16px;"></i> ${ws.date} | ${ws.time}</p>
                <div class="card-footer">
                    <span class="price">$${ws.price}</span>
                    <button class="btn-primary" onclick="showWorkshopDetails(${ws.id})">Book Now</button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    const favArts = State.artworks.filter(a => State.favorites.includes(a.id));
    if(favArts.length === 0) return grid.innerHTML = '<p>No favorites yet.</p>';
    
    grid.innerHTML = favArts.map(art => `
        <div class="glass-card">
            <img src="${art.image}" alt="${art.title}">
            <div class="card-body">
                <h3 class="card-title">${art.title}</h3>
                <div class="card-footer">
                    <button class="btn-primary" onclick="showArtworkDetails(${art.id})">Details</button>
                    <button class="btn-secondary" onclick="toggleFavorite(${art.id}); renderFavorites();">Remove</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCart() {
    const main = document.getElementById('app-content');
    if (!State.currentUser) return showToast('Please login first', 'error');
    
    const cartTotal = State.cart.reduce((sum, item) => sum + item.price, 0);

    main.innerHTML = `
        <div class="page-header"><h2>Shopping Cart</h2></div>
        <div style="max-width: 800px; margin: 0 auto; background: var(--glass-bg); padding: 2rem; border-radius: 12px; border: 1px solid var(--glass-border);">
            ${State.cart.length === 0 ? '<p>Your cart is empty.</p>' : `
                <ul style="list-style:none;">
                    ${State.cart.map((item, idx) => `
                        <li style="display:flex; justify-content:space-between; margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">
                            <div>
                                <h4>${item.title}</h4>
                                <span class="text-muted">${item.type}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:1rem;">
                                <span class="price">$${item.price}</span>
                                <button class="icon-btn" onclick="removeFromCart(${idx})"><i data-lucide="trash-2"></i></button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
                <div class="form-group" style="margin-top: 2rem;">
                    <label>Discount Coupon</label>
                    <div style="display:flex; gap:1rem;">
                        <input type="text" placeholder="Enter code">
                        <button class="btn-secondary" onclick="showToast('Invalid Coupon', 'error')">Apply</button>
                    </div>
                </div>
                <div style="margin-top: 1rem; text-align:right;">
                    <h3>Total: <span class="text-accent">$${cartTotal}</span></h3>
                    <button class="btn-primary" style="margin-top: 1rem;" onclick="checkout()">Checkout & Pay</button>
                </div>
            `}
        </div>
    `;
    lucide.createIcons();
}

function renderProfile() {
    const main = document.getElementById('app-content');
    if (!State.currentUser) {
        // Show Login / Register
        main.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap: 2rem; max-width: 900px; margin: 4rem auto;">
                
                <!-- LOGIN -->
                <div style="flex:1; background: var(--glass-bg); padding: 2rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                    <h2 style="margin-bottom:1.5rem; text-align:center;">Login</h2>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="login-email" value="admin@aura.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="login-password" value="admin123">
                    </div>
                    <button class="btn-primary" style="width:100%" onclick="login()">Login</button>
                </div>

                <!-- REGISTER -->
                <div style="flex:1; background: var(--glass-bg); padding: 2rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                    <h2 style="margin-bottom:1.5rem; text-align:center;">Register</h2>
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="reg-name" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="reg-email" placeholder="user@aura.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="reg-password" placeholder="Password">
                    </div>
                    <button class="btn-secondary" style="width:100%" onclick="register()">Create Account</button>
                </div>
            </div>
        `;
    } else {
        // Show Profile & Reservations Tracking
        main.innerHTML = `
            <div class="page-header"><h2>My Profile</h2></div>
            <div style="max-width: 800px; margin: 0 auto; display:flex; flex-direction:column; gap:2rem;">
                <div class="glass-card" style="padding: 2rem;">
                    <h3>Account Info</h3>
                    <p>Name: ${State.currentUser.name}</p>
                    <p>Role: <span class="text-accent">${State.currentUser.role}</span></p>
                    <button class="btn-secondary" style="margin-top:1rem;" onclick="logout()">Logout</button>
                    ${State.currentUser.role === 'admin' ? `<button class="btn-primary" style="margin-top:1rem; margin-left:1rem;" onclick="navigate('admin')">Admin Dashboard</button>` : ''}
                </div>
                
                <div class="glass-card" style="padding: 2rem;">
                    <h3>Reservations</h3>
                    ${State.reservations.length === 0 ? '<p class="text-muted">No active reservations.</p>' : `
                        <ul>
                            ${State.reservations.map((r,i) => `
                                <li style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--glass-border);">
                                    <strong>${r.title}</strong> - Status: <span class="text-accent">${r.status}</span>
                                    <div class="text-muted" style="margin-top:0.2rem; font-size: 0.9rem;">
                                        <i data-lucide="calendar" style="width:14px;height:14px;"></i> ${r.date} at ${r.time} (${r.participants} people)
                                    </div>
                                    <div style="margin-top:0.5rem;">
                                        <button class="btn-secondary" onclick="openUpdateReservationModal(${i})" style="font-size:0.8rem;">Change Details</button>
                                        <button class="btn-secondary" onclick="cancelReservation(${i})" style="font-size:0.8rem; color: #ff5555; border-color: #ff5555;">Cancel</button>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                    <h3 style="margin-top:2rem;">Orders</h3>
                    ${State.orders.length === 0 ? '<p class="text-muted">No past orders.</p>' : `
                        <ul>
                            ${State.orders.map((o) => `
                                <li style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--glass-border);">
                                    <strong>Order #${o.id}</strong> - Total: $${o.total} - Status: <span class="text-accent">${o.status}</span>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>
            </div>
        `;
    }
}

async function renderAdminDashboard() {
    const main = document.getElementById('app-content');
    
    let ticketsOutput = '<p class="text-muted">Loading tickets...</p>';
    let stats = { sales: 0, reservations: 0 };
    try {
        const [res, statRes] = await Promise.all([
            fetch(`${API_URL}/tickets`),
            fetch(`${API_URL}/admin/stats`)
        ]);
        const tickets = await res.json();
        stats = await statRes.json();
        
        if(tickets.length > 0) {
            ticketsOutput = `
                <table style="width:100%; border-collapse: collapse; margin-top:1rem;">
                    <thead><tr>
                        <th style="text-align:left; padding:0.5rem; border-bottom:1px solid #333;">ID</th>
                        <th style="text-align:left; padding:0.5rem; border-bottom:1px solid #333;">Subject</th>
                        <th style="text-align:left; padding:0.5rem; border-bottom:1px solid #333;">Message</th>
                        <th style="text-align:left; padding:0.5rem; border-bottom:1px solid #333;">Status</th>
                    </tr></thead>
                    <tbody>
                        ${tickets.map(t => `
                            <tr>
                                <td style="padding:0.5rem; border-bottom:1px solid #333;">#${t.id}</td>
                                <td style="padding:0.5rem; border-bottom:1px solid #333;">${t.subject}</td>
                                <td style="padding:0.5rem; border-bottom:1px solid #333; font-size:0.9rem; color: #aaa;">${t.message}</td>
                                <td style="padding:0.5rem; border-bottom:1px solid #333;"><span class="text-accent">${t.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            ticketsOutput = '<p class="text-muted">No tickets available.</p>';
        }
    } catch(err) {
        ticketsOutput = '<p class="text-error">Failed to load data.</p>';
    }

    main.innerHTML = `
        <div class="page-header"><h2>Admin Dashboard</h2></div>
        <div class="grid-container">
            <div class="glass-card" style="padding: 2rem; text-align:center;">
                <h3>Total Sales</h3>
                <p style="font-size: 2.5rem; color: var(--accent); font-weight: 800;">$${stats.sales || 0}</p>
            </div>
            <div class="glass-card" style="padding: 2rem; text-align:center;">
                <h3>Active Reservations</h3>
                <p style="font-size: 2.5rem; color: var(--accent); font-weight: 800;">${stats.reservations || 0}</p>
            </div>
        </div>
        <div style="margin-top: 2rem;" class="glass-card">
            <div class="card-body">
                <h3>Support Tickets</h3>
                ${ticketsOutput}
            </div>
        </div>
    `;
}

// ==== DETAILS & MODALS ====
async function showArtworkDetails(id) {
    const art = State.artworks.find(a => a.id === id);
    const modalBody = document.getElementById('modal-body');
    
    // Fetch comments
    let commentsHTML = '<p class="text-muted">Loading comments...</p>';
    try {
        const res = await fetch(`${API_URL}/comments/artwork/${id}`);
        const comments = await res.json();
        
        if(comments.length === 0) commentsHTML = '<p class="text-muted">No comments yet.</p>';
        else {
            commentsHTML = comments.map(c => `
                <div style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${c.user}</strong>
                        <span class="text-accent">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>
                    </div>
                    <p style="margin: 0.5rem 0;">${c.text}</p>
                </div>
            `).join('');
        }
    } catch(err) {
        commentsHTML = '<p class="text-muted">Failed to load comments.</p>';
    }

    modalBody.innerHTML = `
        <img src="${art.image}" style="width:100%; height:300px; object-fit:cover; border-radius:8px; margin-bottom:1rem;">
        <h2>${art.title}</h2>
        <p class="text-muted">By ${art.artist}</p>
        <p style="margin: 1rem 0;">${art.description}</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <p class="price">$${art.price}</p>
            <button class="btn-primary" onclick="addToCart({id: ${art.id}, title: '${art.title}', price: ${art.price}, type: 'Artwork'})">Add to Cart</button>
        </div>
        
        <hr style="border-color: var(--glass-border); margin: 2rem 0;">
        <h3>Comments</h3>
        <div id="art-comments-container">${commentsHTML}</div>
        
        ${State.currentUser && (State.orders.length > 0 || State.reservations.length > 0 || State.currentUser.role === 'admin') ? `
            <div style="margin-top:1rem;">
                <textarea placeholder="Write a review..." id="new-comment" style="width:100%; padding:0.5rem; background:rgba(0,0,0,0.5); color:#fff; border:1px solid var(--glass-border);"></textarea>
                <button class="btn-secondary" style="margin-top:0.5rem;" onclick="addComment(${id}, 'artwork')">Submit</button>
            </div>
        ` : (State.currentUser ? '<p class="text-muted" style="margin-top:1rem;">You must have a purchase or reservation history to comment.</p>' : '<p class="text-muted" style="margin-top:1rem;">Log in to post comments.</p>')}
    `;
    document.getElementById('modal').classList.add('active');
}

function showWorkshopDetails(id) {
    const ws = State.workshops.find(w => w.id === id);
    const modalBody = document.getElementById('modal-body');
    const today = new Date().toISOString().split('T')[0];
    modalBody.innerHTML = `
        <h2>${ws.title}</h2>
        <p class="text-muted">Instructor: ${ws.instructor}</p>
        <p style="margin: 1rem 0;"><i data-lucide="calendar"></i> ${ws.date} | ${ws.time}</p>
        <p style="margin-bottom: 1rem;">${ws.description}</p>
        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
            <div class="form-group" style="display:flex; gap:1rem;">
                <div style="flex:1;">
                    <label>Preferred Date</label>
                    <input type="date" id="book-date" min="${today}" required>
                </div>
                <div style="flex:1;">
                    <label>Preferred Time</label>
                    <input type="time" id="book-time" required>
                </div>
            </div>
            <div class="form-group">
                <label>Number of Participants</label>
                <input type="number" id="participant-count" value="1" min="1" max="${ws.capacity - ws.booked}">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <p>Total: $<span id="ws-total">${ws.price}</span></p>
                <button class="btn-primary" onclick="bookWorkshop(${ws.id})">Create Reservation</button>
            </div>
        </div>
    `;
    document.getElementById('modal').classList.add('active');
    lucide.createIcons();
    
    document.getElementById('participant-count').addEventListener('input', (e) => {
        document.getElementById('ws-total').innerText = e.target.value * ws.price;
    });
}

function openSupport() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>Customer Support</h2>
        <p class="text-muted" style="margin-bottom:1rem;">We are here to help!</p>
        <div class="form-group">
            <label>Subject</label>
            <input type="text" id="supp-subject" placeholder="What is the issue?">
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea id="supp-message" rows="4" placeholder="Describe your problem..."></textarea>
        </div>
        <button class="btn-primary" style="width:100%" onclick="submitSupport()">Send Ticket</button>
    `;
    document.getElementById('modal').classList.add('active');
}

// ==== COMPARE MODULE ====
function toggleCompareMode(type) {
    State.compareMode = !State.compareMode;
    State.compareList = [];
    if(type === 'artwork') renderArtworks();
    if(type === 'workshop') renderWorkshops();
    
    document.getElementById('compare-action-bar').style.display = State.compareMode ? 'flex' : 'none';
}

function toggleCompareItem(type, id) {
    const item = type === 'artwork' ? State.artworks.find(a => a.id === id) : State.workshops.find(w => w.id === id);
    const existingIdx = State.compareList.findIndex(c => c.item.id === id);
    
    if(existingIdx >= 0) {
        State.compareList.splice(existingIdx, 1);
    } else {
        if(State.compareList.length >= 3) {
            showToast('You can compare max 3 items', 'error');
            setTimeout(() => { if(type === 'artwork') renderArtworks(); else renderWorkshops(); }, 100);
            return;
        }
        State.compareList.push({type, item});
    }
}

function showComparison() {
    if(State.compareList.length < 2) return showToast('Select at least 2 items to compare', 'error');
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>Comparison Results</h2>
        <div style="display:flex; gap:1rem; margin-top:2rem; overflow-x:auto;">
            ${State.compareList.map(c => `
                <div style="flex:1; background: var(--glass-bg); border-radius: 8px; padding: 1rem; border: 1px solid var(--glass-border);">
                    ${c.type === 'artwork' ? `<img src="${c.item.image}" style="width:100%; height:150px; object-fit:cover; border-radius:4px;">` : ''}
                    <h3 style="margin-top:1rem;">${c.item.title}</h3>
                    <p class="price" style="margin: 0.5rem 0;">$${c.item.price}</p>
                    <p class="text-muted">${c.type === 'artwork' ? c.item.artist : c.item.instructor}</p>
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('modal').classList.add('active');
}

// ==== API ACTIONS ====
async function fetchUserData(userId) {
    try {
        const favRes = await fetch(`${API_URL}/favorites/${userId}`);
        State.favorites = await favRes.json();
        
        const resRes = await fetch(`${API_URL}/reservations/${userId}`);
        State.reservations = await resRes.json();
        
        const ordRes = await fetch(`${API_URL}/orders/${userId}`);
        State.orders = await ordRes.json();
    } catch(err) {
        console.error('Failed to load user data');
    }
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });
        const data = await res.json();
        
        if(!res.ok) {
            showToast(data.error, 'error');
        } else {
            State.currentUser = data.user;
            await fetchUserData(data.user.id);
            showToast('Logged in successfully!');
            navigate('home');
        }
    } catch(err) {
        showToast('Server error', 'error');
    }
}

async function register() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    if(!name || !email || !password) return showToast('Fill all fields', 'error');

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, email, password})
        });
        const data = await res.json();
        
        if(!res.ok) showToast(data.error, 'error');
        else {
            showToast('Registration successful! Please log in.');
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
        }
    } catch(err) {
        showToast('Server error', 'error');
    }
}

function logout() {
    State.currentUser = null;
    State.favorites = [];
    State.reservations = [];
    State.orders = [];
    showToast('Logged out');
    navigate('home');
}

async function addComment(refId, type) {
    const text = document.getElementById('new-comment').value;
    if(text.trim() === '') return;
    
    try {
        await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ refId, type, user: State.currentUser.name, text, rating: 5 })
        });
        showToast('Comment added!');
        showArtworkDetails(refId); 
    } catch(err) {
        showToast('Failed to post comment', 'error');
    }
}

async function submitSupport() {
    const subject = document.getElementById('supp-subject').value;
    const message = document.getElementById('supp-message').value;
    if(!subject || !message) return showToast('Fill all fields', 'error');
    
    try {
        await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ subject, message })
        });
        showToast('Ticket sent! Staff will check it soon.');
        closeModal();
    } catch(err) {
        showToast('Failed to send ticket', 'error');
    }
}

async function toggleFavorite(id) {
    if (!State.currentUser) return showToast('Please login to favorite', 'error');
    const idx = State.favorites.indexOf(id);
    if(idx > -1) {
        try {
            await fetch(`${API_URL}/favorites/${State.currentUser.id}/${id}`, {method: 'DELETE'});
            State.favorites.splice(idx, 1);
            showToast('Removed from favorites');
        } catch(e) {}
    } else {
        try {
            await fetch(`${API_URL}/favorites`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({user_id: State.currentUser.id, artwork_id: id})
            });
            State.favorites.push(id);
            showToast('Added to favorites');
        } catch(e) {}
    }
    document.getElementById('fav-count').innerText = State.favorites.length > 0 ? `(${State.favorites.length})` : '';
    if(document.getElementById('artworks-grid')) renderArtworks();
}

function addToCart(item) {
    if (!State.currentUser) return showToast('Please login first', 'error');
    State.cart.push(item);
    document.getElementById('cart-count').innerText = `(${State.cart.length})`;
    showToast(`${item.title} added to cart`);
    closeModal();
}

function removeFromCart(idx) {
    State.cart.splice(idx, 1);
    document.getElementById('cart-count').innerText = State.cart.length > 0 ? `(${State.cart.length})` : '';
    renderCart();
}

async function bookWorkshop(wsId) {
    if (!State.currentUser) return showToast('Please login to book', 'error');
    
    const dateInput = document.getElementById('book-date').value;
    const timeInput = document.getElementById('book-time').value;
    if(!dateInput || !timeInput) return showToast('Please select a date and time', 'error');

    const ws = State.workshops.find(w => w.id === wsId);
    const count = parseInt(document.getElementById('participant-count').value);
    const total = ws.price * count;
    
    try {
        const res = await fetch(`${API_URL}/reservations`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({user_id: State.currentUser.id, workshop_id: wsId, title: ws.title, date: dateInput, time: timeInput, participants: count, total})
        });
        const data = await res.json();
        if(res.ok) {
            State.reservations.push({
                id: data.id, workshop_id: wsId, title: ws.title, date: dateInput, time: timeInput, participants: count, total: total, status: 'Active'
            });
            showToast(`Reservation created!`);
            closeModal();
            navigate('profile');
        }
    } catch(err) {
        showToast('Error booking', 'error');
    }
}

function openUpdateReservationModal(idx) {
    const resObj = State.reservations[idx];
    const ws = State.workshops.find(w => w.id === resObj.workshop_id);
    const capacityInfo = ws ? `max="${ws.capacity - ws.booked + resObj.participants}"` : '';

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>Update Reservation</h2>
        <p class="text-muted">${resObj.title}</p>
        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-top:1rem;">
            <div class="form-group" style="display:flex; gap:1rem;">
                <div style="flex:1;">
                    <label>Date</label>
                    <input type="date" id="upd-date" value="${resObj.date}" required>
                </div>
                <div style="flex:1;">
                    <label>Time</label>
                    <input type="time" id="upd-time" value="${resObj.time}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Number of Participants</label>
                <input type="number" id="upd-participant" value="${resObj.participants}" min="1" ${capacityInfo}>
            </div>
            <button class="btn-primary" style="width:100%" onclick="submitUpdateReservation(${idx})">Save Changes</button>
        </div>
    `;
    document.getElementById('modal').classList.add('active');
}

async function submitUpdateReservation(idx) {
    const resObj = State.reservations[idx];
    const newCount = parseInt(document.getElementById('upd-participant').value);
    const newDate = document.getElementById('upd-date').value;
    const newTime = document.getElementById('upd-time').value;
    
    if(!newDate || !newTime || isNaN(newCount)) return showToast('Fill all fields', 'error');

    const ws = State.workshops.find(w => w.id === resObj.workshop_id);
    const newTotal = ws ? ws.price * newCount : 0;
    
    try {
        const res = await fetch(`${API_URL}/reservations/${resObj.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({participants: newCount, total: newTotal, date: newDate, time: newTime})
        });
        if(res.ok) {
            State.reservations[idx].participants = newCount;
            State.reservations[idx].total = newTotal;
            State.reservations[idx].date = newDate;
            State.reservations[idx].time = newTime;
            showToast('Reservation updated!');
            closeModal();
            renderProfile();
        }
    } catch(err) { showToast('Error', 'error'); }
}

async function cancelReservation(idx) {
    if(confirm('Are you sure you want to cancel this reservation?')) {
        const resObj = State.reservations[idx];
        try {
            const res = await fetch(`${API_URL}/reservations/cancel/${resObj.id}`, {method: 'PUT'});
            if(res.ok) {
                State.reservations[idx].status = 'Cancelled';
                showToast('Reservation cancelled');
                renderProfile();
            }
        } catch(err) { showToast('Error', 'error'); }
    }
}

async function checkout() {
    if(!State.currentUser) return showToast('Login to checkout', 'error');
    if(State.cart.length === 0) return showToast('Cart is empty', 'error');
    
    const cartTotal = State.cart.reduce((sum, item) => sum + item.price, 0);
    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({user_id: State.currentUser.id, total: cartTotal, items: State.cart})
        });
        const data = await res.json();
        if(res.ok) {
            State.orders.push({id: data.orderId, total: cartTotal, status: 'Paid'});
            State.cart = [];
            document.getElementById('cart-count').innerText = '';
            showToast('Payment successful! Order tracked in profile.');
            navigate('profile');
        }
    } catch(err) {
        showToast('Error on checkout', 'error');
    }
}

// ==== UTILS ====
function updateNavUI() {
    // BUG FIX: active link staying visually stuck
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('onclick').includes(`'${State.currentView}'`)) {
            link.classList.add('active');
        }
    });

    document.getElementById('login-btn').innerText = State.currentUser ? 'Profile' : 'Login / Register';
    document.getElementById('fav-count').innerText = State.favorites.length > 0 ? `(${State.favorites.length})` : '';
    document.getElementById('cart-count').innerText = State.cart.length > 0 ? `(${State.cart.length})` : '';
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'error' ? '#ff5555' : 'var(--accent)';
    toast.innerHTML = `<p>${msg}</p>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initiate App
window.addEventListener('DOMContentLoaded', () => {
    navigate('home');
});
