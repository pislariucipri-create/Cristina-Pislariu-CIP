// ═══════════════════════════════════════════════════════════════
// DATA EXPORT & BACKUP SYSTEM
// Comprehensive data export and backup functionality
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yexvpbgkrzerkizscgfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q52fh6Xa3yNm3q0akTrKKw_7AlxLrCU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Export formats
const EXPORT_FORMATS = {
    JSON: 'json',
    CSV: 'csv',
    PDF: 'pdf'
};

// Export all patient data
async function exportPatientData(patientId, format = EXPORT_FORMATS.JSON) {
    try {
        // Get patient info
        const { data: patient } = await _supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();
        
        if (!patient) throw new Error('Patient not found');
        
        // Get fisa data
        const { data: fisa } = await _supabase
            .from('fisa_data')
            .select('data')
            .eq('patient_id', patientId)
            .maybeSingle();
        
        // Get monthly reports
        const { data: reports } = await _supabase
            .from('monthly_reports')
            .select('*')
            .eq('patient_id', patientId)
            .order('month', { ascending: false });
        
        // Get intervention plan
        const { data: plan } = await _supabase
            .from('intervention_plans')
            .select('*')
            .eq('patient_id', patientId)
            .maybeSingle();
        
        const exportData = {
            patient,
            fisa_data: fisa?.data || [],
            monthly_reports: reports || [],
            intervention_plan: plan || null,
            export_date: new Date().toISOString(),
            exported_by: getSession()?.email
        };
        
        switch (format) {
            case EXPORT_FORMATS.JSON:
                await downloadJSON(exportData, `patient_data_${patient.name.replace(/\s/g, '_')}`);
                break;
            case EXPORT_FORMATS.CSV:
                await downloadCSV(exportData, `patient_data_${patient.name.replace(/\s/g, '_')}`);
                break;
            case EXPORT_FORMATS.PDF:
                await downloadPDF(exportData, `patient_data_${patient.name.replace(/\s/g, '_')}`);
                break;
            default:
                throw new Error('Unsupported export format');
        }
        
        // Log the export
        if (typeof logDataExported === 'function') {
            await logDataExported('patient_data', 1);
        }
        
        return exportData;
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
}

// Export all patients data (admin only)
async function exportAllPatientsData(format = EXPORT_FORMATS.JSON) {
    const session = getSession();
    if (!session || session.role !== 'psiholog') {
        throw new Error('Unauthorized access');
    }
    
    try {
        // Get all patients
        const { data: patients } = await _supabase
            .from('patients')
            .select('*')
            .order('name');
        
        if (!patients) throw new Error('No patients found');
        
        const exportData = {
            patients: [],
            export_date: new Date().toISOString(),
            exported_by: session.email
        };
        
        // Get data for each patient
        for (const patient of patients) {
            const { data: fisa } = await _supabase
                .from('fisa_data')
                .select('data')
                .eq('patient_id', patient.id)
                .maybeSingle();
            
            const { data: reports } = await _supabase
                .from('monthly_reports')
                .select('*')
                .eq('patient_id', patient.id);
            
            exportData.patients.push({
                patient,
                fisa_data: fisa?.data || [],
                monthly_reports: reports || []
            });
        }
        
        switch (format) {
            case EXPORT_FORMATS.JSON:
                await downloadJSON(exportData, 'all_patients_data');
                break;
            case EXPORT_FORMATS.CSV:
                await downloadCSV(exportData, 'all_patients_data');
                break;
            default:
                throw new Error('Unsupported export format');
        }
        
        if (typeof logDataExported === 'function') {
            await logDataExported('all_patients', patients.length);
        }
        
        return exportData;
    } catch (error) {
        console.error('Export all patients failed:', error);
        throw error;
    }
}

// Download as JSON
async function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Download as CSV
async function downloadCSV(data, filename) {
    let csv = '';
    
    // Handle different data structures
    if (data.patient) {
        // Single patient export
        csv = convertPatientToCSV(data);
    } else if (data.patients) {
        // Multiple patients export
        csv = convertAllPatientsToCSV(data);
    } else {
        csv = convertGenericToCSV(data);
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Convert single patient data to CSV
function convertPatientToCSV(data) {
    const rows = [];
    
    // Patient info
    rows.push(['PATIENT INFORMATION']);
    rows.push(['Field', 'Value']);
    rows.push(['Name', data.patient.name]);
    rows.push(['Age', data.patient.age]);
    rows.push(['Email', data.patient.email]);
    rows.push(['Created', data.patient.created_at]);
    rows.push([]);
    
    // Sessions
    rows.push(['SESSIONS']);
    rows.push(['Date', 'Observations', 'Categories Count', 'Objectives Count']);
    (data.fisa_data || []).forEach(session => {
        const objCount = (session.categories || []).reduce((a, c) => a + (c.subItems || []).length, 0);
        rows.push([
            session.date || 'N/A',
            (session.obs || '').replace(/,/g, ';'),
            (session.categories || []).length,
            objCount
        ]);
    });
    rows.push([]);
    
    // Monthly reports
    rows.push(['MONTHLY REPORTS']);
    rows.push(['Month', 'Sessions', 'Status', 'Progress']);
    (data.monthly_reports || []).forEach(report => {
        rows.push([
            report.month,
            report.sedinte || 0,
            report.stare || 'N/A',
            (report.progrese || '').replace(/,/g, ';').substring(0, 50)
        ]);
    });
    
    return rows.map(row => row.join(',')).join('\n');
}

// Convert all patients to CSV
function convertAllPatientsToCSV(data) {
    const rows = [];
    
    rows.push(['ALL PATIENTS DATA']);
    rows.push(['Name', 'Age', 'Email', 'Sessions Count', 'Reports Count', 'Created']);
    
    (data.patients || []).forEach(item => {
        const sessionsCount = (item.fisa_data || []).length;
        const reportsCount = (item.monthly_reports || []).length;
        rows.push([
            item.patient.name,
            item.patient.age,
            item.patient.email,
            sessionsCount,
            reportsCount,
            item.patient.created_at
        ]);
    });
    
    return rows.map(row => row.join(',')).join('\n');
}

// Convert generic data to CSV
function convertGenericToCSV(data) {
    const rows = [];
    const flatten = (obj, prefix = '') => {
        const result = {};
        for (const key in obj) {
            const value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(result, flatten(value, newKey));
            } else if (Array.isArray(value)) {
                result[newKey] = JSON.stringify(value);
            } else {
                result[newKey] = value;
            }
        }
        return result;
    };
    
    const flattened = flatten(data);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);
    
    rows.push(headers);
    rows.push(values);
    
    return rows.map(row => row.join(',')).join('\n');
}

// Download as PDF (using html2pdf)
async function downloadPDF(data, filename) {
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 794px;
        padding: 40px;
        background: white;
        font-family: 'Times New Roman', serif;
    `;
    
    container.innerHTML = generatePDFContent(data);
    document.body.appendChild(container);
    
    try {
        const { default: html2pdf } = await import('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        
        await html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(container).save();
    } catch (error) {
        console.error('PDF generation failed:', error);
        throw new Error('PDF generation not available');
    } finally {
        document.body.removeChild(container);
    }
}

// Generate PDF content
function generatePDFContent(data) {
    if (data.patient) {
        return generatePatientPDF(data);
    } else if (data.patients) {
        return generateAllPatientsPDF(data);
    }
    return '<h1>Data Export</h1><pre>' + JSON.stringify(data, null, 2) + '</pre>';
}

function generatePatientPDF(data) {
    const p = data.patient;
    return `
        <div style="font-family: 'Times New Roman', serif; padding: 40px;">
            <h1 style="text-align: center; border-bottom: 2px solid #81a473; padding-bottom: 20px;">
                Patient Data Export
            </h1>
            <p style="text-align: center; color: #666;">Exported: ${new Date().toLocaleDateString('ro-RO')}</p>
            
            <h2>Patient Information</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f5f5f0;"><strong>Name:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">${p.name}</td></tr>
                <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f5f5f0;"><strong>Age:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">${p.age}</td></tr>
                <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f5f5f0;"><strong>Email:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">${p.email}</td></tr>
            </table>
            
            <h2>Sessions Summary</h2>
            <p>Total Sessions: ${data.fisa_data?.length || 0}</p>
            
            <h2>Reports Summary</h2>
            <p>Total Reports: ${data.monthly_reports?.length || 0}</p>
            
            <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
                Cristina Pîslariu — Cabinet Individual de Psihologie<br>
                Confidential Document — GDPR Compliant
            </div>
        </div>
    `;
}

function generateAllPatientsPDF(data) {
    return `
        <div style="font-family: 'Times New Roman', serif; padding: 40px;">
            <h1 style="text-align: center; border-bottom: 2px solid #81a473; padding-bottom: 20px;">
                All Patients Data Export
            </h1>
            <p style="text-align: center; color: #666;">Exported: ${new Date().toLocaleDateString('ro-RO')}</p>
            <p style="text-align: center; color: #666;">Total Patients: ${data.patients?.length || 0}</p>
            
            <h2>Patient List</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f5f5f0;">
                    <th style="border: 1px solid #ccc; padding: 8px;">Name</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Age</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Email</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Sessions</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Reports</th>
                </tr>
                ${(data.patients || []).map(item => `
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.patient.name}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.patient.age}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.patient.email}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.fisa_data?.length || 0}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.monthly_reports?.length || 0}</td>
                    </tr>
                `).join('')}
            </table>
            
            <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
                Cristina Pîslariu — Cabinet Individual de Psihologie<br>
                Confidential Document — GDPR Compliant
            </div>
        </div>
    `;
}

// Import data from JSON
async function importPatientData(jsonData) {
    const session = getSession();
    if (!session || session.role !== 'psiholog') {
        throw new Error('Unauthorized access');
    }
    
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        if (!data.patient) {
            throw new Error('Invalid data format');
        }
        
        // Check if patient already exists
        const { data: existing } = await _supabase
            .from('patients')
            .select('id')
            .eq('email', data.patient.email)
            .maybeSingle();
        
        if (existing) {
            throw new Error('Patient with this email already exists');
        }
        
        // Insert patient
        const { data: newPatient, error: patientError } = await _supabase
            .from('patients')
            .insert([{
                name: data.patient.name,
                age: data.patient.age,
                email: data.patient.email,
                pass: data.patient.pass,
                photo: data.patient.photo
            }])
            .select()
            .single();
        
        if (patientError) throw patientError;
        
        // Insert fisa data
        if (data.fisa_data && data.fisa_data.length > 0) {
            await _supabase
                .from('fisa_data')
                .insert([{
                    patient_id: newPatient.id,
                    data: data.fisa_data
                }]);
        }
        
        // Insert monthly reports
        if (data.monthly_reports && data.monthly_reports.length > 0) {
            for (const report of data.monthly_reports) {
                await _supabase
                    .from('monthly_reports')
                    .insert([{
                        patient_id: newPatient.id,
                        ...report,
                        id: undefined // Let Supabase generate new ID
                    }]);
            }
        }
        
        // Insert intervention plan
        if (data.intervention_plan) {
            await _supabase
                .from('intervention_plans')
                .insert([{
                    patient_id: newPatient.id,
                    ...data.intervention_plan,
                    id: undefined
                }]);
        }
        
        // Create user account for parent
        await _supabase
            .from('users')
            .insert([{
                email: data.patient.email,
                password: data.patient.pass,
                role: 'parinte'
            }]);
        
        if (typeof logDataImported === 'function') {
            await logDataImported('patient_data', 1);
        }
        
        return newPatient;
    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
}

// Create backup of entire database (admin only)
async function createSystemBackup() {
    const session = getSession();
    if (!session || session.role !== 'psiholog') {
        throw new Error('Unauthorized access');
    }
    
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            backup_by: session.email,
            tables: {}
        };
        
        // Backup all tables
        const tables = ['patients', 'users', 'fisa_data', 'monthly_reports', 'intervention_plans', 'archived_patients', 'audit_trail'];
        
        for (const table of tables) {
            const { data } = await _supabase.from(table).select('*');
            backup.tables[table] = data || [];
        }
        
        await downloadJSON(backup, `system_backup_${new Date().toISOString().split('T')[0]}`);
        
        if (typeof logDataExported === 'function') {
            await logDataExported('system_backup', 1);
        }
        
        return backup;
    } catch (error) {
        console.error('Backup failed:', error);
        throw error;
    }
}

// Restore from backup (admin only)
async function restoreFromBackup(backupData) {
    const session = getSession();
    if (!session || session.role !== 'psiholog') {
        throw new Error('Unauthorized access');
    }
    
    try {
        const backup = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
        
        if (!backup.tables) {
            throw new Error('Invalid backup format');
        }
        
        // Restore each table
        for (const tableName in backup.tables) {
            const data = backup.tables[tableName];
            if (data && data.length > 0) {
                // Clear existing data
                await _supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                
                // Insert backup data
                await _supabase.from(tableName).insert(data);
            }
        }
        
        if (typeof logDataImported === 'function') {
            await logDataImported('system_restore', 1);
        }
        
        return true;
    } catch (error) {
        console.error('Restore failed:', error);
        throw error;
    }
}

// Show export modal
function showExportModal(patientId = null) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 2rem; max-width: 400px; width: 90%;">
            <h2 style="font-family: 'Cormorant Garamond', serif; margin-bottom: 1.5rem;">Export Date</h2>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 700;">Format:</label>
                <select id="exportFormat" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="this.closest('div[style*=\"fixed\"]').remove()" style="flex: 1; padding: 10px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer;">Anulează</button>
                <button onclick="executeExport('${patientId || 'all'}')" style="flex: 1; padding: 10px; background: #81a473; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">Exportă</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function executeExport(scope) {
    const format = document.getElementById('exportFormat').value;
    const modal = document.querySelector('div[style*="fixed"]');
    
    try {
        if (scope === 'all') {
            await exportAllPatientsData(format);
        } else {
            await exportPatientData(scope, format);
        }
        modal.remove();
        showToast('Export realizat cu succes!', '✅');
    } catch (error) {
        showToast('Eroare la export: ' + error.message, '❌');
    }
}

// Make functions globally available
window.showExportModal = showExportModal;
window.executeExport = executeExport;
