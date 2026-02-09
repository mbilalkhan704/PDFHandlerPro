// Global state
const state = {
    uploadedFiles: [],
    currentOperation: null
};

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const selectFileBtn = document.getElementById('selectFileBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const filesContainer = document.getElementById('filesContainer');
const operationModal = document.getElementById('operationModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const toastContainer = document.getElementById('toastContainer');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadFiles();
});

// Event Listeners
function initializeEventListeners() {
    // Mobile navigation
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Smooth scroll for navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            target.scrollIntoView({ behavior: 'smooth' });
            navMenu.classList.remove('active');
        });
    });

    // File input
    selectFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', (e) => {
        if (e.target === uploadArea || e.target.closest('.upload-content')) {
            fileInput.click();
        }
    });
}

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
    if (files.length > 0) {
        uploadFiles(files);
    } else {
        showToast('Please drop PDF files only', 'error');
    }
}

// File Selection Handler
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
    e.target.value = '';
}

// Upload Files
async function uploadFiles(files) {
    uploadProgress.classList.remove('hidden');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        try {
            progressText.textContent = `Uploading ${file.name}... (${i + 1}/${files.length})`;
            progressFill.style.width = `${((i + 1) / files.length) * 100}%`;

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                showToast(`${file.name} uploaded successfully`, 'success');
                state.uploadedFiles.push(data.filename);
            } else {
                showToast(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            showToast(`Error uploading ${file.name}`, 'error');
            console.error(error);
        }
    }

    uploadProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    loadFiles();
}

