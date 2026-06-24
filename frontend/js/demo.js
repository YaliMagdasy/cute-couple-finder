/**
 * Cute Couple Finder - Demo Page Logic
 * Drag-and-drop simulation trained on Brad Pitt & Scarlett Johansson.
 */

const API_BASE = window.location.origin;

// ─── DOM Refs ────────────────────────────────────────────────────────
const demoContent = document.getElementById('demoContent');
const notReadyPanel = document.getElementById('notReadyPanel');
const candidatePool = document.getElementById('candidatePool');
const partnerDropZone = document.getElementById('partnerDropZone');
const partnerZonePreview = document.getElementById('partnerZonePreview');
const partnerZoneImg = document.getElementById('partnerZoneImg');
const partnerZoneName = document.getElementById('partnerZoneName');
const partnerZoneRemove = document.getElementById('partnerZoneRemove');
const candidatesDropZone = document.getElementById('candidatesDropZone');
const candidatesDropGrid = document.getElementById('candidatesDropGrid');
const candidatesPlaceholder = document.getElementById('candidatesPlaceholder');
const droppedCount = document.getElementById('droppedCount');
const demoForm = document.getElementById('demoForm');
const demoSubmitBtn = document.getElementById('demoSubmitBtn');
const demoBtnInner = document.getElementById('demoBtnInner');

// Mode 2 DOM Refs
const partner1DropZone = document.getElementById('partner1DropZone');
const partner1ZonePreview = document.getElementById('partner1ZonePreview');
const partner1ZoneImg = document.getElementById('partner1ZoneImg');
const partner1ZoneName = document.getElementById('partner1ZoneName');
const partner1ZoneRemove = document.getElementById('partner1ZoneRemove');

const partner2DropZone = document.getElementById('partner2DropZone');
const partner2ZonePreview = document.getElementById('partner2ZonePreview');
const partner2ZoneImg = document.getElementById('partner2ZoneImg');
const partner2ZoneName = document.getElementById('partner2ZoneName');
const partner2ZoneRemove = document.getElementById('partner2ZoneRemove');

const demoForm2 = document.getElementById('demoForm2');
const demoSubmitBtn2 = document.getElementById('demoSubmitBtn2');
const demoBtnInner2 = document.getElementById('demoBtnInner2');

const errorBanner = document.getElementById('errorBanner');
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

// ─── State ───────────────────────────────────────────────────────────
let allCandidates = []; // { filename, url, name, type: 'brad'|'scarlett'|'random', poolEl }
let selectedPartner = null; // candidate object
let droppedCandidates = []; // candidate objects

let selectedPartner1 = null; // candidate object
let selectedPartner2 = null; // candidate object

let draggedItem = null; // currently dragged candidate

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
    for (let i = 0; i < 6; i++) setTimeout(() => addHeart(), i * 800);
    setInterval(addHeart, 3500);
}
spawnHearts();

// ─── Check if demo model exists ─────────────────────────────────────
async function checkDemo() {
    try {
        const res = await fetch(`${API_BASE}/api/demo/status`);
        const data = await res.json();
        if (!data.ready) {
            demoContent.classList.add('hidden');
            notReadyPanel.classList.remove('hidden');
            return;
        }
        loadCandidatePool();
    } catch (e) {
        console.error('Demo check failed:', e);
    }
}

checkDemo();

// ─── Load candidate pool ────────────────────────────────────────────
async function loadCandidatePool() {
    try {
        const res = await fetch(`${API_BASE}/api/demo/candidates`);
        const data = await res.json();
        
        allCandidates = [];
        candidatePool.innerHTML = '';
        
        // Build pool items
        for (const c of data.candidates) {
            const url = `${API_BASE}/celebrity-img/${c.filename}`;
            const candidate = {
                filename: c.filename,
                url: url,
                name: c.name,
                type: c.type, // 'brad', 'scarlett', or 'random'
                poolEl: null,
            };
            
            const el = document.createElement('div');
            el.className = 'pool-item';
            el.draggable = true;
            el.innerHTML = `
                <img src="${url}" alt="${c.name}" loading="lazy">
                <div class="pool-label ${c.type !== 'random' ? 'celeb' : ''}">${c.name}</div>
            `;
            
            candidate.poolEl = el;
            allCandidates.push(candidate);
            
            // Drag events
            el.addEventListener('dragstart', e => {
                draggedItem = candidate;
                el.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', c.filename);
            });
            
            el.addEventListener('dragend', () => {
                el.style.opacity = '';
                draggedItem = null;
            });
            
            // Click to add to candidates zone
            el.addEventListener('click', () => {
                if (el.classList.contains('selected')) return;
                addToCandidatesZone(candidate);
            });
            if (c.type === 'brad' || c.type === 'scarlett') {
                candidatePool.appendChild(el);
            }
        }

        // No default candidates pre-added.

    } catch (e) {
        console.error('Failed to load demo candidates:', e);
        candidatePool.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:2rem;">Failed to load candidates</div>';
    }
}

