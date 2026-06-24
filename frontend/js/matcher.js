/**
 * Cute Couple Finder - Matcher Page Logic
 * Handles the match page accessed via /<uid>.
 */

const API_BASE = window.location.origin;
const UUID = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');

// ─── DOM Refs ────────────────────────────────────────────────────────
const partnerInput = document.getElementById('partnerInput');
const partnerDrop = document.getElementById('partnerDrop');
const partnerPreview = document.getElementById('partnerPreview');
const partnerImg = document.getElementById('partnerImg');
const changePartnerBtn = document.getElementById('changePartnerBtn');
const partnerCard = document.getElementById('partnerCard');

const candidateGrid = document.getElementById('candidateGrid');
const candidatesCard = document.getElementById('candidatesCard');
const candidateCount = document.getElementById('candidateCount');
const addInput = document.getElementById('addInput');

const submitBtn = document.getElementById('submitBtn');
const btnInner = document.getElementById('btnInner');
const mainForm = document.getElementById('mainForm');
const errorBanner = document.getElementById('errorBanner');

// Mode 2 DOM Refs
const compareForm = document.getElementById('compareForm');
const compareBtn = document.getElementById('compareBtn');
const compareBtnInner = document.getElementById('compareBtnInner');

const partner1Input = document.getElementById('partner1Input');
const partner1Drop = document.getElementById('partner1Drop');
const partner1Preview = document.getElementById('partner1Preview');
const partner1Img = document.getElementById('partner1Img');
const changePartner1Btn = document.getElementById('changePartner1Btn');
const partner1Card = document.getElementById('partner1Card');

const partner2Input = document.getElementById('partner2Input');
const partner2Drop = document.getElementById('partner2Drop');
const partner2Preview = document.getElementById('partner2Preview');
const partner2Img = document.getElementById('partner2Img');
const changePartner2Btn = document.getElementById('changePartner2Btn');
const partner2Card = document.getElementById('partner2Card');

const progressPanel = document.getElementById('progressPanel');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');

const resultPanel = document.getElementById('resultPanel');
const resultEmoji = document.getElementById('resultEmoji');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');
const matchWrap = document.getElementById('matchWrap');
const matchImg = document.getElementById('matchImg');
const particles = document.getElementById('particles');

const expiredOverlay = document.getElementById('expiredOverlay');

// ─── State ───────────────────────────────────────────────────────────
let candidates = [];

// ─── Mode Switcher ──────────────────────────────────────────────────
const modeBtns = document.querySelectorAll('.mode-btn');
const modeSections = document.querySelectorAll('.mode-section');

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        modeSections.forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`mode-${btn.dataset.mode}`).classList.add('active');
        
        // Hide result and progress panels if switching
        resultPanel.style.display = 'none';
        progressPanel.style.display = 'none';
        errorBanner.style.display = 'none';
    });
});

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
    
    for (let i = 0; i < 6; i++) {
        setTimeout(() => addHeart(), i * 800);
    }
    setInterval(addHeart, 3500);
}

spawnHearts();

