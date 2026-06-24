/**
 * Cute Couple Finder - Landing Page Logic
 * Handles photo uploads, model training, and URL generation.
 */

const API_BASE = window.location.origin;

// ─── DOM Refs ────────────────────────────────────────────────────────
const setupForm = document.getElementById('setupForm');
const setupBtn = document.getElementById('setupBtn');
const setupBtnInner = document.getElementById('setupBtnInner');
const setupSection = document.getElementById('setupSection');
const errorBanner = document.getElementById('errorBanner');
const progressPanel = document.getElementById('progressPanel');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');
const successPanel = document.getElementById('successPanel');
const generatedUrl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');
const expiryTime = document.getElementById('expiryTime');
const createAnotherBtn = document.getElementById('createAnotherBtn');

const p1Input = document.getElementById('p1Input');
const p2Input = document.getElementById('p2Input');
const p1Drop = document.getElementById('p1Drop');
const p2Drop = document.getElementById('p2Drop');
const p1Preview = document.getElementById('p1Preview');
const p2Preview = document.getElementById('p2Preview');
const p1Count = document.getElementById('p1Count');
const p2Count = document.getElementById('p2Count');

// ─── State ───────────────────────────────────────────────────────────
let p1Files = [];
let p2Files = [];

// ─── Floating hearts ────────────────────────────────────────────────
function spawnHearts() {
    const container = document.getElementById('heartsBg');
    const hearts = ['💕', '💖', '💗', '💘', '❤️', '💜', '💝', '🤍'];
    
    function addHeart() {
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        heart.style.left = `${Math.random() * 100}%`;
        heart.style.fontSize = `${0.8 + Math.random() * 1.2}rem`;
        heart.style.animationDuration = `${8 + Math.random() * 12}s`;
        heart.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(heart);
        
        setTimeout(() => heart.remove(), 22000);
    }
    
    // Initial batch
    for (let i = 0; i < 8; i++) {
        setTimeout(() => addHeart(), i * 600);
    }
    
    // Ongoing
    setInterval(addHeart, 3000);
}

spawnHearts();

// ─── Drag & drop helpers ────────────────────────────────────────────
function setupDropZone(dropEl, inputEl, filesArr, previewEl, countEl, label) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dropEl.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
    });
    
    ['dragenter', 'dragover'].forEach(evt => {
        dropEl.addEventListener(evt, () => dropEl.classList.add('drag-active'));
    });
    
    ['dragleave', 'drop'].forEach(evt => {
        dropEl.addEventListener(evt, () => dropEl.classList.remove('drag-active'));
    });
    
    dropEl.addEventListener('drop', e => {
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        addFiles(files, filesArr, previewEl, countEl, label);
    });
    
    inputEl.addEventListener('change', () => {
        const files = Array.from(inputEl.files);
        addFiles(files, filesArr, previewEl, countEl, label);
        inputEl.value = '';
    });
}

function addFiles(newFiles, filesArr, previewEl, countEl, label) {
    for (const file of newFiles) {
        filesArr.push(file);
        const url = URL.createObjectURL(file);
        
        const cell = document.createElement('div');
        cell.className = 'preview-cell';
        cell.innerHTML = `
            <img src="${url}" alt="${file.name}" loading="lazy">
            <button type="button" class="cell-remove" aria-label="Remove">×</button>
        `;
        
        const idx = filesArr.length - 1;
        cell.querySelector('.cell-remove').addEventListener('click', e => {
            e.stopPropagation();
            cell.classList.add('removing');
            setTimeout(() => {
                const i = filesArr.indexOf(file);
                if (i > -1) filesArr.splice(i, 1);
                cell.remove();
                updateCount(countEl, filesArr.length, label);
            }, 250);
        });
        
        previewEl.appendChild(cell);
    }
    updateCount(countEl, filesArr.length, label);
}

function updateCount(countEl, count, label) {
    countEl.textContent = `${count} photo${count !== 1 ? 's' : ''}`;
}