// ─── Drop zone setup ────────────────────────────────────────────────

// Partner drop zone
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    partnerDropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(evt => {
    partnerDropZone.addEventListener(evt, () => partnerDropZone.classList.add('drag-over'));
});
['dragleave', 'drop'].forEach(evt => {
    partnerDropZone.addEventListener(evt, () => partnerDropZone.classList.remove('drag-over'));
});

partnerDropZone.addEventListener('drop', e => {
    if (!draggedItem) return;
    setPartner(draggedItem);
});

// Candidates drop zone
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    candidatesDropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(evt => {
    candidatesDropZone.addEventListener(evt, () => candidatesDropZone.classList.add('drag-over'));
});
['dragleave', 'drop'].forEach(evt => {
    candidatesDropZone.addEventListener(evt, () => candidatesDropZone.classList.remove('drag-over'));
});

candidatesDropZone.addEventListener('drop', e => {
    if (!draggedItem) return;
    addToCandidatesZone(draggedItem);
});

// Partner 1 drop zone
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    partner1DropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(evt => {
    partner1DropZone.addEventListener(evt, () => partner1DropZone.classList.add('drag-over'));
});
['dragleave', 'drop'].forEach(evt => {
    partner1DropZone.addEventListener(evt, () => partner1DropZone.classList.remove('drag-over'));
});

partner1DropZone.addEventListener('drop', e => {
    if (!draggedItem) return;
    setPartner1(draggedItem);
});

// Partner 2 drop zone
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    partner2DropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(evt => {
    partner2DropZone.addEventListener(evt, () => partner2DropZone.classList.add('drag-over'));
});
['dragleave', 'drop'].forEach(evt => {
    partner2DropZone.addEventListener(evt, () => partner2DropZone.classList.remove('drag-over'));
});

partner2DropZone.addEventListener('drop', e => {
    if (!draggedItem) return;
    setPartner2(draggedItem);
});

// ─── Partner zone logic ─────────────────────────────────────────────

function setPartner(candidate) {
    // If this candidate was already in candidates zone, remove it
    removeFromCandidatesZone(candidate);
    
    // If there was a previous partner, unselect it
    if (selectedPartner && selectedPartner.poolEl) {
        selectedPartner.poolEl.classList.remove('selected');
    }
    
    selectedPartner = candidate;
    if (candidate.poolEl) candidate.poolEl.classList.add('selected');
    
    partnerZoneImg.src = candidate.url;
    partnerZoneName.textContent = candidate.name;
    partnerDropZone.style.display = 'none';
    partnerZonePreview.style.display = 'block';
}

partnerZoneRemove.addEventListener('click', () => {
    if (selectedPartner) {
        if (selectedPartner.poolEl) selectedPartner.poolEl.classList.remove('selected');
        selectedPartner = null;
    }
    partnerDropZone.style.display = 'flex';
    partnerZonePreview.style.display = 'none';
});

function setPartner1(candidate) {
    if (selectedPartner1 && selectedPartner1.poolEl) selectedPartner1.poolEl.classList.remove('selected');
    selectedPartner1 = candidate;
    if (candidate.poolEl) candidate.poolEl.classList.add('selected');
    
    partner1ZoneImg.src = candidate.url;
    partner1ZoneName.textContent = candidate.name;
    partner1DropZone.style.display = 'none';
    partner1ZonePreview.style.display = 'block';
}

partner1ZoneRemove.addEventListener('click', () => {
    if (selectedPartner1) {
        if (selectedPartner1.poolEl) selectedPartner1.poolEl.classList.remove('selected');
        selectedPartner1 = null;
    }
    partner1DropZone.style.display = 'flex';
    partner1ZonePreview.style.display = 'none';
});