// Load Files
async function loadFiles() {
    try {
        const response = await fetch('/list-files');
        const data = await response.json();

        if (response.ok && data.files.length > 0) {
            displayFiles(data.files);
        } else {
            filesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No files uploaded yet</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

// Display Files
function displayFiles(files) {
    filesContainer.innerHTML = `
        <div class="file-list">
            ${files.map(file => `
                <div class="file-item">
                    <div class="file-info">
                        <i class="fas fa-file-pdf file-icon"></i>
                        <div class="file-details">
                            <h4>${file.name}</h4>
                            <span class="file-size">${formatFileSize(file.size)}</span>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn-icon" onclick="viewFileMetadata('${file.name}')" title="View Metadata">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteFile('${file.name}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Show Operation Modal
function showOperation(operation) {
    state.currentOperation = operation;
    const operations = {
        'metadata': showMetadataOperation,
        'edit-metadata': showEditMetadataOperation,
        'merge': showMergeOperation,
        'split': showSplitOperation,
        'encrypt': showEncryptOperation,
        'decrypt': showDecryptOperation,
        'extract-text': showExtractTextOperation
    };

    if (operations[operation]) {
        operations[operation]();
        operationModal.classList.add('active');
    }
}

// Close Modal
function closeModal() {
    operationModal.classList.remove('active');
    state.currentOperation = null;
}

// Metadata Operation
function showMetadataOperation() {
    modalTitle.textContent = 'View PDF Metadata';
    modalBody.innerHTML = `
        <div class="form-group">
            <label class="form-label">Select PDF File</label>
            <select class="form-select" id="metadataFile">
                <option value="">-- Select a file --</option>
                ${state.uploadedFiles.map(file => `<option value="${file}">${file}</option>`).join('')}
            </select>
        </div>
        <button class="btn btn-primary" onclick="viewMetadata()">
            <i class="fas fa-eye"></i>
            View Metadata
        </button>
        <div id="metadataResult" class="mt-3"></div>
    `;
}

async function viewMetadata() {
    const filename = document.getElementById('metadataFile').value;
    if (!filename) {
        showToast('Please select a file', 'warning');
        return;
    }

    try {
        const response = await fetch('/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        const data = await response.json();

        if (response.ok) {
            const resultDiv = document.getElementById('metadataResult');
            resultDiv.innerHTML = `
                <div style="background: var(--light-color); padding: 1.5rem; border-radius: 0.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary-color);">
                        <i class="fas fa-info-circle"></i> Metadata Information
                    </h4>
                    ${Object.entries(data.metadata).map(([key, value]) => `
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                            <strong>${key}:</strong>
                            <span>${value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            showToast(data.error || 'Failed to read metadata', 'error');
        }
    } catch (error) {
        showToast('Error reading metadata', 'error');
        console.error(error);
    }
}

async function viewFileMetadata(filename) {
    state.uploadedFiles = [filename];
    showOperation('metadata');
    setTimeout(() => {
        document.getElementById('metadataFile').value = filename;
        viewMetadata();
    }, 100);
}

// Edit Metadata Operation
function showEditMetadataOperation() {
    modalTitle.textContent = 'Edit PDF Metadata';
    modalBody.innerHTML = `
        <div class="form-group">
            <label class="form-label">Select PDF File</label>
            <select class="form-select" id="editMetadataFile">
                <option value="">-- Select a file --</option>
                ${state.uploadedFiles.map(file => `<option value="${file}">${file}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="form-input" id="metaTitle" placeholder="Enter title">
        </div>
        <div class="form-group">
            <label class="form-label">Author</label>
            <input type="text" class="form-input" id="metaAuthor" placeholder="Enter author">
        </div>
        <div class="form-group">
            <label class="form-label">Subject</label>
            <input type="text" class="form-input" id="metaSubject" placeholder="Enter subject">
        </div>
        <div class="form-group">
            <label class="form-label">Creator</label>
            <input type="text" class="form-input" id="metaCreator" placeholder="Enter creator">
        </div>
        <button class="btn btn-primary" onclick="updateMetadata()">
            <i class="fas fa-save"></i>
            Update Metadata
        </button>
    `;
}

async function updateMetadata() {
    const filename = document.getElementById('editMetadataFile').value;
    if (!filename) {
        showToast('Please select a file', 'warning');
        return;
    }

    const metadata = {
        '/Title': document.getElementById('metaTitle').value,
        '/Author': document.getElementById('metaAuthor').value,
        '/Subject': document.getElementById('metaSubject').value,
        '/Creator': document.getElementById('metaCreator').value
    };

    try {
        const response = await fetch('/write-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, metadata })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Metadata updated successfully', 'success');
            downloadFile(data.filename);
        } else {
            showToast(data.error || 'Failed to update metadata', 'error');
        }
    } catch (error) {
        showToast('Error updating metadata', 'error');
        console.error(error);
    }
}

// Merge Operation
function showMergeOperation() {
    modalTitle.textContent = 'Merge PDF Files';
    modalBody.innerHTML = `
        <div class="form-group">
            <label class="form-label">Select files to merge (in order)</label>
            <div id="mergeFilesList" style="max-height: 300px; overflow-y: auto;">
                ${state.uploadedFiles.map((file, index) => `
                    <div class="form-checkbox" style="padding: 0.5rem; background: var(--light-color); margin-bottom: 0.5rem; border-radius: 0.5rem;">
                        <input type="checkbox" id="merge_${index}" value="${file}">
                        <label for="merge_${index}" style="cursor: pointer; flex: 1;">${file}</label>
                    </div>
                `).join('')}
            </div>
        </div>
        <button class="btn btn-primary" onclick="mergePDFs()">
            <i class="fas fa-object-group"></i>
            Merge PDFs
        </button>
    `;
}

async function mergePDFs() {
    const checkboxes = document.querySelectorAll('#mergeFilesList input[type="checkbox"]:checked');
    const filenames = Array.from(checkboxes).map(cb => cb.value);

    if (filenames.length < 2) {
        showToast('Please select at least 2 files to merge', 'warning');
        return;
    }

    try {
        const response = await fetch('/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            downloadFile(data.filename);
            closeModal();
        } else {
            showToast(data.error || 'Failed to merge PDFs', 'error');
        }
    } catch (error) {
        showToast('Error merging PDFs', 'error');
        console.error(error);
    }
}

// Split Operation
function showSplitOperation() {
    modalTitle.textContent = 'Split PDF into Pages';
    modalBody.innerHTML = `
        <div class="form-group">
            <label class="form-label">Select PDF File</label>
            <select class="form-select" id="splitFile">
                <option value="">-- Select a file --</option>
                ${state.uploadedFiles.map(file => `<option value="${file}">${file}</option>`).join('')}
            </select>
        </div>
        <p class="text-gray">This will split the PDF into individual page files.</p>
        <button class="btn btn-primary" onclick="splitPDF()">
            <i class="fas fa-cut"></i>
            Split PDF
        </button>
    `;
}

async function splitPDF() {
    const filename = document.getElementById('splitFile').value;
    if (!filename) {
        showToast('Please select a file', 'warning');
        return;
    }

    try {
        const response = await fetch('/split', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            
            // Download all split files
            for (const file of data.files) {
                await new Promise(resolve => setTimeout(resolve, 500));
                downloadFile(file);
            }
            closeModal();
        } else {
            showToast(data.error || 'Failed to split PDF', 'error');
        }
    } catch (error) {
        showToast('Error splitting PDF', 'error');
        console.error(error);
    }
}

// Encrypt Operation
function showEncryptOperation() {
    modalTitle.textContent = 'Encrypt PDF with Password';
    modalBody.innerHTML = `
        <div class="form-group">
            <label class="form-label">Select PDF File</label>
            <select class="form-select" id="encryptFile">
                <option value="">-- Select a file --</option>
                ${state.uploadedFiles.map(file => `<option value="${file}">${file}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="encryptPassword" placeholder="Enter password">
        </div>
        <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input type="password" class="form-input" id="encryptPasswordConfirm" placeholder="Confirm password">
        </div>
        <button class="btn btn-primary" onclick="encryptPDF()">
            <i class="fas fa-lock"></i>
            Encrypt PDF
        </button>
    `;
}

async function encryptPDF() {
    const filename = document.getElementById('encryptFile').value;
    const password = document.getElementById('encryptPassword').value;
    const confirmPassword = document.getElementById('encryptPasswordConfirm').value;

    if (!filename) {
        showToast('Please select a file', 'warning');
        return;
    }

    if (!password) {
        showToast('Please enter a password', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch('/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('PDF encrypted successfully', 'success');
            downloadFile(data.filename);
            closeModal();
        } else {
            showToast(data.error || 'Failed to encrypt PDF', 'error');
        }
    } catch (error) {
        showToast('Error encrypting PDF', 'error');
        console.error(error);
    }
}

// Decrypt Operation
function showDecryptOperation() {
    modalTitle.textContent = 'Decrypt PDF';
    modalBody.innerHTML = `
        <div class="form-group">
            <label class="form-label">Select Encrypted PDF File</label>
            <select class="form-select" id="decryptFile">
                <option value="">-- Select a file --</option>
                ${state.uploadedFiles.map(file => `<option value="${file}">${file}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="decryptPassword" placeholder="Enter password">
        </div>
        <button class="btn btn-primary" onclick="decryptPDF()">
            <i class="fas fa-unlock"></i>
            Decrypt PDF
        </button>
    `;
}

async function decryptPDF() {
    const filename = document.getElementById('decryptFile').value;
    const password = document.getElementById('decryptPassword').value;

    if (!filename) {
        showToast('Please select a file', 'warning');
        return;
    }

    if (!password) {
        showToast('Please enter a password', 'warning');
        return;
    }

    try {
        const response = await fetch('/decrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('PDF decrypted successfully', 'success');
            downloadFile(data.filename);
            closeModal();
        } else {
            showToast(data.error || 'Failed to decrypt PDF', 'error');
        }
    } catch (error) {
        showToast('Error decrypting PDF', 'error');
        console.error(error);
    }
}

// Extract Text Operation
function showExtractTextOperation() {
    modalTitle.textContent = 'Extract Text from PDF';
    modalBody.innerHTML = `
        <div class="form-group">
            <label class="form-label">Select PDF File</label>
            <select class="form-select" id="extractFile" onchange="loadPDFPages()">
                <option value="">-- Select a file --</option>
                ${state.uploadedFiles.map(file => `<option value="${file}">${file}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Pages to Extract (leave empty for all pages)</label>
            <input type="text" class="form-input" id="extractPages" placeholder="e.g., 0,1,2 (0-indexed)">
            <small class="text-gray">Enter page numbers separated by commas, or leave empty for all pages</small>
        </div>
        <button class="btn btn-primary" onclick="extractText()">
            <i class="fas fa-file-alt"></i>
            Extract Text
        </button>
        <div id="extractResult" class="mt-3"></div>
    `;
}

async function extractText() {
    const filename = document.getElementById('extractFile').value;
    const pagesInput = document.getElementById('extractPages').value;

    if (!filename) {
        showToast('Please select a file', 'warning');
        return;
    }

    let pages = [];
    if (pagesInput.trim()) {
        pages = pagesInput.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    }

    try {
        const response = await fetch('/extract-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, pages })
        });

        const data = await response.json();

        if (response.ok) {
            const resultDiv = document.getElementById('extractResult');
            resultDiv.innerHTML = `
                <div style="background: var(--light-color); padding: 1.5rem; border-radius: 0.5rem; max-height: 400px; overflow-y: auto;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary-color);">
                        <i class="fas fa-file-alt"></i> Extracted Text
                    </h4>
                    ${Object.entries(data.text).map(([page, text]) => `
                        <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
                            <h5 style="color: var(--secondary-color); margin-bottom: 0.5rem;">Page ${page}</h5>
                            <pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.875rem; color: var(--dark-color);">${text}</pre>
                        </div>
                    `).join('')}
                </div>
            `;
            showToast(data.message, 'success');
        } else {
            showToast(data.error || 'Failed to extract text', 'error');
        }
    } catch (error) {
        showToast('Error extracting text', 'error');
        console.error(error);
    }
}

// Download File
function downloadFile(filename) {
    window.open(`/download/${filename}`, '_blank');
}

// Delete File (placeholder - would need backend endpoint)
function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
        state.uploadedFiles = state.uploadedFiles.filter(f => f !== filename);
        loadFiles();
        showToast('File removed from list', 'success');
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
