// ============================================================================
// Authentication Module
// ============================================================================

import { supabase } from './config.js';
import { initializeApp } from './app.js';

// Authentication state
let currentUser = null;
let appInitialized = false; // Flag to prevent double initialization

// ============================================================================
// Initialize Authentication
// ============================================================================
export async function initAuth() {
    console.log('🔐 Initializing authentication...');
    
    // Check for remembered session
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const autoLogin = localStorage.getItem('autoLogin') === 'true';
    
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }
    
    // Check if user is already logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await handleAuthSuccess();
    } else {
        showLoginScreen();
    }
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await handleAuthSuccess();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLoginScreen();
        }
    });
}

// ============================================================================
// Login Function
// ============================================================================
export async function login(email, password, rememberMe) {
    try {
        showLoginLoading(true);
        clearLoginError();
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Handle remember me
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('autoLogin', 'true');
        } else {
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('autoLogin');
        }
        
        currentUser = data.user;
        await handleAuthSuccess();
        
        return { success: true };
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(getErrorMessage(error));
        return { success: false, error: error.message };
    } finally {
        showLoginLoading(false);
    }
}

// ============================================================================
// Logout Function
// ============================================================================
export async function logout() {
    console.log('🚪 Začínam odhlásenie...');
    
    try {
        // Disable logout button immediately to prevent double clicks
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.style.opacity = '0.5';
            logoutBtn.style.cursor = 'not-allowed';
        }
        
        // Sign out from Supabase
        await supabase.auth.signOut();
        console.log('✅ Supabase signOut úspešný');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        // Continue with logout even if Supabase fails
    } finally {
        // Always clear local state and reload
        currentUser = null;
        appInitialized = false;
        
        // Clear localStorage
        const rememberMe = localStorage.getItem('autoLogin') === 'true';
        if (!rememberMe) {
            localStorage.removeItem('rememberedEmail');
        }
        localStorage.removeItem('autoLogin');
        
        console.log('✅ Lokálny stav vyčistený, reloadujem...');
        
        // Force reload with timeout
        setTimeout(() => {
            window.location.href = window.location.href;
        }, 100);
    }
}

// ============================================================================
// Get Current User
// ============================================================================
export function getCurrentUser() {
    return currentUser;
}

// ============================================================================
// Check if User is Admin
// ============================================================================
export async function isAdmin() {
    if (!currentUser) return false;
    
    try {
        // Check user's role in database or metadata
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id)
            .single();
        
        if (error) {
            console.warn('Could not fetch user role:', error);
            return false;
        }
        
        return data?.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// ============================================================================
// UI Functions
// ============================================================================
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    
    // Clear password field for security
    document.getElementById('loginPassword').value = '';
    
    document.getElementById('loginEmail').focus();
}

function hideLoginScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Clear password field after successful login for security
    document.getElementById('loginPassword').value = '';
}

async function handleAuthSuccess() {
    hideLoginScreen();
    
    // Update user info in header
    const userEmail = currentUser?.email || 'Unknown';
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userEmail;
    }
    
    // Check if admin and show/hide admin features
    const adminStatus = await isAdmin();
    toggleAdminFeatures(adminStatus);
    
    console.log('✅ User authenticated:', userEmail);
    
    // Initialize app data after login (only once)
    if (!appInitialized) {
        appInitialized = true;
        await initializeApp();
    }
}

function toggleAdminFeatures(isAdminUser) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = isAdminUser ? '' : 'none';
    });
}

function showLoginLoading(show) {
    const button = document.getElementById('loginButton');
    const spinner = document.getElementById('loginSpinner');
    const buttonText = document.getElementById('loginButtonText');
    
    if (show) {
        button.disabled = true;
        spinner.style.display = 'inline-block';
        buttonText.textContent = 'Prihlasovanie...';
    } else {
        button.disabled = false;
        spinner.style.display = 'none';
        buttonText.textContent = 'Prihlásiť sa';
    }
}

function showLoginError(message) {
    const errorElement = document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearLoginError() {
    const errorElement = document.getElementById('loginError');
    errorElement.style.display = 'none';
}

function getErrorMessage(error) {
    const errorMessages = {
        'Invalid login credentials': 'Nesprávny email alebo heslo',
        'Email not confirmed': 'Email nebol potvrdený',
        'User not found': 'Používateľ nebol nájdený',
        'Invalid email': 'Neplatný email',
        'Password should be at least 6 characters': 'Heslo musí mať aspoň 6 znakov'
    };
    
    return errorMessages[error.message] || 'Chyba pri prihlásení. Skúste to znova.';
}

// ============================================================================
// Setup Event Listeners
// ============================================================================
export function setupAuthListeners() {
    // Login form submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            await login(email, password, rememberMe);
        });
    }
    
    // Logout button - použiť delegáciu eventov
    document.addEventListener('click', async (e) => {
        if (e.target && (e.target.id === 'logoutButton' || e.target.closest('#logoutButton'))) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚪 Logout button kliknutý');
            await logout();
        }
    });
    
    // Enter key on password field
    const passwordField = document.getElementById('loginPassword');
    if (passwordField) {
        passwordField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }
}