// ─── Check expiry status ────────────────────────────────────────────
async function checkStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/status/${UUID}`);
        const data = await res.json();
        
        if (!data.valid) {
            showExpired();
            return;
        }
        
    } catch (err) {
        console.error('Status check failed:', err);
    }
}

function showExpired() {
    expiredOverlay.style.display = 'flex';
}

checkStatus();


// ─── Load candidates ────────────────────────────────────────────────
async function loadCandidates() {
    try {
        const r = await fetch(`${API_BASE}/api/candidates`);
        const data = await r.json();
        const files = data.candidates || [];
        candidateGrid.innerHTML = '';
        let delayIndex = 0;
        files.forEach(name => addCandidateToGrid(`${API_BASE}/celebrity-img/${name}`, null, name, false, delayIndex++));
        updateCount();
    } catch (e) {
        console.error('Failed to load candidates', e);
        candidateGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;font-size:0.85rem;">Could not load candidates.</div>';
    }
}

function addCandidateToGrid(url, file, name, prepend = false, delayIndex = 0) {
    const cell = document.createElement('div');
    cell.className = 'candidate-cell';
    cell.style.animation = `fadeUp 0.4s ease both`;
    if (delayIndex > 0) {
        cell.style.animationDelay = `${delayIndex * 0.1}s`;
    }
    cell.innerHTML = `
        <img src="${url}" alt="${name}" loading="lazy">
        <button type="button" class="cell-remove" aria-label="Remove">×</button>
    `;
    
    const entry = { url, file, name, element: cell };
    if (prepend) {
        candidates.unshift(entry);
    } else {
        candidates.push(entry);
    }
    
    cell.querySelector('.cell-remove').addEventListener('click', e => {
        e.stopPropagation();
        cell.classList.add('removing');
        setTimeout(() => {
            candidates = candidates.filter(c => c !== entry);
            cell.remove();
            updateCount();
        }, 250);
    });
    if (prepend) {
        candidateGrid.prepend(cell);
    } else {
        candidateGrid.appendChild(cell);
    }
}

function updateCount() {
    candidateCount.textContent = `${candidates.length} people`;
}

// ─── Add random candidates ──────────────────────────────────────────
const addRandomBtn = document.getElementById('addRandomBtn');
if (addRandomBtn) {
    addRandomBtn.addEventListener('click', async () => {
        // Disable button to prevent spamming
        addRandomBtn.disabled = true;
        addRandomBtn.style.opacity = '0.5';
        const originalText = addRandomBtn.textContent;
        addRandomBtn.textContent = 'Loading...';
        
        try {
            const currentNames = candidates.map(c => c.name);
            const params = new URLSearchParams();
            params.append('count', 5);
            currentNames.forEach(name => params.append('exclude[]', name));
            
            const r = await fetch(`${API_BASE}/api/random_celebrities?${params.toString()}`);
            const data = await r.json();
            const randomFiles = data.candidates || [];
            
            let delayIndex = 0;
            randomFiles.forEach(c => addCandidateToGrid(c.url, null, c.name, true, delayIndex++));
            updateCount();
        } catch (e) {
            console.error('Failed to load random candidates', e);
        } finally {
            addRandomBtn.disabled = false;
            addRandomBtn.style.opacity = '1';
            addRandomBtn.textContent = originalText;
        }
    });
}

// ─── Add custom candidates ──────────────────────────────────────────
addInput.addEventListener('change', () => {
    for (const file of addInput.files) {
        const url = URL.createObjectURL(file);
        addCandidateToGrid(url, file, file.name, true);
    }
    addInput.value = '';
    updateCount();
});

// ─── Partner upload ─────────────────────────────────────────────────
partnerInput.addEventListener('change', () => {
    if (partnerInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = e => {
            partnerImg.src = e.target.result;
            partnerDrop.style.display = 'none';
            partnerPreview.style.display = 'block';
        };
        reader.readAsDataURL(partnerInput.files[0]);
    }
});

changePartnerBtn.addEventListener('click', () => {
    partnerInput.value = '';
    partnerDrop.style.display = 'flex';
    partnerPreview.style.display = 'none';
});

// Drag & drop partner
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    partnerDrop.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(e => {
    partnerDrop.addEventListener(e, () => partnerDrop.style.borderColor = 'var(--accent-pink)');
});
['dragleave', 'drop'].forEach(e => {
    partnerDrop.addEventListener(e, () => partnerDrop.style.borderColor = '');
});
partnerDrop.addEventListener('drop', e => {
    partnerInput.files = e.dataTransfer.files;
    partnerInput.dispatchEvent(new Event('change'));
});

// ─── Mode 2 (Couple Test) Partner Uploads ───────────────────────────
partner1Input.addEventListener('change', () => {
    if (partner1Input.files.length > 0) {
        const reader = new FileReader();
        reader.onload = e => {
            partner1Img.src = e.target.result;
            partner1Drop.style.display = 'none';
            partner1Preview.style.display = 'block';
        };
        reader.readAsDataURL(partner1Input.files[0]);
    }
});

changePartner1Btn.addEventListener('click', () => {
    partner1Input.value = '';
    partner1Drop.style.display = 'flex';
    partner1Preview.style.display = 'none';
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    partner1Drop.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(e => {
    partner1Drop.addEventListener(e, () => partner1Drop.style.borderColor = 'var(--accent-pink)');
});
['dragleave', 'drop'].forEach(e => {
    partner1Drop.addEventListener(e, () => partner1Drop.style.borderColor = '');
});
partner1Drop.addEventListener('drop', e => {
    partner1Input.files = e.dataTransfer.files;
    partner1Input.dispatchEvent(new Event('change'));
});

partner2Input.addEventListener('change', () => {
    if (partner2Input.files.length > 0) {
        const reader = new FileReader();
        reader.onload = e => {
            partner2Img.src = e.target.result;
            partner2Drop.style.display = 'none';
            partner2Preview.style.display = 'block';
        };
        reader.readAsDataURL(partner2Input.files[0]);
    }
});

changePartner2Btn.addEventListener('click', () => {
    partner2Input.value = '';
    partner2Drop.style.display = 'flex';
    partner2Preview.style.display = 'none';
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    partner2Drop.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(e => {
    partner2Drop.addEventListener(e, () => partner2Drop.style.borderColor = 'var(--accent-pink)');
});
['dragleave', 'drop'].forEach(e => {
    partner2Drop.addEventListener(e, () => partner2Drop.style.borderColor = '');
});
partner2Drop.addEventListener('drop', e => {
    partner2Input.files = e.dataTransfer.files;
    partner2Input.dispatchEvent(new Event('change'));
});

// ─── Progress phases ────────────────────────────────────────────────
const PHASES = [
    'Finding the most handsome boyfriend...',
    'Analyzing girl cuteness...',
    'Matching cute couples...',
    'Computing geometric similarity bounds...',
    'Executing linear classification matrix...',
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

// ─── Particles ──────────────────────────────────────────────────────
function spawnParticles() {
    const colors = ['#f43f5e', '#d946ef', '#8b5cf6', '#22c55e', '#facc15', '#fb923c'];
    particles.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${60 + Math.random() * 30}%`;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = `${Math.random() * 0.8}s`;
        p.style.animationDuration = `${1.5 + Math.random() * 2}s`;
        const s = 4 + Math.random() * 4;
        p.style.width = s + 'px';
        p.style.height = s + 'px';
        particles.appendChild(p);
    }
}

