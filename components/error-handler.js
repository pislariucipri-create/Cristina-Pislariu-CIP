// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE ERROR HANDLING SYSTEM
// Centralized error handling, logging, and user feedback
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yexvpbgkrzerkizscgfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q52fh6Xa3yNm3q0akTrKKw_7AlxLrCU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Error types
const ERROR_TYPES = {
    NETWORK: 'network_error',
    VALIDATION: 'validation_error',
    AUTHENTICATION: 'authentication_error',
    AUTHORIZATION: 'authorization_error',
    DATABASE: 'database_error',
    NOT_FOUND: 'not_found',
    CONFLICT: 'conflict',
    SERVER: 'server_error',
    UNKNOWN: 'unknown_error'
};

// Error severity levels
const SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Custom error class
class AppError extends Error {
    constructor(message, type = ERROR_TYPES.UNKNOWN, severity = SEVERITY.MEDIUM, details = {}) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.severity = severity;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.userMessage = this.getUserMessage();
    }
    
    getUserMessage() {
        const messages = {
            [ERROR_TYPES.NETWORK]: 'Probleme de conexiune. Verifică internetul și încearcă din nou.',
            [ERROR_TYPES.VALIDATION]: 'Datele introduse nu sunt valide. Te rugăm să verifici.',
            [ERROR_TYPES.AUTHENTICATION]: 'Nu ești autentificat. Te rugăm să te loghezi.',
            [ERROR_TYPES.AUTHORIZATION]: 'Nu ai permisiunea pentru această acțiune.',
            [ERROR_TYPES.DATABASE]: 'Eroare la salvarea datelor. Încearcă din nou.',
            [ERROR_TYPES.NOT_FOUND]: 'Informația nu a fost găsită.',
            [ERROR_TYPES.CONFLICT]: 'Există un conflict cu datele existente.',
            [ERROR_TYPES.SERVER]: 'Eroare de server. Încearcă din nou mai târziu.',
            [ERROR_TYPES.UNKNOWN]: 'A apărut o eroare neașteptată.'
        };
        return messages[this.type] || messages[ERROR_TYPES.UNKNOWN];
    }
}

