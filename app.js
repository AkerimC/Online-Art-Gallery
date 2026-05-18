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
    currentView: 'home',
    appliedDiscount: 0
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
                    <button class="btn-secondary" onclick="State.compareList = []; navigate(State.currentView);">Clear</button>
                    <button class="btn-primary" onclick="saveComparison()">Save Comparison</button>
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
    
    if (State.cart.length === 0) {
        main.innerHTML = `
            <div class="page-header" style="text-align:center; padding: 4rem 1rem;">
                <h2>Your Cart is Empty</h2>
                <p class="text-muted" style="margin-top:1rem;">Add some beautiful artworks or join a workshop!</p>
                <button class="btn-primary" onclick="navigate('home')" style="margin-top:2rem;">Explore Artworks</button>
            </div>
        `;
        return;
    }

    const subtotal = State.cart.reduce((sum, item) => sum + item.price, 0);
    const discountAmount = (subtotal * (State.appliedDiscount || 0)) / 100;
    const total = subtotal - discountAmount;

    main.innerHTML = `
        <div class="page-header">
            <h2>Your Cart</h2>
        </div>
        <div style="padding: 0 5%; display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            <div class="grid" style="grid-template-columns: 1fr;">
                ${State.cart.map((item, idx) => `
                    <div class="glass-card p-4" style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4>${item.title}</h4>
                            <p class="text-muted">${item.type || 'Item'}</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <span class="text-accent">$${item.price}</span>
                            <button class="icon-btn" onclick="removeFromCart(${idx})"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="glass-card" style="padding: 2rem; height: fit-content;">
                <h3>Order Summary</h3>
                
                <div style="margin: 1.5rem 0; display:flex; flex-direction:column; gap:0.8rem;">
                    <input type="text" id="coupon-input" placeholder="Enter Code (e.g. AURA20)" style="padding:0.8rem; border-radius:4px; border:1px solid var(--glass-border); background:var(--glass-bg); color:#fff; width:100%;">
                    <button class="btn-secondary" style="width:100%; padding:0.8rem; font-weight:bold;" onclick="applyCoupon()">APPLY COUPON</button>
                </div>
                
                ${State.appliedDiscount > 0 ? `<p style="color: var(--accent); margin-bottom: 0.5rem; text-align:center; font-weight:bold;">Discount Applied: -%${State.appliedDiscount}</p>` : ''}
                
                <hr style="border-color: var(--glass-border); margin: 1rem 0;">
                <h2 style="margin-bottom: 1.5rem; text-align:center;">Total: $${total.toFixed(2)}</h2>
                <button class="btn-primary" style="width:100%; padding:1rem; font-size:1.1rem;" onclick="checkout()">Checkout</button>
            </div>
        </div>
    `;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function renderProfile() {
    const main = document.getElementById('app-content');
    
    if (!State.currentUser) {
        // Eğer giriş yapılmadıysa login/register formunu göster
        main.innerHTML = `
            <div class="auth-container glass-card" style="max-width: 400px; margin: 4rem auto; padding: 2rem;">
                <h2 style="text-align:center; margin-bottom: 1.5rem;">Join AURA</h2>
                <form onsubmit="handleAuth(event)">
                    <input type="hidden" id="auth-action" value="login">
                    <div class="form-group" id="name-group" style="display:none;">
                        <label>Full Name</label>
                        <input type="text" id="auth-name" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="auth-email" placeholder="you@example.com" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="auth-password" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%; margin-top:1rem;">Proceed</button>
                </form>
                <p style="text-align:center; margin-top:1rem; font-size:0.9rem;">
                    <a href="#" id="auth-toggle" onclick="
                        const na = document.getElementById('name-group');
                        const act = document.getElementById('auth-action');
                        if(act.value === 'login'){
                            act.value = 'register'; na.style.display='block'; this.innerText='Already have an account? Login';
                        } else {
                            act.value = 'login'; na.style.display='none'; this.innerText='Don\'t have an account? Register';
                        }
                    ">Don't have an account? Register</a>
                </p>
            </div>
        `;
        return;
    }

    // --- SİPARİŞ GEÇMİŞİ VERİLERİ ---
    const ordersHTML = (State.orders && State.orders.length > 0)
        ? State.orders.map(order => `
            <div class="glass-card" style="padding: 1rem; margin-bottom: 1rem; border-left: 4px solid var(--accent); display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0;">Order #${order.id}</h4>
                    <p class="text-muted" style="margin: 5px 0 0 0; font-size:0.9rem;">Total Paid: <span class="text-accent">$${Number(order.total).toFixed(2)}</span></p>
                </div>
                <span style="background: rgba(171, 246, 45, 0.1); color: var(--accent); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Success</span>
            </div>
        `).join('')
        : '<p class="text-muted">No orders placed yet.</p>';

    // --- KULLANICININ DESTEK TALEPLERİ (TICKETS) VERİLERİ ---
    let ticketsHTML = '<p class="text-muted">No support tickets found.</p>';
    try {
        const tRes = await fetch(`${API_URL}/tickets/user/${State.currentUser.id}`);
        const tickets = await tRes.json();
        if(tickets && tickets.length > 0) {
            ticketsHTML = tickets.map(t => `
                <div class="glass-card" style="padding: 1rem; margin-bottom: 1rem; border-left: 4px solid ${t.status === 'Open' ? '#ffb86c' : 'var(--accent)'}; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0;">${t.subject}</h4>
                        <p class="text-muted" style="margin: 5px 0 0 0; font-size:0.9rem;">${t.message}</p>
                    </div>
                    <span style="background: rgba(255,255,255,0.05); color: ${t.status === 'Open' ? '#ffb86c' : 'var(--accent)'}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${t.status}</span>
                </div>
            `).join('');
        }
    } catch(e) {}

    // --- ANA PROFİL TASARIMI (HTML) ---
    main.innerHTML = `
        <div class="page-header">
            <h2>Welcome, ${State.currentUser.name}</h2>
            <p class="text-muted">${State.currentUser.email} (${State.currentUser.role.toUpperCase()})</p>
            <button class="btn-secondary" onclick="State.currentUser = null; navigate('home');" style="margin-top:1rem;">Logout</button>
        </div>

        <div style="padding: 0 5%; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
            
            <div style="display:flex; flex-direction:column; gap:2rem;">
                <div class="glass-card p-4">
                    <h3>Update Profile</h3>
                    <form onsubmit="updateProfile(event)" style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
                        <input type="text" id="edit-name" value="${State.currentUser.name}" required style="padding:0.6rem; background:rgba(0,0,0,0.3); color:#fff; border:1px solid var(--glass-border); border-radius:4px;">
                        <input type="email" id="edit-email" value="${State.currentUser.email}" required style="padding:0.6rem; background:rgba(0,0,0,0.3); color:#fff; border:1px solid var(--glass-border); border-radius:4px;">
                        <button type="submit" class="btn-primary" style="width:fit-content;">Save Changes</button>
                    </form>
                </div>

                <div class="glass-card p-4">
                    <h3>Change Password</h3>
                    <form onsubmit="updatePassword(event)" style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
                        <input type="password" id="old-password" placeholder="Current Password" required style="padding:0.6rem; background:rgba(0,0,0,0.3); color:#fff; border:1px solid var(--glass-border); border-radius:4px;">
                        <input type="password" id="new-password" placeholder="New Password" required style="padding:0.6rem; background:rgba(0,0,0,0.3); color:#fff; border:1px solid var(--glass-border); border-radius:4px;">
                        <button type="submit" class="btn-primary" style="width:fit-content;">Update Password</button>
                    </form>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:2rem;">
                
                <div class="glass-card p-4" style="max-height: 300px; overflow-y: auto;">
                    <h3 style="margin-bottom:1.5rem;">Your Order History</h3>
                    <div id="profile-orders-list">
                        ${ordersHTML}
                    </div>
                </div>

                <div class="glass-card p-4" style="max-height: 300px; overflow-y: auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                        <h3 style="margin:0;">Support Tickets</h3>
                        <button class="btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.9rem;" onclick="openSupport()">New Ticket</button>
                    </div>
                    <div id="profile-tickets-list">
                        ${ticketsHTML}
                    </div>
                </div>

            </div>
        </div>
    `;
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

// --- 1. ESERLER (ARTWORK) İÇİN YORUM SİSTEMLİ MODAL ---
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
        
        <div style="margin-top: 1rem;">
            <h3>Reviews & Ratings</h3>
            <form onsubmit="submitComment(event, 'artwork', ${art.id})" style="margin-top: 1.5rem; display:flex; flex-direction:column; gap: 1rem; background: var(--glass-bg); padding: 1.5rem; border-radius: 8px;">
                <div style="display:flex; gap: 1rem; align-items:center;">
                    <label style="color: var(--text-muted);">Your Rating:</label>
                    <select id="new-comment-rating" style="padding: 0.5rem; border-radius: 4px; background: var(--bg-secondary); color: #fff; border: 1px solid var(--glass-border); cursor: pointer;">
                        <option value="5">★★★★★ (5)</option>
                        <option value="4">★★★★☆ (4)</option>
                        <option value="3">★★★☆☆ (3)</option>
                        <option value="2">★★☆☆☆ (2)</option>
                        <option value="1">★☆☆☆☆ (1)</option>
                    </select>
                </div>
                <textarea id="new-comment-text" rows="3" placeholder="Share your thoughts about this artwork..." required style="width: 100%; padding: 0.8rem; border-radius:4px; border:1px solid var(--glass-border); background:var(--bg-secondary); color:#fff; font-family: inherit; resize: vertical;"></textarea>
                <button type="submit" class="btn-primary" style="align-self: flex-start;">Post Review</button>
            </form>
            <div id="comments-container" style="margin-top: 2rem;"></div>
        </div>
    `;
    document.getElementById('modal').classList.add('active');
    renderComments('artwork', art.id); // Yorumları çağır
}