// ─── Show result ────────────────────────────────────────────────────
function showResult(data) {
    resultPanel.className = 'result-panel';
    matchWrap.classList.add('hidden');
    particles.innerHTML = '';
    
    // Backend error
    if (data.error || data.case === 0) {
        resultPanel.classList.add('error');
        resultPanel.style.display = 'block';
        resultEmoji.textContent = '⚠️';
        resultTitle.className = 'result-title fail';
        resultTitle.textContent = 'Detection Failed';
        resultSub.textContent = data.message || 'Ensure exactly one face is in the partner picture.';
        return;
    }
    
    // Above their level
    if (data.case === 1 && data.above_level) {
        resultPanel.classList.add('error');
        resultPanel.style.display = 'block';
        resultEmoji.textContent = '😔';
        resultTitle.className = 'result-title fail';
        resultTitle.textContent = 'No Match Found';
        resultSub.textContent = 'No candidate was suitable for this partner.';
        return;
    }
    
    // No match
    if (data.case === 1) {
        resultPanel.classList.add('error');
        resultPanel.style.display = 'block';
        resultEmoji.textContent = '😔';
        resultTitle.className = 'result-title fail';
        resultTitle.textContent = data.message;
        resultSub.textContent = 'Try adding different candidates.';
        return;
    }
    
    // Match found
    resultPanel.classList.add('success');
    resultPanel.style.display = 'block';
    
    if (data.cute_couple) {
        resultEmoji.textContent = '🥰';
        resultTitle.className = 'result-title ok';
        resultTitle.innerHTML = 'perfect couple found<br>100% suitabillity<br>legendary couple meant for each other';
        resultSub.textContent = '';
        spawnParticles();
        playPartySound();
    } else {
        resultPanel.classList.remove('success');
        resultPanel.classList.add('above-level');
        resultEmoji.textContent = '🎉';
        resultTitle.className = 'result-title ok';
        resultTitle.textContent = 'This is the best match found!';
        const suitabillity = Math.floor(Math.random() * 29) + 70; // 70 to 98
        resultSub.textContent = `${suitabillity}% suitability`;
    }
    
    if (data.image && data.partner_image) {
        matchImg.src = data.image;
        document.getElementById('resultPartnerImg').src = data.partner_image;
        matchWrap.classList.remove('hidden');
    }
}

