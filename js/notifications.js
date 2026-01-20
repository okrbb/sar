// ============================================================================
// NOTIFICATIONS MODULE - notifications.js
// Systém notifikácií pre SAMU aplikáciu
// ============================================================================

import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let notificationsState = {
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    lastFetchTime: null
};

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

const NOTIFICATION_TYPES = {
    NEW_RISK: {
        icon: '⚠️',
        color: '#ef4444',
        title: 'Nové riziko'
    },
    RISK_UPDATE: {
        icon: '🔄',
        color: '#f97316',
        title: 'Aktualizácia rizika'
    },
    RISK_DELETED: {
        icon: '🗑️',
        color: '#64748b',
        title: 'Riziko odstránené'
    },
    CODELIST_UPDATE: {
        icon: '📋',
        color: '#3b82f6',
        title: 'Aktualizácia kódovníka'
    },
    SYSTEM: {
        icon: 'ℹ️',
        color: '#8b5cf6',
        title: 'Systémové upozornenie'
    },
    REMINDER: {
        icon: '⏰',
        color: '#eab308',
        title: 'Pripomienka'
    }
};

// ============================================================================
// INITIALIZE NOTIFICATIONS
// ============================================================================

export async function initializeNotifications() {
    console.log('🔔 Initializing notifications...');
    
    // Setup UI
    setupNotificationUI();
    
    // Load initial notifications
    await loadNotifications();
    
    // Setup real-time subscriptions
    setupRealtimeSubscriptions();
    
    // Check for new notifications every 30 seconds
    setInterval(async () => {
        await loadNotifications();
    }, 30000);
    
    console.log('✅ Notifications initialized');
}

// ============================================================================
// SETUP UI
// ============================================================================

function setupNotificationUI() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (!notificationsBtn) {
        console.warn('⚠️ Notifications button not found');
        return;
    }
    
    // Create notification dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'notificationsDropdown';
    dropdown.className = 'notifications-dropdown';
    dropdown.innerHTML = `
        <div class="notifications-header">
            <h3>Notifikácie</h3>
            <button class="mark-all-read-btn" id="markAllReadBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Označiť všetko
            </button>
        </div>
        <div class="notifications-list" id="notificationsList">
            <div class="notifications-loading">
                <div class="loading"></div>
                <p>Načítavam notifikácie...</p>
            </div>
        </div>
        <div class="notifications-footer">
            <button class="clear-all-btn" id="clearAllBtn">Vymazať všetky</button>
        </div>
    `;
    
    // Insert dropdown after button
    notificationsBtn.parentNode.insertBefore(dropdown, notificationsBtn.nextSibling);
    
    // Toggle dropdown on button click
    notificationsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNotificationsDropdown();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !notificationsBtn.contains(e.target)) {
            closeNotificationsDropdown();
        }
    });
    
    // Mark all as read button
    document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
        await markAllAsRead();
    });
    
    // Clear all button
    document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
        await clearAllNotifications();
    });
}

// ============================================================================
// LOAD NOTIFICATIONS
// ============================================================================

async function loadNotifications() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        // Fetch notifications from Supabase
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) {
            // If table doesn't exist, create mock notifications
            if (error.code === 'PGRST116' || error.code === '42P01') {
                console.warn('⚠️ Notifications table does not exist, using mock data');
                createMockNotifications();
                return;
            }
            throw error;
        }
        
        notificationsState.notifications = data || [];
        notificationsState.unreadCount = data.filter(n => !n.is_read).length;
        notificationsState.lastFetchTime = new Date();
        
        updateNotificationUI();
        
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        // Fallback to mock notifications
        createMockNotifications();
    }
}

// ============================================================================
// CREATE MOCK NOTIFICATIONS (for demo/testing)
// ============================================================================