// --- 2. ATÖLYELER (WORKSHOP) İÇİN YORUM SİSTEMLİ MODAL ---
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

        <hr style="border-color: var(--glass-border); margin: 2rem 0;">
        
        <div style="margin-top: 1rem;">
            <h3>Reviews & Ratings</h3>
            <form onsubmit="submitComment(event, 'workshop', ${ws.id})" style="margin-top: 1.5rem; display:flex; flex-direction:column; gap: 1rem; background: var(--glass-bg); padding: 1.5rem; border-radius: 8px;">
                <div style="display:flex; gap: 1rem; align-items:center;">
                    <label style="color: var(--text-muted);">Your Rating:</label>
                    <select id="new-comment-rating" style="padding: 0.5rem; border-radius: 4px; background: var(--bg-secondary); color: #fff; border: 1px solid var(--glass-border); cursor: pointer;">
                        <option value="5">★★★★★ (5)</option>
                        <option value="4">★★★★☆ (4)</option>
                        <option value="3">★★★☆☆ (3)</option>
                        <option value="2">★★☆☆☆ (2)</option>
                        <option value="1">★☆☆☆☆ (1)</option>
                    </select>
                </div>
                <textarea id="new-comment-text" rows="3" placeholder="Share your thoughts about this workshop..." required style="width: 100%; padding: 0.8rem; border-radius:4px; border:1px solid var(--glass-border); background:var(--bg-secondary); color:#fff; font-family: inherit; resize: vertical;"></textarea>
                <button type="submit" class="btn-primary" style="align-self: flex-start;">Post Review</button>
            </form>
            <div id="comments-container" style="margin-top: 2rem;"></div>
        </div>
    `;
    document.getElementById('modal').classList.add('active');
    lucide.createIcons();
    renderComments('workshop', ws.id); // Yorumları çağır
    
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
    if(!State.currentUser) return showToast('Please login to send a ticket', 'error');
    
    try {
        await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: State.currentUser.id, subject, message })
        });
        showToast('Ticket sent! Staff will check it soon.');
        closeModal();
        if(State.currentView === 'profile') renderProfile(); // Profildeyse anında yenile
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
// --- KUPON DOĞRULAMA (YENİ EKLENEN) ---
async function applyCoupon() {
    const codeInput = document.getElementById('coupon-input');
    if(!codeInput) return;
    const code = codeInput.value.trim().toUpperCase();

    if(!code) {
        showToast('Please enter a coupon code.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/coupons/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        
        if(data.success) {
            State.appliedDiscount = data.discount;
            showToast(`Coupon applied: ${data.discount}% discount!`);
            navigate('cart'); // Sayfayı yenileyip indirimli fiyatı göstermek için
        } else {
            showToast(data.error || 'Invalid coupon', 'error');
            State.appliedDiscount = 0;
        }
    } catch(err) {
        showToast('Connection error', 'error');
    }
}

// --- ESKİ CHECKOUT FONKSİYONUNUN GÜNCEL HALİ ---
async function checkout() {
    if(!State.currentUser) {
        showToast('Please login to checkout', 'error');
        navigate('profile');
        return;
    }
    if(State.cart.length === 0) return;

    // İndirimli toplam tutarı hesaplama
    const subtotal = State.cart.reduce((sum, item) => sum + item.price, 0);
    const discountAmount = (subtotal * State.appliedDiscount) / 100;
    const finalTotal = subtotal - discountAmount;

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: State.currentUser.id,
                total: finalTotal,
                items: State.cart
            })
        });
        const data = await res.json();
        
        if(data.success) {
            State.cart = [];
            State.appliedDiscount = 0; // Alışveriş bitince indirimi sıfırla
            updateNavUI();
            showToast('Order placed successfully!');
            
            // Profildeki sipariş geçmişini tazelemek için
            const ordersRes = await fetch(`${API_URL}/orders/${State.currentUser.id}`);
            State.orders = await ordersRes.json();
            
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

// --- PROFİL VE ŞİFRE GÜNCELLEME FONKSİYONLARI ---

async function updateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('update-name').value;
    const email = document.getElementById('update-email').value;

    try {
        const res = await fetch(`${API_URL}/users/${State.currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        const data = await res.json();
        
        if(data.success) {
            State.currentUser.name = data.name;
            State.currentUser.email = data.email;
            showToast('Profile updated successfully!');
            navigate('profile'); // Sayfayı yenilemek için
        } else {
            showToast(data.error || 'Update failed', 'error');
        }
    } catch(err) {
        showToast('Connection error', 'error');
    }
}