function setPartner2(candidate) {
    if (selectedPartner2 && selectedPartner2.poolEl) selectedPartner2.poolEl.classList.remove('selected');
    selectedPartner2 = candidate;
    if (candidate.poolEl) candidate.poolEl.classList.add('selected');
    
    partner2ZoneImg.src = candidate.url;
    partner2ZoneName.textContent = candidate.name;
    partner2DropZone.style.display = 'none';
    partner2ZonePreview.style.display = 'block';
}

partner2ZoneRemove.addEventListener('click', () => {
    if (selectedPartner2) {
        if (selectedPartner2.poolEl) selectedPartner2.poolEl.classList.remove('selected');
        selectedPartner2 = null;
    }
    partner2DropZone.style.display = 'flex';
    partner2ZonePreview.style.display = 'none';
});

// ─── Candidates zone logic ──────────────────────────────────────────

function addToCandidatesZone(candidate, prepend = false, delayIndex = 0) {
    // Don't add if already there or is the partner
    if (droppedCandidates.includes(candidate)) return;
    if (candidate === selectedPartner) return;
    
    if (candidate.poolEl) candidate.poolEl.classList.add('selected');
    if (prepend) {
        droppedCandidates.unshift(candidate);
    } else {
        droppedCandidates.push(candidate);
    }
    
    const cell = document.createElement('div');
    cell.className = 'dropped-cell';
    cell.style.animation = `fadeUp 0.4s ease both`;
    if (delayIndex > 0) {
        cell.style.animationDelay = `${delayIndex * 0.1}s`;
    }
    cell.innerHTML = `
        <img src="${candidate.url}" alt="${candidate.name}">
        <div class="dc-name">${candidate.name}</div>
        <button type="button" class="dc-remove" aria-label="Remove">×</button>
    `;
    
    cell.querySelector('.dc-remove').addEventListener('click', e => {
        e.stopPropagation();
        removeFromCandidatesZone(candidate);
        cell.remove();
    });
    
    candidate._droppedCell = cell;
    if (prepend) {
        candidatesDropGrid.prepend(cell);
    } else {
        candidatesDropGrid.appendChild(cell);
    }
    
    updateCandidatesPlaceholder();
}

function removeFromCandidatesZone(candidate) {
    const idx = droppedCandidates.indexOf(candidate);
    if (idx === -1) return;
    
    droppedCandidates.splice(idx, 1);
    if (candidate.poolEl) candidate.poolEl.classList.remove('selected');
    
    if (candidate._droppedCell) {
        candidate._droppedCell.remove();
        candidate._droppedCell = null;
    }
    
    updateCandidatesPlaceholder();
}

function updateCandidatesPlaceholder() {
    const count = droppedCandidates.length;
    droppedCount.textContent = `${count} ${count === 1 ? 'person' : 'people'}`;
    candidatesPlaceholder.style.display = count > 0 ? 'none' : 'flex';
}