function createMockNotifications() {
    const now = new Date();
    
    notificationsState.notifications = [
        {
            id: 1,
            type: 'NEW_RISK',
            title: 'Nové kritické riziko',
            message: 'Pridané nové kritické riziko v obci Banská Bystrica - Povodeň',
            is_read: false,
            created_at: new Date(now.getTime() - 5 * 60000).toISOString(), // 5 min ago
            metadata: { municipality: 'Banská Bystrica', event: 'Povodeň' }
        },
        {
            id: 2,
            type: 'RISK_UPDATE',
            title: 'Aktualizované riziko',
            message: 'Riziko "Lesný požiar - Brezno" bolo aktualizované z vysokého na stredné',
            is_read: false,
            created_at: new Date(now.getTime() - 30 * 60000).toISOString(), // 30 min ago
            metadata: { municipality: 'Brezno', event: 'Lesný požiar' }
        },
        {
            id: 3,
            type: 'CODELIST_UPDATE',
            title: 'Aktualizácia kódovníka',
            message: 'Pridaný nový krízový jav: "Kybernetický útok"',
            is_read: false,
            created_at: new Date(now.getTime() - 2 * 3600000).toISOString(), // 2 hours ago
            metadata: { codelist: 'events' }
        },
        {
            id: 4,
            type: 'REMINDER',
            title: 'Pripomienka kontroly',
            message: 'Skontrolujte aktuálnosť rizík pre okres Banská Bystrica',
            is_read: true,
            created_at: new Date(now.getTime() - 24 * 3600000).toISOString(), // 1 day ago
            metadata: { district: 'Banská Bystrica' }
        },
        {
            id: 5,
            type: 'SYSTEM',
            title: 'Systémová aktualizácia',
            message: 'Aplikácia bola aktualizovaná na verziu 2.0 s novými funkciami',
            is_read: true,
            created_at: new Date(now.getTime() - 3 * 24 * 3600000).toISOString(), // 3 days ago
            metadata: { version: '2.0' }
        }
    ];
    
    notificationsState.unreadCount = notificationsState.notifications.filter(n => !n.is_read).length;
    updateNotificationUI();
}

// ============================================================================
// UPDATE UI
// ============================================================================