async function changePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    try {
        const res = await fetch(`${API_URL}/users/${State.currentUser.id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        
        if(data.success) {
            showToast('Password changed successfully!');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
        } else {
            showToast(data.error || 'Password update failed', 'error');
        }
    } catch(err) {
        showToast('Connection error', 'error');
    }
}
// --- KARŞILAŞTIRMAYI VERİTABANINA KAYDETME (FRONTEND) ---
async function saveComparison() {
    if(!State.currentUser) {
        showToast('Please login to save comparisons', 'error');
        navigate('profile');
        return;
    }
    
    if(State.compareList.length < 2) {
        showToast('Please add at least 2 items to compare', 'error');
        return;
    }

    // Karşılaştırılan elemanların ID'lerini topluyoruz
    const itemIds = State.compareList.map(item => item.id);
    
    // Listenin ilk elemanında 'artist' alanı varsa Artwork'tür, yoksa Workshop'tur
    const type = State.compareList[0].artist ? 'artwork' : 'workshop';

    try {
        const res = await fetch(`${API_URL}/comparisons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: State.currentUser.id,
                type: type,
                item_ids: itemIds
            })
        });
        const data = await res.json();
        
        if(data.success) {
            showToast('Comparison saved to your profile successfully!');
            State.compareMode = false;
            State.compareList = [];
            navigate(State.currentView); // Sayfayı yenileyip modu kapatıyoruz
        } else {
            showToast('Failed to save comparison', 'error');
        }
    } catch(err) {
        showToast('Connection error', 'error');
    }
}
// --- YORUM, PUANLAMA VE YANIT SİSTEMİ FONKSİYONLARI ---

