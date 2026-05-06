'use strict';

const el = id => document.getElementById(id);

const uploadZone      = el('upload-zone');
const fileInput       = el('file-input');
const previewStrip    = el('preview-strip');
const previewThumb    = el('preview-thumb');
const previewName     = el('preview-name');
const previewSize     = el('preview-size');
const removeBtn       = el('remove-btn');
const kSlider         = el('k-slider');
const kValue          = el('k-value');
const qualityHint     = el('quality-hint');
const btnCompress     = el('btn-compress');
const progressWrap    = el('progress-wrap');
const progressFill    = el('progress-fill');
const progressText    = el('progress-text');
const progressPct     = el('progress-pct');
const statsGrid       = el('stats-grid');
const statOriginal    = el('stat-original');
const statOriginalSub = el('stat-original-sub');
const statCompressed  = el('stat-compressed');
const statCompressedSub = el('stat-compressed-sub');
const statRatio       = el('stat-ratio');
const statVariance    = el('stat-variance');
const statK           = el('stat-k');
const statDims        = el('stat-dims');
const analysisPanel   = el('analysis-panel');
const resultsSection  = el('results-section');
const imgOriginal     = el('img-original');
const imgCompressed   = el('img-compressed');
const imgAfter        = el('img-after');
const dividerLine     = el('divider-line');
const dividerHandle   = el('divider-handle');
const compWrapper     = el('comparison-wrapper');
const plotSection     = el('plot-section');
const plotImg         = el('plot-img');
const btnDownload     = el('btn-download');
const errorToast      = el('error-toast');

let selectedFile  = null;
let compressing   = false;
let progressTimer = null;
let toastTimer    = null;

function fmtBytes(b) {
  if (b < 1024)    return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function getHint(k) {
  if (k <= 5)   return `k = ${k} — Extreme compression, heavy artifacts.`;
  if (k <= 20)  return `k = ${k} — Aggressive compression, noticeable quality loss.`;
  if (k <= 80)  return `k = ${k} — Good compression with moderate quality loss.`;
  if (k <= 200) return `k = ${k} — Balanced quality and compression ratio.`;
  if (k <= 400) return `k = ${k} — High quality, less compression benefit.`;
  return `k = ${k} — Near-lossless. Minimal compression, maximum detail.`;
}

function updateSliderFill() {
  const pct = ((kSlider.value - kSlider.min) / (kSlider.max - kSlider.min)) * 100;
  kSlider.style.background =
    `linear-gradient(to right, #ff3d00 ${pct}%, #2e2e2e ${pct}%)`;
}

kSlider.addEventListener('input', () => {
  kValue.textContent = kSlider.value;
  qualityHint.textContent = getHint(parseInt(kSlider.value, 10));
  updateSliderFill();
});
updateSliderFill();

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});
removeBtn.addEventListener('click', reset);

function reset() {
  selectedFile = null;
  fileInput.value = '';
  previewThumb.src = '';
  previewStrip.classList.remove('visible');
  btnCompress.disabled = true;
  hideResults();
}

function handleFile(file) {
  const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp'];
  if (!allowed.includes(file.type))     return showError('Unsupported file type. Use PNG, JPG, JPEG, GIF, BMP, or WEBP.');
  if (file.size > 50 * 1024 * 1024)    return showError('File too large. Maximum size is 50 MB.');

  selectedFile = file;
  previewName.textContent = file.name;
  previewSize.textContent = fmtBytes(file.size);

  const reader = new FileReader();
  reader.onload = e => { previewThumb.src = e.target.result; };
  reader.readAsDataURL(file);

  previewStrip.classList.add('visible');
  btnCompress.disabled = false;
  hideResults();
}

btnCompress.addEventListener('click', async () => {
  if (!selectedFile || compressing) return;

  compressing = true;
  btnCompress.disabled = true;
  hideResults();
  showProgress();

  const form = new FormData();
  form.append('image', selectedFile);
  form.append('num_components', kSlider.value);

  animateProgress(0, 75, 2000);

  try {
    const resp = await fetch('/api/compress', { method: 'POST', body: form });
    animateProgress(75, 95, 500);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    animateProgress(95, 100, 300);

    setTimeout(() => {
      hideProgress();
      renderResults(data);
      compressing = false;
      btnCompress.disabled = false;
    }, 400);

  } catch (err) {
    hideProgress();
    showError(`Compression failed: ${err.message}`);
    compressing = false;
    btnCompress.disabled = false;
  }
});

function animateProgress(from, to, duration) {
  clearInterval(progressTimer);
  const start = performance.now();
  progressTimer = setInterval(() => {
    const pct = Math.min(from + (to - from) * ((performance.now() - start) / duration), to);
    progressFill.style.width = `${pct}%`;
    progressPct.textContent  = `${Math.round(pct)}%`;
    progressText.textContent = pct < 40 ? 'Uploading…'
                             : pct < 80 ? 'Applying PCA…'
                             : pct < 97 ? 'Reconstructing…'
                             : 'Saving…';
    if (pct >= to) clearInterval(progressTimer);
  }, 30);
}