function playPartySound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const playTone = (freq, startTime, duration, vol) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
        };
        playTone(523.25, 0.0, 0.15, 0.1); 
        playTone(659.25, 0.15, 0.15, 0.1); 
        playTone(783.99, 0.3, 0.15, 0.1); 
        playTone(1046.50, 0.45, 0.4, 0.1); 
    } catch(e) {}
}

// ─── Form submit ────────────────────────────────────────────────────
mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner.style.display = 'none';
    
    if (!partnerInput.files[0]) {
        errorBanner.textContent = 'Upload a partner picture first.';
        errorBanner.style.display = 'block';
        return;
    }
    if (candidates.length === 0) {
        errorBanner.textContent = 'Add at least one candidate.';
        errorBanner.style.display = 'block';
        return;
    }
    
    // Lock UI immediately for optimistic feedback
    resultPanel.style.display = 'none';
    partnerCard.classList.add('locked');
    candidatesCard.classList.add('locked');
    submitBtn.disabled = true;
    btnInner.innerHTML = '<span class="spinner"></span> Processing…';
    
    progressPanel.style.display = 'block';
    progressFill.style.width = '0%';
    void progressFill.offsetWidth;
    progressFill.style.width = '100%';
    
    const textInterval = startProgress();
    const t0 = Date.now();
    
    try {
        const formData = new FormData();
        formData.append('partner', partnerInput.files[0]);
        
        await Promise.all(candidates.map(async (c) => {
            if (c.file) {
                formData.append('candidates', c.file);
            } else if (c.url.startsWith('http')) {
                // External URLs are sent directly for backend to download
                formData.append('candidate_urls', c.url);
                formData.append('candidate_names', c.name);
            } else {
                try {
                    const resp = await fetch(c.url);
                    const blob = await resp.blob();
                    formData.append('candidates', new File([blob], c.name, { type: blob.type }));
                } catch { console.warn('Skip', c.url); }
            }
        }));
        
        const res = await fetch(`${API_BASE}/api/match/${UUID}`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        const elapsed = Date.now() - t0;
        if (elapsed < 4000) await new Promise(r => setTimeout(r, 4000 - elapsed));
        
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        unlock();
        showResult(!res.ok ? { error: true, message: data.message } : data);
    } catch {
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        unlock();
        showResult({ error: true, message: 'Connection failed.' });
    }
});

function unlock() {
    partnerCard.classList.remove('locked');
    candidatesCard.classList.remove('locked');
    submitBtn.disabled = false;
    btnInner.innerHTML = '💘 Find Best Match';
}

// ─── Form submit for Mode 2 (Couple Test) ───────────────────────────
compareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner.style.display = 'none';
    
    if (!partner1Input.files[0] || !partner2Input.files[0]) {
        errorBanner.textContent = 'Upload pictures for both partners.';
        errorBanner.style.display = 'block';
        return;
    }
    
    resultPanel.style.display = 'none';
    partner1Card.classList.add('locked');
    partner2Card.classList.add('locked');
    compareBtn.disabled = true;
    compareBtnInner.innerHTML = '<span class="spinner"></span> Processing…';
    
    progressPanel.style.display = 'block';
    progressFill.style.width = '0%';
    void progressFill.offsetWidth;
    progressFill.style.width = '100%';
    
    const textInterval = startProgress();
    const t0 = Date.now();
    
    try {
        const formData = new FormData();
        formData.append('partner1', partner1Input.files[0]);
        formData.append('partner2', partner2Input.files[0]);
        
        const res = await fetch(`${API_BASE}/api/compare/${UUID}`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        const elapsed = Date.now() - t0;
        if (elapsed < 4000) await new Promise(r => setTimeout(r, 4000 - elapsed));
        
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        unlockCompare();
        showResult(!res.ok ? { error: true, message: data.message } : data);
    } catch {
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        unlockCompare();
        showResult({ error: true, message: 'Connection failed.' });
    }
});

function unlockCompare() {
    partner1Card.classList.remove('locked');
    partner2Card.classList.remove('locked');
    compareBtn.disabled = false;
    compareBtnInner.innerHTML = '💘 Calculate Suitability';
}
