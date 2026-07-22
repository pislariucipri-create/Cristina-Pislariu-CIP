// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE AUDIT TRAIL SYSTEM
// Tracks all user actions for complete evidence and accountability
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yexvpbgkrzerkizscgfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q52fh6Xa3yNm3q0akTrKKw_7AlxLrCU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Action types for categorization
const ACTION_TYPES = {
    // Patient management
    PATIENT_CREATED: 'patient_created',
    PATIENT_UPDATED: 'patient_updated',
    PATIENT_DELETED: 'patient_deleted',
    PATIENT_ARCHIVED: 'patient_archived',
    PATIENT_RESTORED: 'patient_restored',
    
    // Session management
    SESSION_CREATED: 'session_created',
    SESSION_UPDATED: 'session_updated',
    SESSION_DELETED: 'session_deleted',
    
    // Objective tracking
    OBJECTIVE_COMPLETED: 'objective_completed',
    OBJECTIVE_UNCOMPLETED: 'objective_uncompleted',
    OBJECTIVE_ADDED: 'objective_added',
    OBJECTIVE_DELETED: 'objective_deleted',
    
    // Reports
    REPORT_CREATED: 'report_created',
    REPORT_UPDATED: 'report_updated',
    REPORT_DELETED: 'report_deleted',
    REPORT_VIEWED: 'report_viewed',
    
    // Plans
    PLAN_CREATED: 'plan_created',
    PLAN_UPDATED: 'plan_updated',
    PLAN_DELETED: 'plan_deleted',
    
    // Authentication
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAILED: 'login_failed',
    
    // Data exports
    DATA_EXPORTED: 'data_exported',
    DATA_IMPORTED: 'data_imported',
    
    // System
    SETTINGS_CHANGED: 'settings_changed',
    ERROR_OCCURRED: 'error_occurred'
};

// Log an action to the audit trail
async function logAction(actionType, details = {}) {
    const session = getSession();
    if (!session) return;
    
    const auditEntry = {
        action_type: actionType,
        user_id: session.userId,
        user_email: session.email,
        user_role: session.role,
        patient_id: details.patientId || null,
        patient_name: details.patientName || null,
        action_details: details.details || {},
        ip_address: await getIPAddress(),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        page_url: window.location.href
    };
    
    try {
        await _supabase.from('audit_trail').insert([auditEntry]);
    } catch (error) {
        console.error('Failed to log audit action:', error);
        // Don't throw - audit failures shouldn't break the app
    }
}

// Get client IP address
async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// Helper functions for common actions
async function logPatientCreated(patientId, patientName) {
    await logAction(ACTION_TYPES.PATIENT_CREATED, {
        patientId,
        patientName,
        details: { action: 'Created new patient profile' }
    });
}

async function logPatientUpdated(patientId, patientName, changes) {
    await logAction(ACTION_TYPES.PATIENT_UPDATED, {
        patientId,
        patientName,
        details: { action: 'Updated patient profile', changes }
    });
}

async function logPatientArchived(patientId, patientName) {
    await logAction(ACTION_TYPES.PATIENT_ARCHIVED, {
        patientId,
        patientName,
        details: { action: 'Archived patient profile' }
    });
}

async function logPatientRestored(patientId, patientName) {
    await logAction(ACTION_TYPES.PATIENT_RESTORED, {
        patientId,
        patientName,
        details: { action: 'Restored patient from archive' }
    });
}

async function logSessionCreated(patientId, patientName, sessionDate) {
    await logAction(ACTION_TYPES.SESSION_CREATED, {
        patientId,
        patientName,
        details: { action: 'Created therapy session', sessionDate }
    });
}

async function logSessionUpdated(patientId, patientName, sessionId, changes) {
    await logAction(ACTION_TYPES.SESSION_UPDATED, {
        patientId,
        patientName,
        details: { action: 'Updated therapy session', sessionId, changes }
    });
}

async function logObjectiveCompleted(patientId, patientName, objectiveName) {
    await logAction(ACTION_TYPES.OBJECTIVE_COMPLETED, {
        patientId,
        patientName,
        details: { action: 'Marked objective as completed', objectiveName }
    });
}

async function logReportCreated(patientId, patientName, reportType, reportDate) {
    await logAction(ACTION_TYPES.REPORT_CREATED, {
        patientId,
        patientName,
        details: { action: 'Created report', reportType, reportDate }
    });
}

async function logReportViewed(patientId, patientName, reportType) {
    await logAction(ACTION_TYPES.REPORT_VIEWED, {
        patientId,
        patientName,
        details: { action: 'Viewed report', reportType }
    });
}

async function logLogin(email, success = true) {
    const actionType = success ? ACTION_TYPES.LOGIN : ACTION_TYPES.LOGIN_FAILED;
    await logAction(actionType, {
        details: { action: success ? 'User logged in' : 'Failed login attempt', email }
    });
}

async function logLogout() {
    await logAction(ACTION_TYPES.LOGOUT, {
        details: { action: 'User logged out' }
    });
}

