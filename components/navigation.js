// ═══════════════════════════════════════════════════════════════
// UNIFIED NAVIGATION COMPONENT
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yexvpbgkrzerkizscgfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q52fh6Xa3yNm3q0akTrKKw_7AlxLrCU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Session management
function getSession() { 
    try { return JSON.parse(sessionStorage.getItem('session') || 'null'); } 
    catch { return null; } 
}
function setSession(d) { sessionStorage.setItem('session', JSON.stringify(d)); }
function clearSession() { sessionStorage.removeItem('session'); }

// Navigation items configuration
const NAV_ITEMS = {
    public: [
        { href: 'index.html', text: 'Acasă', icon: '🏠' },
        { href: '#servicii', text: 'Servicii', icon: '🧩' },
        { href: '#despre', text: 'Despre', icon: '👤' },
        { href: 'contact.html', text: 'Contact', icon: '📞' }
    ],
    psiholog: [
        { href: 'index.html', text: 'Acasă', icon: '🏠' },
        { href: 'calendar.html', text: 'Calendar', icon: '📅' },
        { href: 'fisa-notare.html', text: 'Participanți', icon: '👥' },
        { href: 'rapoarte-lunare.html', text: 'Rapoarte Lunare', icon: '📊' },
        { href: 'evidenta.html', text: 'Evidență', icon: '📈' },
        { href: 'arhiva.html', text: 'Arhivă', icon: '🗄️' }
    ],
    parinte: [
        { href: 'index.html', text: 'Acasă', icon: '🏠' },
        { href: 'documente-parinte.html', text: 'Plan Intervenție', icon: '📋' },
        { href: 'portal-parinte.html', text: 'Progres Copil', icon: '📈' },
        { href: 'contact.html', text: 'Contact', icon: '📞' }
    ]
};

// Render navigation based on role and current page
function renderNavigation(currentPage = '') {
    const session = getSession();
    const role = session?.role || null;
    const navItems = role ? NAV_ITEMS[role] : NAV_ITEMS.public;
    
    const navHTML = `
        <header>
            <div class="nav-wrapper">
                <a href="index.html" class="nav-logo">Cristina <span>Pîslariu</span></a>
                <button class="hamburger" id="hamburger" aria-label="Meniu" aria-expanded="false">
                    <span></span><span></span><span></span>
                </button>
                <nav class="main-nav" id="mainNav">
                    <ul id="nav-links">
                        ${navItems.map(item => `
                            <li>
                                <a href="${item.href}" class="${currentPage === item.href ? 'active' : ''}">
                                    ${item.icon ? item.icon + ' ' : ''}${item.text}
                                </a>
                            </li>
                        `).join('')}
                        ${role ? `
                            <li>
                                <a href="javascript:void(0)" onclick="logout()" style="color: #a47373;">
                                    🚪 Logout
                                </a>
                            </li>
                        ` : `
                            <li id="auth-btn-container">
                                <a href="javascript:void(0)" class="trigger-login btn-cta" style="padding:0.5rem 1.2rem; font-size:0.88rem;">
                                    🔐 Autentificare
                                </a>
                            </li>
                        `}
                    </ul>
                </nav>
            </div>
        </header>
    `;
    
    // Inject navigation if header exists
    const header = document.querySelector('header');
    if (header) {
        header.innerHTML = navHTML;
        initHamburger();
        initLoginModal();
    }
    
    return navHTML;
}

// Hamburger menu functionality
function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const mainNav = document.getElementById('mainNav');
    
    if (hamburger && mainNav) {
        hamburger.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('open');
            hamburger.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', isOpen);
        });
        
        // Close menu on link click
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('open');
                hamburger.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }
}

// Login modal functionality
function initLoginModal() {
    const modal = document.getElementById('loginModal');
    const closeBtn = document.querySelector('.close-modal');
    
    if (modal) {
        document.querySelectorAll('.trigger-login').forEach(btn => {
            btn.onclick = () => modal.style.display = 'block';
        });
        
        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        
        document.addEventListener('keydown', (e) => { 
            if (e.key === 'Escape') modal.style.display = 'none'; 
        });
        
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.onsubmit = async function(e) {
                e.preventDefault();
                const emailVal = document.getElementById('email').value.toLowerCase().trim();
                const passVal = document.getElementById('password').value;
                const btn = this.querySelector('.btn-login');
                
                if (!emailVal || !passVal) { showToast('Completează toate câmpurile!', '⚠️'); return; }
                
                btn.textContent = 'Se verifică...';
                btn.disabled = true;
                
                const { data, error } = await _supabase
                    .from('users')
                    .select('*')
                    .eq('email', emailVal)
                    .eq('password', passVal)
                    .single();
                
                btn.textContent = 'Autentifică-te';
                btn.disabled = false;
                
                if (error || !data) {
                    showToast('Email sau parolă incorectă!', '❌');
                    return;
                }
                
                setSession({ role: data.role, email: data.email, userId: data.id });
                modal.style.display = 'none';
                this.reset();
                showToast('Bun venit! Autentificare reușită.', '✅');
                
                // Redirect based on role
                setTimeout(() => {
                    if (data.role === 'psiholog') {
                        window.location.href = 'fisa-notare.html';
                    } else if (data.role === 'parinte') {
                        window.location.href = 'portal-parinte.html';
                    }
                }, 1000);
            };
        }
    }
}

// Logout functionality
function logout() {
    clearSession();
    showToast('Ai fost deconectat.', '👋');
    setTimeout(() => window.location.href = 'index.html', 1000);
}

// Toast notification system
function showToast(message, icon = '✅') {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.className = 'custom-notification';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="notification-icon">${icon}</span><span>${message}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Check authentication and redirect if needed
function requireAuth(requiredRole = null) {
    const session = getSession();
    if (!session) {
        window.location.href = 'index.html';
        return false;
    }
    if (requiredRole && session.role !== requiredRole) {
        showToast('Nu ai acces la această pagină.', '🔒');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    renderNavigation(currentPage);
});