function showProgress() {
  progressFill.style.width = '0%';
  progressWrap.classList.add('visible');
}

function hideProgress() {
  clearInterval(progressTimer);
  progressWrap.classList.remove('visible');
}

function renderResults(data) {
  statOriginal.textContent      = `${data.original_size_kb} KB`;
  statOriginalSub.textContent   = fmtBytes(data.original_size_bytes);
  statCompressed.textContent    = `${data.compressed_size_kb} KB`;
  statCompressedSub.textContent = fmtBytes(data.compressed_size_bytes);

  const ratio = parseFloat(data.compression_ratio);
  statRatio.textContent    = `${ratio >= 0 ? '-' : '+'}${Math.abs(ratio)}%`;
  statVariance.textContent = `${data.explained_variance}%`;
  statK.textContent        = data.num_components_used;
  const [h, w]             = data.original_dimensions;
  statDims.textContent     = `${w} x ${h} px`;

  statsGrid.classList.add('visible');
  renderAnalysis(data);

  const ts = '?t=' + Date.now();
  imgOriginal.src   = data.original_url + ts;
  imgCompressed.src = data.compressed_url + ts;
  setDivider(50);

  plotSection.style.display = data.plot_url ? 'block' : 'none';
  if (data.plot_url) plotImg.src = data.plot_url + ts;

  btnDownload.href     = `/download/${data.compressed_filename}`;
  btnDownload.download = `pca_k${data.num_components_used}_${selectedFile.name.replace(/\.[^.]+$/, '')}.png`;

  resultsSection.classList.add('visible');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAnalysis(data) {
  const orig  = data.original_size_bytes;
  const comp  = data.compressed_size_bytes;
  const saved = orig - comp;
  const [h, w] = data.original_dimensions;
  const maxK   = Math.min(w, h);

  const fmt = (b) => ({
    bytes: `${b.toLocaleString()} bytes`,
    kb:    `${(b / 1024).toFixed(2)} KB`,
    mb:    `${(b / 1048576).toFixed(4)} MB`,
  });

  const o = fmt(orig);
  const c = fmt(comp);
  const s = fmt(Math.abs(saved));

  el('an-orig-bytes').textContent  = o.bytes;
  el('an-orig-kb').textContent     = o.kb;
  el('an-orig-mb').textContent     = o.mb;
  el('an-comp-bytes').textContent  = c.bytes;
  el('an-comp-kb').textContent     = c.kb;
  el('an-comp-mb').textContent     = c.mb;
  el('an-saved-bytes').textContent = (saved >= 0 ? '−' : '+') + s.bytes;
  el('an-saved-kb').textContent    = (saved >= 0 ? '−' : '+') + s.kb;
  el('an-saved-mb').textContent    = (saved >= 0 ? '−' : '+') + s.mb;
  el('an-ratio').textContent       = `${Math.abs(data.compression_ratio)}% ${saved >= 0 ? 'reduction' : 'increase'}`;
  el('an-variance').textContent    = `${data.explained_variance}% of image information retained`;
  el('an-dims').textContent        = `${w} × ${h} px  (width × height)`;
  el('an-k').textContent           = `${data.num_components_used} of ${maxK} max`;
  el('an-k-max').textContent       = `${maxK}  (= min(width, height))`;

  analysisPanel.classList.add('visible');
}

function hideResults() {
  statsGrid.classList.remove('visible');
  analysisPanel.classList.remove('visible');
  resultsSection.classList.remove('visible');
  plotSection.style.display = 'none';
}

let isDragging = false;

function setDivider(pct) {
  pct = Math.max(0, Math.min(100, pct));
  dividerLine.style.left   = `${pct}%`;
  dividerHandle.style.left = `${pct}%`;
  imgAfter.style.clipPath  = `inset(0 ${100 - pct}% 0 0)`;
}

function getPct(clientX) {
  const rect = compWrapper.getBoundingClientRect();
  return ((clientX - rect.left) / rect.width) * 100;
}

compWrapper.addEventListener('mousedown', e => { isDragging = true; setDivider(getPct(e.clientX)); });
window.addEventListener('mouseup',   ()  => { isDragging = false; });
window.addEventListener('mousemove', e   => { if (isDragging) setDivider(getPct(e.clientX)); });

compWrapper.addEventListener('touchstart', e => {
  isDragging = true;
  setDivider(getPct(e.touches[0].clientX));
}, { passive: true });
window.addEventListener('touchend',  ()  => { isDragging = false; });
window.addEventListener('touchmove', e   => {
  if (isDragging) setDivider(getPct(e.touches[0].clientX));
}, { passive: true });

function showError(msg) {
  clearTimeout(toastTimer);
  errorToast.textContent = msg;
  errorToast.classList.add('visible');
  toastTimer = setTimeout(() => errorToast.classList.remove('visible'), 5000);
}