const demoAddRandomBtn = document.getElementById('demoAddRandomBtn');
if (demoAddRandomBtn) {
    demoAddRandomBtn.addEventListener('click', () => {
        let addedCount = 0;
        // Find candidates not currently dropped
        const available = allCandidates.filter(c => c.type === 'random' && !droppedCandidates.includes(c) && c !== selectedPartner);
        // Shuffle them
        available.sort(() => 0.5 - Math.random());
        
        let delayIndex = 0;
        for (const candidate of available) {
            addToCandidatesZone(candidate, true, delayIndex++);
            addedCount++;
            if (addedCount >= 5) break;
        }
    });
}



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
    
    if (data.error || data.case === 0) {
        resultPanel.classList.add('error');
        resultPanel.style.display = 'block';
        resultEmoji.textContent = '⚠️';
        resultTitle.className = 'result-title fail';
        resultTitle.textContent = 'Detection Failed';
        resultSub.textContent = data.message || 'Ensure exactly one face is in the partner picture.';
        return;
    }
    
    if (data.case === 1 && data.above_level) {
        resultPanel.classList.add('error');
        resultPanel.style.display = 'block';
        resultEmoji.textContent = '😔';
        resultTitle.className = 'result-title fail';
        resultTitle.textContent = 'No Match Found';
        resultSub.textContent = 'No candidate was suitable for this partner.';
        return;
    }
    
    if (data.case === 1) {
        resultPanel.classList.add('error');
        resultPanel.style.display = 'block';
        resultEmoji.textContent = '😔';
        resultTitle.className = 'result-title fail';
        resultTitle.textContent = data.message;
        resultSub.textContent = 'Try adding different candidates.';
        return;
    }
    
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
demoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner.style.display = 'none';
    
    if (!selectedPartner) {
        showError('Drag a photo into the Partner zone first.');
        return;
    }
    if (droppedCandidates.length === 0) {
        showError('Drag at least one candidate into the Candidates zone.');
        return;
    }
    
    // Lock UI immediately for optimistic feedback
    resultPanel.style.display = 'none';
    demoSubmitBtn.disabled = true;
    demoBtnInner.innerHTML = '<span class="spinner"></span> Processing…';
    
    progressPanel.style.display = 'block';
    progressFill.style.width = '0%';
    void progressFill.offsetWidth;
    progressFill.style.width = '100%';
    
    const textInterval = startProgress();
    const t0 = Date.now();
    
    try {
        // Build formData - we need to fetch the images as blobs
        const formData = new FormData();
        
        // Partner
        try {
            const pResp = await fetch(selectedPartner.url);
            const pBlob = await pResp.blob();
            formData.append('partner', new File([pBlob], selectedPartner.filename, { type: pBlob.type }));
        } catch {
            throw new Error('Failed to load partner image.');
        }
        
        // Candidates concurrently
        await Promise.all(droppedCandidates.map(async (c) => {
            try {
                const resp = await fetch(c.url);
                const blob = await resp.blob();
                formData.append('candidates', new File([blob], c.filename, { type: blob.type }));
            } catch {
                console.warn('Skip', c.url);
            }
        }));
        
        const res = await fetch(`${API_BASE}/api/match/demo`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        const elapsed = Date.now() - t0;
        if (elapsed < 4000) await new Promise(r => setTimeout(r, 4000 - elapsed));
        
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        demoSubmitBtn.disabled = false;
        demoBtnInner.innerHTML = '💘 Find Best Match';
        showResult(!res.ok ? { error: true, message: data.message } : data);
    } catch (err) {
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        demoSubmitBtn.disabled = false;
        demoBtnInner.innerHTML = '💘 Find Best Match';
        showResult({ error: true, message: err.message || 'Connection failed.' });
    }
});

function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
}

demoForm2.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner.style.display = 'none';
    
    if (!selectedPartner1 || !selectedPartner2) {
        showError('Drag a photo into both Partner 1 and Partner 2 zones.');
        return;
    }
    
    resultPanel.style.display = 'none';
    demoSubmitBtn2.disabled = true;
    demoBtnInner2.innerHTML = '<span class="spinner"></span> Processing…';
    
    progressPanel.style.display = 'block';
    progressFill.style.width = '0%';
    void progressFill.offsetWidth;
    progressFill.style.width = '100%';
    
    const textInterval = startProgress();
    const t0 = Date.now();
    
    try {
        const formData = new FormData();
        
        try {
            const p1Resp = await fetch(selectedPartner1.url);
            const p1Blob = await p1Resp.blob();
            formData.append('partner1', new File([p1Blob], selectedPartner1.filename, { type: p1Blob.type }));
            
            const p2Resp = await fetch(selectedPartner2.url);
            const p2Blob = await p2Resp.blob();
            formData.append('partner2', new File([p2Blob], selectedPartner2.filename, { type: p2Blob.type }));
        } catch {
            throw new Error('Failed to load partner images.');
        }
        
        const res = await fetch(`${API_BASE}/api/compare/demo`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        const elapsed = Date.now() - t0;
        if (elapsed < 4000) await new Promise(r => setTimeout(r, 4000 - elapsed));
        
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        demoSubmitBtn2.disabled = false;
        demoBtnInner2.innerHTML = '💘 Calculate Suitability';
        showResult(!res.ok ? { error: true, message: data.message } : data);
    } catch (err) {
        clearInterval(textInterval);
        progressPanel.style.display = 'none';
        demoSubmitBtn2.disabled = false;
        demoBtnInner2.innerHTML = '💘 Calculate Suitability';
        showResult({ error: true, message: err.message || 'Connection failed.' });
    }
});