async function renderComments(type, refId) {
    const container = document.getElementById('comments-container');
    if(!container) return;

    try {
        const res = await fetch(`${API_URL}/comments/${type}/${refId}`);
        const comments = await res.json();
        
        let html = comments.map(c => `
            <div class="glass-card" style="padding: 1.5rem; margin-top: 1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${c.user_name}</strong>
                    <span class="text-accent" style="font-size: 1.2rem; letter-spacing: 2px;">
                        ${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}
                    </span>
                </div>
                <p style="margin: 0.8rem 0; line-height: 1.5;">${c.text}</p>
                
                <div style="display:flex; gap: 1rem; font-size: 0.9rem; margin-top: 1rem;">
                    <button class="icon-btn" onclick="voteComment(${c.id}, 'up', '${type}', ${refId})">
                        👍 <span style="margin-left:5px;">${c.upvotes}</span>
                    </button>
                    <button class="icon-btn" onclick="voteComment(${c.id}, 'down', '${type}', ${refId})">
                        👎 <span style="margin-left:5px;">${c.downvotes}</span>
                    </button>
                </div>

                ${c.admin_reply ? `
                    <div style="margin-top: 1rem; padding: 1rem; border-left: 3px solid var(--accent); background: rgba(171, 246, 45, 0.05); border-radius: 0 8px 8px 0;">
                        <small class="text-accent"><strong>Admin Reply:</strong></small>
                        <p style="margin-top: 0.4rem;">${c.admin_reply}</p>
                    </div>
                ` : ''}

                ${(State.currentUser && State.currentUser.role === 'admin' && !c.admin_reply) ? `
                    <div style="margin-top: 1.5rem; display:flex; gap: 0.5rem;">
                        <input type="text" id="admin-reply-${c.id}" placeholder="Type admin reply..." style="flex:1; padding: 0.5rem; border-radius:4px; border:1px solid var(--glass-border); background:var(--glass-bg); color:#fff;">
                        <button class="btn-secondary" onclick="replyComment(${c.id}, '${type}', ${refId})">Reply</button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        container.innerHTML = html || '<p class="text-muted" style="margin-top:1rem;">No comments yet. Be the first to share your thoughts!</p>';
    } catch(err) {
        container.innerHTML = '<p class="text-muted">Failed to load comments.</p>';
    }
}

async function submitComment(e, type, refId) {
    e.preventDefault();
    if(!State.currentUser) {
        showToast('Please login to leave a comment', 'error');
        return;
    }

    const text = document.getElementById('new-comment-text').value;
    const rating = parseInt(document.getElementById('new-comment-rating').value);

    try {
        const res = await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refId: refId,
                type: type,
                user_id: State.currentUser.id,
                user_name: State.currentUser.name,
                text: text,
                rating: rating
            })
        });
        const data = await res.json();
        if(data.success) {
            showToast('Review posted successfully!');
            document.getElementById('new-comment-text').value = '';
            document.getElementById('new-comment-rating').value = '5';
            renderComments(type, refId); // Yeni yorum eklenince listeyi yenile
        }
    } catch(err) {
        showToast('Error posting review', 'error');
    }
}