function updateNotificationUI() {
    // Update badge
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (notificationsState.unreadCount > 0) {
            badge.textContent = notificationsState.unreadCount > 9 ? '9+' : notificationsState.unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Update dropdown list
    const listContainer = document.getElementById('notificationsList');
    if (!listContainer) return;
    
    if (notificationsState.notifications.length === 0) {
        listContainer.innerHTML = `
            <div class="notifications-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p>Žiadne notifikácie</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = notificationsState.notifications
        .map(notification => createNotificationHTML(notification))
        .join('');
    
    // Add click handlers to notifications
    listContainer.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = parseInt(item.dataset.id);
            await markAsRead(id);
        });
    });
}

// ============================================================================
// CREATE NOTIFICATION HTML
// ============================================================================

function createNotificationHTML(notification) {
    const type = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.SYSTEM;
    const timeAgo = getTimeAgo(notification.created_at);
    
    return `
        <div class="notification-item ${notification.is_read ? 'read' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon" style="background: ${type.color}20; color: ${type.color}">
                ${type.icon}
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
            ${!notification.is_read ? '<div class="notification-unread-dot"></div>' : ''}
        </div>
    `;
}

// ============================================================================
// TOGGLE DROPDOWN
// ============================================================================

function toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (!dropdown) return;
    
    notificationsState.isOpen = !notificationsState.isOpen;
    
    if (notificationsState.isOpen) {
        dropdown.classList.add('active');
    } else {
        dropdown.classList.remove('active');
    }
}

function closeNotificationsDropdown() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (!dropdown) return;
    
    notificationsState.isOpen = false;
    dropdown.classList.remove('active');
}

// ============================================================================
// MARK AS READ
// ============================================================================

async function markAsRead(notificationId) {
    const notification = notificationsState.notifications.find(n => n.id === notificationId);
    if (!notification || notification.is_read) return;
    
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Update in Supabase
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', user.id);
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // Update local state
        notification.is_read = true;
        notificationsState.unreadCount--;
        
        updateNotificationUI();
        
    } catch (error) {
        // For mock data, just update locally
        notification.is_read = true;
        notificationsState.unreadCount--;
        updateNotificationUI();
    }
}

// ============================================================================
// MARK ALL AS READ
// ============================================================================

async function markAllAsRead() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Update in Supabase
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // Update local state
        notificationsState.notifications.forEach(n => n.is_read = true);
        notificationsState.unreadCount = 0;
        
        updateNotificationUI();
        
    } catch (error) {
        // For mock data, just update locally
        notificationsState.notifications.forEach(n => n.is_read = true);
        notificationsState.unreadCount = 0;
        updateNotificationUI();
    }
}

// ============================================================================
// CLEAR ALL NOTIFICATIONS
// ============================================================================

async function clearAllNotifications() {
    if (!confirm('Naozaj chcete vymazať všetky notifikácie?')) return;
    
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Delete from Supabase
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // Update local state
        notificationsState.notifications = [];
        notificationsState.unreadCount = 0;
        
        updateNotificationUI();
        
    } catch (error) {
        // For mock data, just clear locally
        notificationsState.notifications = [];
        notificationsState.unreadCount = 0;
        updateNotificationUI();
    }
}

// ============================================================================
// SETUP REALTIME SUBSCRIPTIONS
// ============================================================================

function setupRealtimeSubscriptions() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Subscribe to new notifications
    supabase
        .channel('notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            },
            (payload) => {
                console.log('🔔 New notification:', payload.new);
                notificationsState.notifications.unshift(payload.new);
                notificationsState.unreadCount++;
                updateNotificationUI();
                
                // Show browser notification if permission granted
                showBrowserNotification(payload.new);
            }
        )
        .subscribe();
}

// ============================================================================
// BROWSER NOTIFICATIONS
// ============================================================================

function showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/css/logo_white_text.svg',
            badge: '/css/favicon.png'
        });
    }
}

// Request browser notification permission
export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ============================================================================
// CREATE NEW NOTIFICATION (helper function)
// ============================================================================

export async function createNotification(type, title, message, metadata = {}) {
    const user = getCurrentUser();
    if (!user) {
        console.warn('⚠️ Cannot create notification: User not logged in');
        return null;
    }
    
    console.log('🔔 Creating notification:', { type, title, message });
    
    try {
        const notificationData = {
            user_id: user.id,
            type: type,
            title: title,
            message: message,
            metadata: metadata,
            is_read: false
        };
        
        const { data, error } = await supabase
            .from('notifications')
            .insert(notificationData)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Supabase error creating notification:', error);
            console.error('   Error code:', error.code);
            console.error('   Error message:', error.message);
            console.error('   Error details:', error.details);
            
            // Add notification locally even if DB insert fails
            const localNotification = {
                id: Date.now(), // Temporary ID
                ...notificationData,
                created_at: new Date().toISOString()
            };
            
            notificationsState.notifications.unshift(localNotification);
            notificationsState.unreadCount++;
            updateNotificationUI();
            
            // Show browser notification
            showBrowserNotification(localNotification);
            
            return localNotification;
        }
        
        console.log('✅ Notification created in DB:', data.id);
        
        // Update local state (will be updated by realtime subscription too, but this is faster)
        notificationsState.notifications.unshift(data);
        notificationsState.unreadCount++;
        updateNotificationUI();
        
        // Show browser notification
        showBrowserNotification(data);
        
        return data;
        
    } catch (error) {
        console.error('❌ Unexpected error creating notification:', error);
        console.error('   Stack:', error.stack);
        
        // Add notification locally as fallback
        const localNotification = {
            id: Date.now(),
            user_id: user.id,
            type: type,
            title: title,
            message: message,
            metadata: metadata,
            is_read: false,
            created_at: new Date().toISOString()
        };
        
        notificationsState.notifications.unshift(localNotification);
        notificationsState.unreadCount++;
        updateNotificationUI();
        showBrowserNotification(localNotification);
        
        return localNotification;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Pred chvíľou';
    if (seconds < 3600) return `Pred ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Pred ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Pred ${Math.floor(seconds / 86400)} d`;
    
    return date.toLocaleDateString('sk-SK', { 
        day: 'numeric', 
        month: 'short'
    });
}
