// ═══════════════════════════════════════════════════════════════
// NOTIFICATION & ALERT SYSTEM
// Real-time notifications for important events and reminders
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yexvpbgkrzerkizscgfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q52fh6Xa3yNm3q0akTrKKw_7AlxLrCU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Notification types
const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    REMINDER: 'reminder',
    ALERT: 'alert'
};

// Notification priority levels
const PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

// In-memory notification store
let notifications = [];
let notificationCallbacks = [];

// Create a notification
async function createNotification(type, title, message, priority = PRIORITY.MEDIUM, metadata = {}) {
    const session = getSession();
    if (!session) return;
    
    const notification = {
        id: generateId(),
        type,
        title,
        message,
        priority,
        user_id: session.userId,
        user_email: session.email,
        user_role: session.role,
        metadata,
        created_at: new Date().toISOString(),
        read: false,
        dismissed: false
    };
    
    // Add to local store
    notifications.unshift(notification);
    
    // Save to Supabase
    try {
        await _supabase.from('notifications').insert([notification]);
    } catch (error) {
        console.error('Failed to save notification:', error);
    }
    
    // Trigger callbacks
    notifyCallbacks(notification);
    
    // Show in-app notification
    showInAppNotification(notification);
    
    return notification;
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Register callback for new notifications
function onNotification(callback) {
    notificationCallbacks.push(callback);
    return () => {
        notificationCallbacks = notificationCallbacks.filter(cb => cb !== callback);
    };
}

// Notify all registered callbacks
function notifyCallbacks(notification) {
    notificationCallbacks.forEach(callback => {
        try {
            callback(notification);
        } catch (error) {
            console.error('Notification callback error:', error);
        }
    });
}

// Show in-app notification (toast/banner)
function showInAppNotification(notification) {
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${notification.type} notification-${notification.priority}`;
    
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        reminder: '🔔',
        alert: '🚨'
    };
    
    toast.innerHTML = `
        <div class="notification-icon">${icons[notification.type] || '📢'}</div>
        <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
        </div>
        <button class="notification-close" onclick="dismissNotification('${notification.id}')">×</button>
    `;
    
    // Add to DOM
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    // Auto-dismiss after 5 seconds for non-urgent notifications
    if (notification.priority !== PRIORITY.URGENT) {
        setTimeout(() => dismissNotification(notification.id), 5000);
    }
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.animation = 'slideIn 0.3s ease-out';
    });
}

// Dismiss a notification
async function dismissNotification(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    notification.dismissed = true;
    notification.read = true;
    
    // Update UI
    const toast = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (toast) {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }
    
    // Update in Supabase
    try {
        await _supabase
            .from('notifications')
            .update({ read: true, dismissed: true })
            .eq('id', notificationId);
    } catch (error) {
        console.error('Failed to dismiss notification:', error);
    }
}

// Mark notification as read
async function markAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    notification.read = true;
    
    try {
        await _supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

// Get unread notifications count
function getUnreadCount() {
    return notifications.filter(n => !n.read && !n.dismissed).length;
}

// Load notifications from Supabase
async function loadNotifications() {
    const session = getSession();
    if (!session) return;
    
    try {
        const { data, error } = await _supabase
            .from('notifications')
            .select('*')
            .eq('user_id', session.userId)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        notifications = data || [];
        updateNotificationBadge();
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

// Update notification badge in navigation
function updateNotificationBadge() {
    const unreadCount = getUnreadCount();
    const badge = document.getElementById('notification-badge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Helper functions for common notifications
async function notifySuccess(title, message) {
    return createNotification(NOTIFICATION_TYPES.SUCCESS, title, message, PRIORITY.MEDIUM);
}

async function notifyError(title, message) {
    return createNotification(NOTIFICATION_TYPES.ERROR, title, message, PRIORITY.HIGH);
}

async function notifyWarning(title, message) {
    return createNotification(NOTIFICATION_TYPES.WARNING, title, message, PRIORITY.MEDIUM);
}

async function notifyInfo(title, message) {
    return createNotification(NOTIFICATION_TYPES.INFO, title, message, PRIORITY.LOW);
}

async function notifyReminder(title, message, scheduledFor) {
    return createNotification(NOTIFICATION_TYPES.REMINDER, title, message, PRIORITY.MEDIUM, { scheduledFor });
}

async function notifyAlert(title, message) {
    return createNotification(NOTIFICATION_TYPES.ALERT, title, message, PRIORITY.URGENT);
}

// Session reminders
async function scheduleSessionReminder(patientId, patientName, sessionDate) {
    const sessionDateObj = new Date(sessionDate);
    const now = new Date();
    const timeUntilSession = sessionDateObj - now;
    
    // Reminder 1 day before
    const oneDayBefore = new Date(sessionDateObj);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    
    if (oneDayBefore > now) {
        setTimeout(() => {
            notifyReminder(
                'Reminder Ședință',
                `Ședința pentru ${patientName} este programată mâine la ${sessionDateObj.toLocaleTimeString('ro-RO')}`
            );
        }, oneDayBefore - now);
    }
    
    // Reminder 1 hour before
    const oneHourBefore = new Date(sessionDateObj);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    if (oneHourBefore > now) {
        setTimeout(() => {
            notifyAlert(
                'Ședință în curând',
                `Ședința pentru ${patientName} începe în 1 oră!`
            );
        }, oneHourBefore - now);
    }
}

// Monthly report reminder
async function scheduleMonthlyReportReminder(patientId, patientName, month) {
    const lastDayOfMonth = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0);
    const reminderDate = new Date(lastDayOfMonth);
    reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before month end
    
    const now = new Date();
    if (reminderDate > now) {
        setTimeout(() => {
            notifyReminder(
                'Raport Lunar',
                `Completează raportul lunar pentru ${patientName} până la sfârșitul lunii`
            );
        }, reminderDate - now);
    }
}

// Show notification center modal
function showNotificationCenter() {
    let modal = document.getElementById('notification-center-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notification-center-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div class="notification-center-content" style="
                background: white;
                border-radius: 20px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
            ">
                <button onclick="closeNotificationCenter()" style="
                    position: absolute;
                    right: 20px;
                    top: 20px;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                ">×</button>
                <h2 style="font-family: 'Cormorant Garamond', serif; margin-bottom: 1.5rem;">Notificări</h2>
                <div id="notification-list"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    renderNotificationList();
    modal.style.display = 'flex';
}

function closeNotificationCenter() {
    const modal = document.getElementById('notification-center-modal');
    if (modal) modal.style.display = 'none';
}

function renderNotificationList() {
    const list = document.getElementById('notification-list');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999;">Nicio notificare.</p>';
        return;
    }
    
    list.innerHTML = notifications.map(notification => {
        const date = new Date(notification.created_at).toLocaleString('ro-RO');
        const typeColors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336',
            reminder: '#9C27B0',
            alert: '#F44336'
        };
        
        return `
            <div class="notification-item" style="
                padding: 1rem;
                border-left: 4px solid ${typeColors[notification.type] || '#999'};
                background: ${notification.read ? '#f5f5f5' : 'white'};
                margin-bottom: 0.5rem;
                border-radius: 8px;
                cursor: pointer;
                ${!notification.read ? 'font-weight: 600;' : ''}
            " onclick="markAsRead('${notification.id}'); renderNotificationList();">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                    <strong>${notification.title}</strong>
                    <span style="font-size: 0.8rem; color: #999;">${date}</span>
                </div>
                <div style="color: #666;">${notification.message}</div>
            </div>
        `;
    }).join('');
}

// Add notification bell to navigation
function addNotificationBell() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    const bellItem = document.createElement('li');
    bellItem.innerHTML = `
        <a href="javascript:void(0)" onclick="showNotificationCenter()" style="position: relative;">
            🔔
            <span id="notification-badge" style="
                position: absolute;
                top: -5px;
                right: -5px;
                background: #F44336;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.7rem;
                display: none;
                align-items: center;
                justify-content: center;
            ">0</span>
        </a>
    `;
    
    navLinks.appendChild(bellItem);
}

// Add CSS for notifications
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification-toast {
            background: white;
            border-radius: 12px;
            padding: 1rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-width: 300px;
            animation: slideIn 0.3s ease-out;
        }
        
        .notification-toast.notification-urgent {
            border-left: 4px solid #F44336;
        }
        
        .notification-toast.notification-high {
            border-left: 4px solid #FF9800;
        }
        
        .notification-toast.notification-medium {
            border-left: 4px solid #2196F3;
        }
        
        .notification-toast.notification-low {
            border-left: 4px solid #4CAF50;
        }
        
        .notification-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
        }
        
        .notification-content {
            flex: 1;
        }
        
        .notification-title {
            font-weight: 700;
            margin-bottom: 0.3rem;
            color: #333;
        }
        
        .notification-message {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: #999;
            padding: 0;
            line-height: 1;
        }
        
        .notification-close:hover {
            color: #333;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize notification system
document.addEventListener('DOMContentLoaded', () => {
    addNotificationStyles();
    loadNotifications();
    
    // Add notification bell if user is logged in
    const session = getSession();
    if (session) {
        setTimeout(addNotificationBell, 100);
    }
});

// Make functions globally available
window.dismissNotification = dismissNotification;
window.showNotificationCenter = showNotificationCenter;
window.closeNotificationCenter = closeNotificationCenter;