async function voteComment(commentId, voteType, type, refId) {
    try {
        const res = await fetch(`${API_URL}/comments/${commentId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voteType })
        });
        if(res.ok) renderComments(type, refId); // Oylama sonrası listeyi yenile
    } catch(err) {
        showToast('Error voting', 'error');
    }
}

async function replyComment(commentId, type, refId) {
    const replyText = document.getElementById(`admin-reply-${commentId}`).value;
    if(!replyText) return;

    try {
        const res = await fetch(`${API_URL}/comments/${commentId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: replyText })
        });
        if(res.ok) {
            showToast('Reply posted!');
            renderComments(type, refId); // Yanıt eklenince listeyi yenile
        }
    } catch(err) {
        showToast('Error posting reply', 'error');
    }
}
// --- GİRİŞ VE KAYIT OLMA FONKSİYONU ---
async function handleAuth(e) {
    e.preventDefault(); // Sayfanın yenilenmesini engeller
    const action = document.getElementById('auth-action').value;
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    if (action === 'register') {
        const name = document.getElementById('auth-name').value;
        if (!name) return showToast('Please enter your name to register', 'error');
        
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name, email, password})
            });
            const data = await res.json();
            
            if(!res.ok) showToast(data.error || 'Registration failed', 'error');
            else {
                showToast('Registration successful! Logging you in...');
                // Kayıt başarılıysa otomatik giriş yap
                document.getElementById('auth-action').value = 'login';
                handleAuth(new Event('submit')); 
            }
        } catch(err) {
            showToast('Server error', 'error');
        }
    } else {
        // Login İşlemi
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, password})
            });
            const data = await res.json();
            
            if(!res.ok) {
                showToast(data.error || 'Login failed', 'error');
            } else {
                State.currentUser = data.user;
                // Kullanıcının verilerini (sepet, favori, siparişler) çek
                await fetchUserData(data.user.id);
                showToast('Logged in successfully!');
                navigate('profile');
            }
        } catch(err) {
            showToast('Server error', 'error');
        }
    }
}