if (p1Drop && p2Drop) {
    setupDropZone(p1Drop, p1Input, p1Files, p1Preview, p1Count, 'P1');
    setupDropZone(p2Drop, p2Input, p2Files, p2Preview, p2Count, 'P2');
}

// ─── Training progress phases ───────────────────────────────────────
const PHASES = [
    'Detecting faces...',
    'Computing facial embeddings...',
    'Training the couple model...',
    'Calibrating match confidence...',
    'Generating your unique link...',
];

function startProgress() {
    let i = 0;
    progressStatus.textContent = PHASES[0];
    return setInterval(() => {
        i++;
        if (i < PHASES.length) {
            progressStatus.classList.add('fade');
            setTimeout(() => {
                progressStatus.textContent = PHASES[i];
                progressStatus.classList.remove('fade');
            }, 150);
        }
    }, 800);
}

// ─── Form submission ────────────────────────────────────────────────
if (setupForm) {
    setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBanner.style.display = 'none';
        
        if (p1Files.length === 0) {
            showError('Please upload at least one photo for Person 1.');
            return;
        }
        if (p2Files.length === 0) {
            showError('Please upload at least one photo for Person 2.');
            return;
        }
        
        const formData = new FormData();
        for (const f of p1Files) formData.append('p1', f);
        for (const f of p2Files) formData.append('p2', f);
        
        // Lock UI
        setupBtn.disabled = true;
        setupBtnInner.innerHTML = '<span class="spinner"></span> Training Model...';
        
        progressPanel.style.display = 'block';
        progressFill.style.width = '0%';
        void progressFill.offsetWidth;
        progressFill.style.width = '100%';
        
        const textInterval = startProgress();
        const t0 = Date.now();
        
        try {
            const res = await fetch(`${API_BASE}/api/setup`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to train model');
            
            // Ensure minimum animation time
            const elapsed = Date.now() - t0;
            if (elapsed < 3000) await sleep(3000 - elapsed);
            
            clearInterval(textInterval);
            progressPanel.style.display = 'none';
            
            // Show success
            const matchUrl = `${window.location.origin}/${data.uid}`;
            generatedUrl.textContent = matchUrl;
            setupSection.style.display = 'none';
            successPanel.style.display = 'block';
            
            // Start expiry countdown
            if (data.expires_at) {
                startExpiryCountdown(data.expires_at);
            }
            
        } catch (err) {
            clearInterval(textInterval);
            progressPanel.style.display = 'none';
            showError(err.message);
            setupBtn.disabled = false;
            setupBtnInner.innerHTML = '💘 Create Your Link';
        }
    });
}

// ─── Copy URL ───────────────────────────────────────────────────────
if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(generatedUrl.textContent);
            copyBtn.textContent = '✓ Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch {
            // Fallback
            const range = document.createRange();
            range.selectNodeContents(generatedUrl);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        }
    });
}

// ─── Create another ─────────────────────────────────────────────────
if (createAnotherBtn) {
    createAnotherBtn.addEventListener('click', () => {
        // Reset state
        p1Files.length = 0;
        p2Files.length = 0;
        p1Preview.innerHTML = '';
        p2Preview.innerHTML = '';
        p1Count.textContent = '0 photos';
        p2Count.textContent = '0 photos';
        setupBtn.disabled = false;
        setupBtnInner.innerHTML = '💘 Create Your Link';
        
        successPanel.style.display = 'none';
        setupSection.style.display = 'block';
    });
}

// ─── Expiry countdown ───────────────────────────────────────────────
function startExpiryCountdown(expiresAt) {
    function update() {
        const remaining = expiresAt - (Date.now() / 1000);
        if (remaining <= 0) {
            expiryTime.textContent = 'Expired';
            return;
        }
        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        expiryTime.textContent = `Expires in ${hours}h ${mins}m`;
    }
    update();
    setInterval(update, 60000);
}

// ─── Helpers ────────────────────────────────────────────────────────
function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