// Error handler class
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.errorCallbacks = [];
    }
    
    // Handle an error
    async handle(error, context = {}) {
        const appError = this.normalizeError(error);
        
        // Add context
        appError.context = {
            page: window.location.pathname,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ...context
        };
        
        // Log error
        this.errorLog.push(appError);
        
        // Log to Supabase
        await this.logToSupabase(appError);
        
        // Notify callbacks
        this.notifyCallbacks(appError);
        
        // Show user feedback
        this.showErrorToUser(appError);
        
        return appError;
    }
    
    // Normalize error to AppError
    normalizeError(error) {
        if (error instanceof AppError) return error;
        
        let type = ERROR_TYPES.UNKNOWN;
        let severity = SEVERITY.MEDIUM;
        let details = {};
        
        // Determine error type from error message or properties
        if (error.message) {
            const message = error.message.toLowerCase();
            
            if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
                type = ERROR_TYPES.NETWORK;
                severity = SEVERITY.HIGH;
            } else if (message.includes('auth') || message.includes('login') || message.includes('credential')) {
                type = ERROR_TYPES.AUTHENTICATION;
                severity = SEVERITY.HIGH;
            } else if (message.includes('permission') || message.includes('authorized') || message.includes('access')) {
                type = ERROR_TYPES.AUTHORIZATION;
                severity = SEVERITY.MEDIUM;
            } else if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
                type = ERROR_TYPES.VALIDATION;
                severity = SEVERITY.LOW;
            } else if (message.includes('not found') || message.includes('404')) {
                type = ERROR_TYPES.NOT_FOUND;
                severity = SEVERITY.LOW;
            } else if (message.includes('conflict') || message.includes('duplicate') || message.includes('exists')) {
                type = ERROR_TYPES.CONFLICT;
                severity = SEVERITY.MEDIUM;
            } else if (message.includes('database') || message.includes('sql') || message.includes('constraint')) {
                type = ERROR_TYPES.DATABASE;
                severity = SEVERITY.HIGH;
            } else if (message.includes('server') || message.includes('500') || message.includes('internal')) {
                type = ERROR_TYPES.SERVER;
                severity = SEVERITY.CRITICAL;
            }
        }
        
        // Check for Supabase specific errors
        if (error.code) {
            details.code = error.code;
            if (error.code === 'PGRST116') {
                type = ERROR_TYPES.NOT_FOUND;
            } else if (error.code.startsWith('235')) {
                type = ERROR_TYPES.DATABASE;
            }
        }
        
        if (error.details) {
            details = { ...details, ...error.details };
        }
        
        return new AppError(
            error.message || 'Unknown error occurred',
            type,
            severity,
            details
        );
    }
    
    // Log error to Supabase
    async logToSupabase(error) {
        try {
            const session = getSession();
            await _supabase.from('error_logs').insert([{
                error_type: error.type,
                severity: error.severity,
                message: error.message,
                user_message: error.userMessage,
                details: error.details,
                context: error.context,
                user_id: session?.userId || null,
                user_email: session?.email || null,
                user_role: session?.role || null,
                stack_trace: error.stack,
                created_at: error.timestamp
            }]);
        } catch (logError) {
            console.error('Failed to log error to Supabase:', logError);
        }
    }
    
    // Register callback for errors
    onError(callback) {
        this.errorCallbacks.push(callback);
        return () => {
            this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
        };
    }
    
    // Notify all callbacks
    notifyCallbacks(error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (callbackError) {
                console.error('Error callback failed:', callbackError);
            }
        });
    }
    
    // Show error to user
    showErrorToUser(error) {
        // Don't show low severity errors to user
        if (error.severity === SEVERITY.LOW) return;
        
        const toast = document.createElement('div');
        toast.className = `error-toast error-${error.severity}`;
        
        const icons = {
            [SEVERITY.LOW]: '⚠️',
            [SEVERITY.MEDIUM]: '⚠️',
            [SEVERITY.HIGH]: '❌',
            [SEVERITY.CRITICAL]: '🚨'
        };
        
        toast.innerHTML = `
            <div class="error-icon">${icons[error.severity] || '⚠️'}</div>
            <div class="error-content">
                <div class="error-title">Eroare</div>
                <div class="error-message">${error.userMessage}</div>
            </div>
            <button class="error-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to DOM
        let container = document.getElementById('error-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'error-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
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
        
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 8000);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.animation = 'slideIn 0.3s ease-out';
        });
    }
    
    // Get error statistics
    getErrorStats() {
        const stats = {
            total: this.errorLog.length,
            byType: {},
            bySeverity: {},
            recent: this.errorLog.slice(-10)
        };
        
        this.errorLog.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });
        
        return stats;
    }
    
    // Clear error log
    clearLog() {
        this.errorLog = [];
    }
}

// Global error handler instance
const errorHandler = new ErrorHandler();

// Wrap async functions with error handling
function withErrorHandling(asyncFn, context = {}) {
    return async function(...args) {
        try {
            return await asyncFn.apply(this, args);
        } catch (error) {
            await errorHandler.handle(error, context);
            throw error; // Re-throw for further handling if needed
        }
    };
}

// Safe async function that doesn't throw
async function safeAsync(asyncFn, defaultValue = null, context = {}) {
    try {
        return await asyncFn();
    } catch (error) {
        await errorHandler.handle(error, context);
        return defaultValue;
    }
}

// Supabase wrapper with error handling
async function safeSupabaseQuery(queryFn, context = {}) {
    try {
        const result = await queryFn();
        
        if (result.error) {
            throw result.error;
        }
        
        return result.data;
    } catch (error) {
        await errorHandler.handle(error, { ...context, operation: 'supabase_query' });
        throw error;
    }
}

// Validation helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
        throw new AppError('Email invalid', ERROR_TYPES.VALIDATION, SEVERITY.LOW, { field: 'email', value: email });
    }
    return true;
}

function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        throw new AppError(`${fieldName} este obligatoriu`, ERROR_TYPES.VALIDATION, SEVERITY.LOW, { field: fieldName });
    }
    return true;
}

function validateNumber(value, fieldName, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        throw new AppError(`${fieldName} trebuie să fie un număr`, ERROR_TYPES.VALIDATION, SEVERITY.LOW, { field: fieldName });
    }
    if (min !== null && num < min) {
        throw new AppError(`${fieldName} trebuie să fie cel puțin ${min}`, ERROR_TYPES.VALIDATION, SEVERITY.LOW, { field: fieldName, min });
    }
    if (max !== null && num > max) {
        throw new AppError(`${fieldName} trebuie să fie cel mult ${max}`, ERROR_TYPES.VALIDATION, SEVERITY.LOW, { field: fieldName, max });
    }
    return num;
}

// Add error styles
function addErrorStyles() {
    if (document.getElementById('error-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'error-styles';
    style.textContent = `
        .error-toast {
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
        
        .error-toast.error-low {
            border-left: 4px solid #FF9800;
        }
        
        .error-toast.error-medium {
            border-left: 4px solid #FF9800;
        }
        
        .error-toast.error-high {
            border-left: 4px solid #F44336;
        }
        
        .error-toast.error-critical {
            border-left: 4px solid #D32F2F;
            background: #FFEBEE;
        }
        
        .error-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
        }
        
        .error-content {
            flex: 1;
        }
        
        .error-title {
            font-weight: 700;
            margin-bottom: 0.3rem;
            color: #333;
        }
        
        .error-message {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .error-close {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: #999;
            padding: 0;
            line-height: 1;
        }
        
        .error-close:hover {
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
    `;
    
    document.head.appendChild(style);
}

// Initialize error handling
document.addEventListener('DOMContentLoaded', () => {
    addErrorStyles();
    
    // Global error handler
    window.addEventListener('error', (event) => {
        errorHandler.handle(event.error, {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        errorHandler.handle(event.reason, {
            promise: true
        });
    });
});

// Export for use in other modules
window.errorHandler = errorHandler;
window.withErrorHandling = withErrorHandling;
window.safeAsync = safeAsync;
window.safeSupabaseQuery = safeSupabaseQuery;
window.validateEmail = validateEmail;
window.validateRequired = validateRequired;
window.validateNumber = validateNumber;