async function logDataExported(dataType, recordCount) {
    await logAction(ACTION_TYPES.DATA_EXPORTED, {
        details: { action: 'Exported data', dataType, recordCount }
    });
}

async function logError(errorType, errorMessage, context = {}) {
    await logAction(ACTION_TYPES.ERROR_OCCURRED, {
        details: { action: 'System error', errorType, errorMessage, context }
    });
}

// Retrieve audit trail for a specific patient
async function getPatientAuditTrail(patientId, limit = 100) {
    try {
        const { data, error } = await _supabase
            .from('audit_trail')
            .select('*')
            .eq('patient_id', patientId)
            .order('timestamp', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Failed to retrieve audit trail:', error);
        return [];
    }
}

// Retrieve audit trail for a specific user
async function getUserAuditTrail(userId, limit = 100) {
    try {
        const { data, error } = await _supabase
            .from('audit_trail')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Failed to retrieve user audit trail:', error);
        return [];
    }
}

// Get system-wide audit trail (admin only)
async function getSystemAuditTrail(limit = 50, offset = 0) {
    const session = getSession();
    if (!session || session.role !== 'psiholog') {
        throw new Error('Unauthorized access to system audit trail');
    }
    
    try {
        const { data, error } = await _supabase
            .from('audit_trail')
            .select('*')
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Failed to retrieve system audit trail:', error);
        return [];
    }
}

// Format audit entry for display
function formatAuditEntry(entry) {
    const date = new Date(entry.timestamp).toLocaleString('ro-RO');
    const actionLabels = {
        patient_created: '✅ Pacient creat',
        patient_updated: '✏️ Pacient actualizat',
        patient_deleted: '🗑️ Pacient șters',
        patient_archived: '📦 Pacient arhivat',
        patient_restored: '♻️ Pacient restaurat',
        session_created: '📋 Ședință creată',
        session_updated: '✏️ Ședință actualizată',
        session_deleted: '🗑️ Ședință ștearsă',
        objective_completed: '🎯 Obiectiv completat',
        objective_uncompleted: '⏪ Obiectiv revenit',
        objective_added: '➕ Obiectiv adăugat',
        objective_deleted: '🗑️ Obiectiv șters',
        report_created: '📝 Raport creat',
        report_updated: '✏️ Raport actualizat',
        report_deleted: '🗑️ Raport șters',
        report_viewed: '👁️ Raport vizualizat',
        plan_created: '📑 Plan creat',
        plan_updated: '✏️ Plan actualizat',
        plan_deleted: '🗑️ Plan șters',
        login: '🔐 Autentificare',
        logout: '🚪 Deconectare',
        login_failed: '❌ Autentificare eșuată',
        data_exported: '📥 Date exportate',
        data_imported: '📤 Date importate',
        settings_changed: '⚙️ Setări modificate',
        error_occurred: '⚠️ Eroare sistem'
    };
    
    return {
        ...entry,
        formattedDate: date,
        actionLabel: actionLabels[entry.action_type] || entry.action_type,
        userDisplay: entry.user_email || 'Unknown'
    };
}

// Auto-wrap common functions with audit logging
function withAuditLogging(originalFunction, actionType, getDetailsFn) {
    return async function(...args) {
        try {
            const result = await originalFunction.apply(this, args);
            const details = getDetailsFn ? getDetailsFn(...args) : {};
            await logAction(actionType, details);
            return result;
        } catch (error) {
            await logError(actionType, error.message, { args });
            throw error;
        }
    };
}

// Export audit trail to CSV
async function exportAuditTrailToCSV(auditData) {
    if (!auditData || auditData.length === 0) {
        throw new Error('No audit data to export');
    }
    
    const headers = ['Data', 'Utilizator', 'Rol', 'Acțiune', 'Pacient', 'Detalii', 'IP', 'Page URL'];
    const rows = auditData.map(entry => {
        const formatted = formatAuditEntry(entry);
        return [
            formatted.formattedDate,
            formatted.user_email,
            formatted.user_role,
            formatted.actionLabel,
            formatted.patient_name || 'N/A',
            JSON.stringify(formatted.action_details),
            formatted.ip_address,
            formatted.page_url
        ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    await logDataExported('audit_trail', auditData.length);
}

// Initialize audit trail on page load
document.addEventListener('DOMContentLoaded', () => {
    const session = getSession();
    if (session) {
        logAction(ACTION_TYPES.LOGIN, {
            details: { action: 'Page loaded', page: window.location.pathname }
        });
    }
});

// Log logout on page unload
window.addEventListener('beforeunload', () => {
    const session = getSession();
    if (session) {
        // Use sendBeacon for reliable logging during page unload
        const data = JSON.stringify({
            action_type: ACTION_TYPES.LOGOUT,
            user_id: session.userId,
            user_email: session.email,
            user_role: session.role,
            timestamp: new Date().toISOString(),
            page_url: window.location.href
        });
        navigator.sendBeacon(`${SUPABASE_URL}/rest/v1/audit_trail`, data);
    }
});
