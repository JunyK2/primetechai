const ASSETS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'SOLUSDT', name: 'Solana', icon: '◎' },
  { symbol: 'BNBUSDT', name: 'BNB', icon: '◆' },
  { symbol: 'XRPUSDT', name: 'XRP', icon: '✕' },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: '◇' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'Ð' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', icon: '▲' }
];

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-70b-versatile";

let selectedAsset = 'BTCUSDT', selectedAssetIcon = '₿';
let printAsset = 'BTCUSDT', printAssetIcon = '';
let manualAsset = 'BTCUSDT', manualAssetIcon = '₿';
let signalAsset = 'BTCUSDT', signalAssetIcon = '₿';
let optAsset = 'BTCUSDT', optAssetIcon = '';
let uploadedImages = [], isAnalyzing = false, isGenerating = false, generatedPrints = {};
let visualTableEnabled = true, experimentalMode = true;
let currentTradeData = null, chartKlines = {}, currentChartView = 'tv', currentSignalTf = '1h';
let manualChartKlines = {}, manualCurrentChartView = 'custom', manualCurrentSignalTf = '1h';
let manualTradeData = null, manualAnalysisDate = null, manualAnalysisTimestamp = null;
let analysisTimerInterval = null, analysisStartTime = 0;
let rateLimitTimerInterval = null, rateLimitSeconds = 60;
let savedAnalyses = [], savedSets = [], currentAnalysisData = null;
let analysisGroups = [], currentAnalysisIndex = 0;
let lastAnalysisImages = [], lastAnalysisPrompt = '';
let dailyRequests = 0, manualAnalyses = [], currentManualAnalysisIndex = 0;
let globalCustomPrompt = '';
let signalAnalyses = [], currentSignalAnalysisIndex = 0;
let signalTradeData = null, signalAnalysisDate = null, signalCharts = {};
let signalCurrentTf = '1h', signalCurrentView = 'custom', signalShowingOriginal = true;
let optimizerCharts = [], optimizerItems = [], optimizerIsGenerating = false, optimizerWinRateResult = '';

// Variáveis para Win/Loss manual
let winLossDirection = 'LONG';
let winLossRecuo = null;
let winLossAlvo = null;

// Variáveis do Gerador Tester
let testerChartImageData = {};

const FirebaseService = {
  enabled: false, config: null,
  async init(c) { this.config = c; this.enabled = true; },
  async saveAnalysis(a) { return this.saveAnalysisLocal(a); },
  async getAnalyses() { return this.getAnalysesLocal(); },
  async updateAnalysis(id, u) { return this.updateAnalysisLocal(id, u); },
  async saveNotes(n) { return this.saveNotesLocal(n); },
  async getNotes() { return this.getNotesLocal(); },
  async saveSet(s) { return this.saveSetLocal(s); },
  async getSets() { return this.getSetsLocal(); },
  saveAnalysisLocal(a) { const arr = JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); arr.unshift(a); localStorage.setItem('savedAnalyses', JSON.stringify(arr)); return a; },
  getAnalysesLocal() { return JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); },
  updateAnalysisLocal(id, u) { const arr = JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); const i = arr.findIndex(a => a.id === id); if (i !== -1) { arr[i] = { ...arr[i], ...u }; localStorage.setItem('savedAnalyses', JSON.stringify(arr)); } return arr[i]; },
  saveNotesLocal(n) { localStorage.setItem('userNotes', n); return n; },
  getNotesLocal() { return localStorage.getItem('userNotes') || ''; },
  saveSetLocal(s) { const arr = JSON.parse(localStorage.getItem('savedSets') || '[]'); arr.unshift(s); localStorage.setItem('savedSets', JSON.stringify(arr)); return s; },
  getSetsLocal() { return JSON.parse(localStorage.getItem('savedSets') || '[]'); }
};

document.addEventListener('DOMContentLoaded', () => {
  const sk = localStorage.getItem('geminiApiKey'), sm = localStorage.getItem('geminiModel');
  const sg = localStorage.getItem('groqApiKey'), sbk = localStorage.getItem('binanceApiKey');
  const sbs = localStorage.getItem('binanceApiSecret'), sv = localStorage.getItem('visualTable');
  const se = localStorage.getItem('experimental'), sc = localStorage.getItem('capital');
  const sr = localStorage.getItem('riskPercent'), sgp = localStorage.getItem('globalCustomPrompt');
  const sdr = localStorage.getItem('dailyRequests'), slr = localStorage.getItem('lastResetDate');
  if (sk) document.getElementById('geminiApiKey').value = sk;
  if (sm) document.getElementById('geminiModel').value = sm;
  if (sg) document.getElementById('groqApiKey').value = sg;
  if (sbk) document.getElementById('binanceApiKey').value = sbk;
  if (sbs) document.getElementById('binanceApiSecret').value = sbs;
  if (sgp) { globalCustomPrompt = sgp; document.getElementById('globalCustomPrompt').value = sgp; }
  if (sv !== null) { visualTableEnabled = sv === 'true'; document.getElementById('toggleVisualTable').checked = visualTableEnabled; }
  if (se !== null) { experimentalMode = se === 'true'; document.getElementById('toggleExperimental').checked = experimentalMode; }
  if (sc) document.getElementById('capitalInput').value = sc;
  if (sr) document.getElementById('riskPercentInput').value = sr;
  if (sdr && slr) { const now = new Date(), bt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })); if (slr === bt.toDateString()) dailyRequests = parseInt(sdr) || 0; }
  document.getElementById('globalCustomPrompt').addEventListener('input', (e) => { globalCustomPrompt = e.target.value; localStorage.setItem('globalCustomPrompt', globalCustomPrompt); });
  
  setNow(); setPrintNow(); setSignalNow(); 
  buildAssetDropdowns(); loadSavedAnalyses(); loadSavedSets(); loadNotes(); updateFirebaseWarning(); updateRequestsCounter();
  
  // Inicializar data do Gerador Tester
  const nowTester = new Date();
  nowTester.setMinutes(nowTester.getMinutes() - nowTester.getTimezoneOffset());
  if (document.getElementById('testerDateTime')) {
    document.getElementById('testerDateTime').value = nowTester.toISOString().slice(0, 16);
  }
});

['geminiApiKey', 'geminiModel', 'groqApiKey', 'binanceApiKey', 'binanceApiSecret'].forEach(id => { document.getElementById(id).addEventListener('change', (e) => localStorage.setItem(id, e.target.value)); });
['capitalInput', 'riskPercentInput'].forEach(id => { document.getElementById(id).addEventListener('change', (e) => localStorage.setItem(id.replace('Input', ''), e.target.value)); });

function saveToggle(k, v) { localStorage.setItem(k, v); if (k === 'visualTable') visualTableEnabled = v; if (k === 'experimental') { experimentalMode = v; updateFirebaseWarning(); } }
function updateFirebaseWarning() { const w = document.getElementById('firebaseWarning'); if (w) w.style.display = experimentalMode ? 'block' : 'none'; }
function toggleApiSettings() { const s = document.getElementById('apiSection'); s.style.display = s.style.display === 'none' ? 'block' : 'none'; }
function toggleApiContent() { document.getElementById('apiToggle').classList.toggle('open'); document.getElementById('apiContent').classList.toggle('open'); }
function toggleNotesContent() { document.getElementById('notesToggle').classList.toggle('open'); document.getElementById('notesContent').classList.toggle('open'); }
function setNow() { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); document.getElementById('chartDate').value = n.toISOString().slice(0, 16); }
function setPrintNow() { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); document.getElementById('printDate').value = n.toISOString().slice(0, 16); }
function setSignalNow() { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); document.getElementById('signalDate').value = n.toISOString().slice(0, 16); }

function buildAssetDropdowns() {
  const mk = (assets, sel, fn) => assets.map(a => `<div class="asset-option ${a.symbol === sel ? 'selected' : ''}" data-asset="${a.symbol}" data-icon="${a.icon}" onclick="${fn}(this)"><div class="asset-option-icon">${a.icon}</div><div><div class="asset-option-name">${a.name}</div><div class="asset-option-pair">${a.symbol}</div></div></div>`).join('');
  document.getElementById('assetDropdown').innerHTML = mk(ASSETS, selectedAsset, 'selectAsset');
  document.getElementById('printAssetDropdown').innerHTML = mk(ASSETS, printAsset, 'selectPrintAsset');
  document.getElementById('manualAssetDropdown').innerHTML = mk(ASSETS, manualAsset, 'selectManualAsset');
  document.getElementById('signalAssetDropdown').innerHTML = mk(ASSETS, signalAsset, 'selectSignalAsset');
  document.getElementById('optAssetDropdown').innerHTML = mk(ASSETS, optAsset, 'selectOptAsset');
}

function selectAsset(el) { selectedAsset = el.dataset.asset; selectedAssetIcon = el.dataset.icon; document.getElementById('selectedAssetIcon').textContent = selectedAssetIcon; document.getElementById('selectedAssetName').textContent = selectedAsset; document.querySelectorAll('#assetDropdown .asset-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); document.getElementById('assetDropdown').classList.remove('open'); }
function selectPrintAsset(el) { printAsset = el.dataset.asset; printAssetIcon = el.dataset.icon; document.getElementById('printSelectedIcon').textContent = printAssetIcon; document.getElementById('printSelectedName').textContent = printAsset; document.querySelectorAll('#printAssetDropdown .asset-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); document.getElementById('printAssetDropdown').classList.remove('open'); }
function selectManualAsset(el) { manualAsset = el.dataset.asset; manualAssetIcon = el.dataset.icon; document.getElementById('manualSelectedIcon').textContent = manualAssetIcon; document.getElementById('manualSelectedName').textContent = manualAsset; document.querySelectorAll('#manualAssetDropdown .asset-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); document.getElementById('manualAssetDropdown').classList.remove('open'); }
function selectSignalAsset(el) { signalAsset = el.dataset.asset; signalAssetIcon = el.dataset.icon; document.getElementById('signalSelectedIcon').textContent = signalAssetIcon; document.getElementById('signalSelectedName').textContent = signalAsset; document.querySelectorAll('#signalAssetDropdown .asset-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); document.getElementById('signalAssetDropdown').classList.remove('open'); }
function selectOptAsset(el) { optAsset = el.dataset.asset; optAssetIcon = el.dataset.icon; document.getElementById('optSelectedIcon').textContent = optAssetIcon; document.getElementById('optSelectedName').textContent = optAsset; document.querySelectorAll('#optAssetDropdown .asset-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); document.getElementById('optAssetDropdown').classList.remove('open'); }
function toggleAssetDropdown() { document.getElementById('assetDropdown').classList.toggle('open'); }
function togglePrintAssetDropdown() { document.getElementById('printAssetDropdown').classList.toggle('open'); }
function toggleManualAssetDropdown() { document.getElementById('manualAssetDropdown').classList.toggle('open'); }
function toggleSignalAssetDropdown() { document.getElementById('signalAssetDropdown').classList.toggle('open'); }
function toggleOptAssetDropdown() { document.getElementById('optAssetDropdown').classList.toggle('open'); }
document.addEventListener('click', (e) => { if (!e.target.closest('.asset-selector')) document.querySelectorAll('.asset-dropdown').forEach(d => d.classList.remove('open')); });

function switchPage(pageId, navEl) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(pageId).classList.add('active'); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); if (navEl) navEl.classList.add('active'); window.scrollTo(0, 0); }
function showToast(msg, type = 'info') { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast show ' + type; setTimeout(() => t.classList.remove('show'), 3000); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function calculateSMA(data, period) { const sma = []; for (let i = 0; i < data.length; i++) { if (i < period - 1) sma.push(null); else { let s = 0; for (let j = 0; j < period; j++) s += data[i - j]; sma.push(s / period); } } return sma; }
function formatVolume(v) { if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'; return v.toFixed(2); }
function formatPrice(p) { if (p < 1) return p.toFixed(4); if (p < 100) return p.toFixed(3); return p.toFixed(2); }
function niceNum(range, round) { const exp = Math.floor(Math.log10(range)); const frac = range / Math.pow(10, exp); let nf; if (round) { nf = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10; } else { nf = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10; } return nf * Math.pow(10, exp); }
function calculateNiceScale(min, max, numTicks = 8) { const range = max - min; let ts = niceNum(range / (numTicks - 1), true); let nMin = Math.floor(min / ts) * ts; let nMax = Math.ceil(max / ts) * ts; const nat = Math.round((nMax - nMin) / ts) + 1; if (nat < 6) { ts /= 2; nMin = Math.floor(min / ts) * ts; nMax = Math.ceil(max / ts) * ts; } else if (nat > 10) { ts *= 2; nMin = Math.floor(min / ts) * ts; nMax = Math.ceil(max / ts) * ts; } return { min: nMin, max: nMax, tickSpacing: ts }; }

function drawTradingViewChart(klines, symbol, interval, endTimeDate, customDate) {
  const canvas = document.createElement('canvas'); const dpr = window.devicePixelRatio || 1; const width = 800, height = 600;
  canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, width, height);
  const candles = klines.map(k => ({ time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
  const prices = candles.flatMap(c => [c.high, c.low]); const minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
  const scale = calculateNiceScale(minPrice, maxPrice, 8); const yMin = scale.min, yMax = scale.max, tickSpacing = scale.tickSpacing;
  const rightPad = 4, chartLeft = 10, chartRight = width - 80, chartTop = 60, chartBottom = height - 120;
  const totalSlots = candles.length + rightPad, chartWidth = chartRight - chartLeft;
  const spacing = chartWidth / totalSlots, candleWidth = Math.max(2, spacing * 0.7), chartHeight = chartBottom - chartTop;
  function priceToY(p) { return chartTop + chartHeight * (1 - (p - yMin) / (yMax - yMin)); }
  function indexToX(i) { return chartLeft + spacing * i + spacing / 2; }
  const lastCandle = candles[candles.length - 1], prevCandle = candles.length >= 2 ? candles[candles.length - 2] : lastCandle;
  const isLastGreen = lastCandle.close >= lastCandle.open, ohlcColor = isLastGreen ? '#26a69a' : '#ef5350';
  ctx.fillStyle = '#d1d4dc'; ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`${symbol.replace('USDT', ' / USDT')} · ${interval.toUpperCase()}`, chartLeft, 25);
  const pc = lastCandle.close - prevCandle.close, pct = (pc / prevCandle.close) * 100;
  const cc = pc >= 0 ? '#26a69a' : '#ef5350', cs = pc >= 0 ? '+' : '';
  ctx.fillStyle = cc; ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${cs}${pc.toFixed(2)} (${cs}${pct.toFixed(2)}%)`, chartLeft + 200, 25);
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'; const os = 380;
  ctx.fillStyle = '#787b86'; ctx.fillText('O', os, 25); ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.open), os + 12, 25);
  ctx.fillStyle = '#787b86'; ctx.fillText('H', os + 80, 25); ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.high), os + 92, 25);
  ctx.fillStyle = '#787b86'; ctx.fillText('L', os + 160, 25); ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.low), os + 172, 25);
  ctx.fillStyle = '#787b86'; ctx.fillText('C', os + 240, 25); ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.close), os + 252, 25);
  if (interval === '4h' && customDate) { const d = new Date(customDate); const ds = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(ds, chartLeft, 45); }
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1; ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  for (let p = yMin; p <= yMax; p += tickSpacing) { const y = priceToY(p); ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke(); ctx.fillStyle = '#787b86'; ctx.textAlign = 'left'; ctx.fillText(formatPrice(p), chartRight + 8, y + 4); }
  const timeLabels = [];
  if (interval === '4h') { const so = 6 - (candles.length % 6); for (let i = so; i < candles.length; i += 6) { const d = new Date(candles[i].time); const x = indexToX(i); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, chartTop); ctx.lineTo(x, chartBottom); ctx.stroke(); timeLabels.push({ x, label: String(d.getDate()) }); } } else {
    candles.forEach((c, i) => { const d = new Date(c.time); const h = d.getHours(), m = d.getMinutes(); let sm = false, lb = ''; if (interval === '1h' && m === 0 && h % 6 === 0) { sm = true; lb = h === 0 ? String(d.getDate()) : `${String(h).padStart(2, '0')}:00`; } else if (interval === '15m' && m === 0 && h % 3 === 0) { sm = true; lb = h === 0 ? String(d.getDate()) : `${String(h).padStart(2, '0')}:00`; } else if (interval === '5m' && m === 0) { sm = true; lb = h === 0 ? String(d.getDate()) : `${String(h).padStart(2, '0')}:00`; } if (sm) { const x = indexToX(i); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, chartTop); ctx.lineTo(x, chartBottom); ctx.stroke(); timeLabels.push({ x, label: lb }); } });
  }
  candles.forEach((c, i) => { const x = indexToX(i); const ig = c.close >= c.open; const col = ig ? '#26a69a' : '#ef5350'; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, priceToY(c.high)); ctx.lineTo(x, priceToY(c.low)); ctx.stroke(); const bt = priceToY(Math.max(c.open, c.close)), bb = priceToY(Math.min(c.open, c.close)); ctx.fillStyle = col; ctx.fillRect(x - candleWidth / 2, bt, candleWidth, Math.max(1, bb - bt)); });
  const lp = lastCandle.close, ly = priceToY(lp);
  ctx.strokeStyle = isLastGreen ? '#26a69a' : '#ef5350'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(chartLeft, ly); ctx.lineTo(chartRight, ly); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = isLastGreen ? '#26a69a' : '#ef5350'; ctx.fillRect(chartRight, ly - 10, 78, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(formatPrice(lp), chartRight + 4, ly + 4);
  const vols = candles.map(c => c.volume), sma9 = calculateSMA(vols, 9), maxV = Math.max(...vols), vH = 50, vT = chartBottom + 10;
  ctx.fillStyle = '#787b86'; ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`Volume · ${symbol.replace('USDT', '')} SMA 9  ${formatVolume(lastCandle.volume)}`, chartLeft, vT - 2);
  candles.forEach((c, i) => { const x = indexToX(i); const ig = c.close >= c.open; const bh = (c.volume / maxV) * vH; ctx.fillStyle = ig ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)'; ctx.fillRect(x - candleWidth / 2, vT + vH - bh, candleWidth, bh); });
  ctx.strokeStyle = '#f0b90b'; ctx.lineWidth = 1.5; ctx.beginPath(); let st = false; sma9.forEach((v, i) => { if (v !== null) { const x = indexToX(i), y = vT + vH - (v / maxV) * vH; if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); } }); ctx.stroke();
  ctx.fillStyle = '#787b86'; ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.textAlign = 'center'; timeLabels.forEach(tl => ctx.fillText(tl.label, tl.x, vT + vH + 18));
  return canvas;
}

async function fetchBinanceKlines(symbol, interval, endTime, limit = 85) { let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`; if (endTime) url += `&endTime=${endTime}`; const r = await fetch(url); if (!r.ok) throw new Error(`Binance API: ${r.status}`); return await r.json(); }
async function getChartFromBinance(symbol, timeframe, endDate) { const im = { '4h': '4h', '1h': '1h', '15m': '15m', '5m': '5m' }; let endTime = null; if (endDate) endTime = new Date(endDate).getTime(); const klines = await fetchBinanceKlines(symbol, im[timeframe], endTime, 85); const canvas = drawTradingViewChart(klines, symbol, timeframe, endDate, endDate); const chart = canvas.toDataURL('image/jpeg', 0.7); return { klines, chart }; }

function drawAutoAnalysisLine(canvasId, tf, klines) {
  if (!klines || klines.length === 0) return;
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  let candlesBack = 0;
  if (tf === '1h') candlesBack = 48;
  else if (tf === '4h') candlesBack = 12;
  else return;
  if (klines.length < candlesBack) return;
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  const w = canvas.width / dpr, h = canvas.height / dpr;
  const cL = 10, cR = w - 75, cT = 10, cB = h - 10;
  const cW = cR - cL;
  const sp = cW / klines.length;
  const i2x = (i) => cL + sp * i + sp / 2;
  const targetIdx = klines.length - candlesBack;
  const x = i2x(targetIdx);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x, cT); ctx.lineTo(x, cB); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ANÁLISE', x, cT - 3);
}

function drawSignalCanvasWithRetry(klines, signals, tf, canvasId, analysisTimestamp, maxRetries = 10, drawLine = false) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const wMap = { signalCanvas: 'chartWrapper', manualSignalCanvas: 'manualChartWrapper', resultSignalCanvas: 'resultChartWrapper', manualResultSignalCanvas: 'manualResultChartWrapper', optResultSignalCanvas: 'optResultChartWrapper', signalManualCanvas: 'signalChartWrapper' };
  const wrapperId = wMap[canvasId]; if (!wrapperId) return;
  const wrapper = document.getElementById(wrapperId); if (!wrapper) return;
  const rect = wrapper.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) { if (maxRetries > 0) setTimeout(() => drawSignalCanvasWithRetry(klines, signals, tf, canvasId, analysisTimestamp, maxRetries - 1, drawLine), 200); return; }
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h);
  const candles = klines.map(k => ({ time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
  const prices = candles.flatMap(c => [c.high, c.low]); const mn = Math.min(...prices), mx = Math.max(...prices); const pr = mx - mn || 1; const pd = pr * 0.2;
  const yMn = mn - pd, yMx = mx + pd;
  const cL = 10, cR = w - 75, cT = 10, cB = h - 10; const cW = cR - cL, cH = cB - cT;
  const cw = Math.max(2, (cW / candles.length) * 0.7); const sp = cW / candles.length;
  const p2y = (p) => cT + cH * (1 - (p - yMn) / (yMx - yMn));
  const i2x = (i) => cL + sp * i + sp / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) { const y = cT + (cH / 6) * i; ctx.beginPath(); ctx.moveTo(cL, y); ctx.lineTo(cR, y); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px Inter'; ctx.textAlign = 'right'; ctx.fillText((yMx - ((yMx - yMn) / 6) * i).toFixed(mn < 1 ? 4 : 2), cR + 65, y + 3); }
  candles.forEach((c, i) => { const x = i2x(i); const ig = c.close >= c.open; const col = ig ? '#26a69a' : '#ef5350'; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, p2y(c.high)); ctx.lineTo(x, p2y(c.low)); ctx.stroke(); const bt = p2y(Math.max(c.open, c.close)), bb = p2y(Math.min(c.open, c.close)); ctx.fillStyle = col; ctx.fillRect(x - cw / 2, bt, cw, Math.max(1, bb - bt)); });
  if (signals) { const { entry, stop, target } = signals; if (entry) { const ey = p2y(entry); ctx.strokeStyle = '#0a84ff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cL, ey); ctx.lineTo(cR + 70, ey); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#0a84ff'; ctx.fillRect(cR + 2, ey - 10, 68, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'left'; ctx.fillText(`ENT ${formatPrice(entry)}`, cR + 5, ey + 3); } if (stop) { const sy = p2y(stop); ctx.strokeStyle = '#ff453a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cL, sy); ctx.lineTo(cR + 70, sy); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ff453a'; ctx.fillRect(cR + 2, sy - 10, 68, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.fillText(`SL ${formatPrice(stop)}`, cR + 5, sy + 3); } if (target) { const ty = p2y(target); ctx.strokeStyle = '#30d158'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cL, ty); ctx.lineTo(cR + 70, ty); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#30d158'; ctx.fillRect(cR + 2, ty - 10, 68, 20); ctx.fillStyle = '#000'; ctx.font = 'bold 10px Inter'; ctx.fillText(`TP ${formatPrice(target)}`, cR + 5, ty + 3); } }
  if (drawLine) { drawAutoAnalysisLine(canvasId, tf, klines); }
}

function loadTradingViewWidget(symbol, tf, containerId = 'tvWidgetContainer') {
  const container = document.getElementById(containerId); if (!container) return; container.innerHTML = '';
  const im = { '4h': '240', '1h': '60', '15m': '15', '5m': '5' };
  const widget = document.createElement('div'); widget.className = 'tradingview-widget-container'; widget.style.height = '100%'; widget.style.width = '100%';
  const wd = document.createElement('div'); wd.className = 'tradingview-widget-container__widget'; wd.style.height = '100%'; wd.style.width = '100%'; widget.appendChild(wd);
  const script = document.createElement('script'); script.type = 'text/javascript'; script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'; script.async = true;
  script.innerHTML = JSON.stringify({ autosize: true, symbol: `BINANCE:${symbol}`, interval: im[tf] || '60', timezone: 'America/Sao_Paulo', theme: 'dark', style: '1', locale: 'br', backgroundColor: '#0a0a0a', gridColor: 'rgba(255,255,255,0.04)', hide_top_toolbar: false, hide_legend: false, save_image: false, calendar: false, support_host: 'https://www.tradingview.com', studies: [], show_popup_button: true });
  widget.appendChild(script); container.appendChild(widget);
}

function switchChartView(v) { currentChartView = v; document.getElementById('viewTV').classList.toggle('active', v === 'tv'); document.getElementById('viewCustom').classList.toggle('active', v === 'custom'); if (v === 'tv') { document.getElementById('tvWidgetContainer').style.display = 'block'; document.getElementById('signalCanvas').style.display = 'none'; if (chartKlines[currentSignalTf]) loadTradingViewWidget(selectedAsset, currentSignalTf); } else { document.getElementById('tvWidgetContainer').style.display = 'none'; document.getElementById('signalCanvas').style.display = 'block'; drawSignalCanvasWithRetry(chartKlines[currentSignalTf], currentTradeData, currentSignalTf, 'signalCanvas', null); } }
function switchSignalTf(tf) { currentSignalTf = tf; document.querySelectorAll('#signalTfSelector .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf)); document.getElementById('signalTfLabel').textContent = `Timeframe: ${tf.toUpperCase()}`; if (currentChartView === 'custom' && chartKlines[tf] && currentTradeData) drawSignalCanvasWithRetry(chartKlines[tf], currentTradeData, tf, 'signalCanvas', null); else if (currentChartView === 'tv') loadTradingViewWidget(selectedAsset, tf); }
function switchManualChartView(v) { manualCurrentChartView = v; document.getElementById('manualViewTV').classList.toggle('active', v === 'tv'); document.getElementById('manualViewCustom').classList.toggle('active', v === 'custom'); if (v === 'tv') { document.getElementById('manualTvWidgetContainer').style.display = 'block'; document.getElementById('manualSignalCanvas').style.display = 'none'; if (manualChartKlines[manualCurrentSignalTf]) loadTradingViewWidget(manualAsset, manualCurrentSignalTf, 'manualTvWidgetContainer'); } else { document.getElementById('manualTvWidgetContainer').style.display = 'none'; document.getElementById('manualSignalCanvas').style.display = 'block'; drawSignalCanvasWithRetry(manualChartKlines[manualCurrentSignalTf], manualTradeData, manualCurrentSignalTf, 'manualSignalCanvas', null); } }
function switchManualSignalTf(tf) { manualCurrentSignalTf = tf; document.querySelectorAll('#pageManual .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf)); document.getElementById('manualSignalTfLabel').textContent = `Timeframe: ${tf.toUpperCase()}`; if (manualCurrentChartView === 'custom' && manualChartKlines[tf] && manualTradeData) drawSignalCanvasWithRetry(manualChartKlines[tf], manualTradeData, tf, 'manualSignalCanvas', null); else if (manualCurrentChartView === 'tv') loadTradingViewWidget(manualAsset, tf, 'manualTvWidgetContainer'); }

function handleFileUpload(e) { Array.from(e.target.files).forEach(f => { if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = (ev) => { uploadedImages.push({ name: f.name, data: ev.target.result }); renderUploadedImages(); }; r.readAsDataURL(f); } }); e.target.value = ''; }
function renderUploadedImages() { const s = document.getElementById('uploadSection'), c = document.getElementById('uploadedImages'); if (uploadedImages.length > 0) s.style.display = 'block'; c.innerHTML = uploadedImages.map((img, i) => `<div class="print-preview"><img src="${img.data}" alt="${img.name}"><div class="print-preview-label">${['4H', '1H', '15M', '5M'][i] || `IMG ${i + 1}`}</div><button class="print-preview-download" onclick="removeUploadedImage(${i})" style="background:rgba(255,69,58,0.9);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#fff;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>`).join(''); }
function removeUploadedImage(i) { uploadedImages.splice(i, 1); renderUploadedImages(); if (uploadedImages.length === 0) document.getElementById('uploadSection').style.display = 'none'; }

const VISUAL_TABLE_PROMPT = `\n\n========================================================\nTABELA VISUAL — DADOS ESTRUTURADOS (OBRIGATÓRIO)\n========================================================\n\nApós toda a sua análise, você DEVE gerar um bloco JSON estruturado entre as tags [PRIME_TABLE] e [/PRIME_TABLE] com os seguintes campos.\n\n[PRIME_TABLE]\n{\n  "score": 0,\n  "score_label": "Muito Fraco|Fraco|Moderado|Bom|Muito Bom|Excelente|Excepcional",\n  "trend": "Bullish|Bearish|Neutro",\n  "signal": "LONG|SHORT|HOLD|NO TRADE",\n  "risk": "Baixo|Médio|Alto",\n  "volume": "Baixo|Médio|Alto",\n  "direction": "LONG|SHORT|NO TRADE",\n  "entry": "apenas numeros com ponto decimal SEM separador de milhar (ex: 65000.50)",\n  "stop_loss": "apenas numeros com ponto decimal SEM separador de milhar (ex: 64000.00)",\n  "target": "apenas numeros com ponto decimal SEM separador de milhar (ex: 68000.00)",\n  "risk_reward": "1:X (ex: 1:2.5)",\n  "entry_type": "IMEDIATA|PULLBACK|CONFIRMAÇÃO",\n  "confidence": "BAIXA|MÉDIA|ALTA",\n  "regime": "TENDÊNCIA|RANGE|TRANSIÇÃO|COMPRESSÃO|EXPANSÃO",\n  "strategy_name": "nome curto da estratégia",\n  "strategy_bars": [0, 0, 0, 0],\n  "analysis_date": "DD/MM/YYYY",\n  "analysis_time": "HH:MM"\n}\n[/PRIME_TABLE]\n\nREGRAS: entry, stop_loss e target DEVEM ser apenas números com ponto decimal. NUNCA use vírgulas ou pontos para separar milhares. Use 65000.50 e NÃO 65.000,50. score: 0 a 10. strategy_bars: 4 números de 0 a 100. analysis_date: DD/MM/YYYY. analysis_time: HH:MM. Este bloco é OBRIGATÓRIO no FINAL da resposta.`;

const COMPARISON_PROMPT = `Analise as seguintes respostas de IA e extraia os dados de cada análise. Para cada análise, identifique: Número, Direção (LONG/SHORT), Entrada, Stop, Alvo e R:R. Retorne APENAS um bloco JSON válido entre [COMPARISON_TABLE] e [/COMPARISON_TABLE]:\n[COMPARISON_TABLE]\n[\n  {"id": 1, "direction": "LONG", "entry": "65000", "stop": "64000", "target": "68000", "rr": "1:3"}\n]\n[/COMPARISON_TABLE]\nRespostas para analisar: `;

function startAnalysisTimer() { analysisStartTime = Date.now(); document.getElementById('analysisTimer').classList.add('active'); if (analysisTimerInterval) clearInterval(analysisTimerInterval); analysisTimerInterval = setInterval(() => { document.getElementById('analysisTimerValue').textContent = `${Math.floor((Date.now() - analysisStartTime) / 1000)}s`; }, 1000); }
function stopAnalysisTimer() { if (analysisTimerInterval) { clearInterval(analysisTimerInterval); analysisTimerInterval = null; } document.getElementById('analysisTimer').classList.remove('active'); }

async function startAnalysis() {
  if (isAnalyzing) return; const geminiKey = document.getElementById('geminiApiKey').value.trim();
  if (!geminiKey) { showToast('Configure a API Key do Gemini', 'error'); return; }
  if (!checkDailyRequests()) { showToast('Limite diário atingido.', 'error'); return; }
  isAnalyzing = true; const btn = document.getElementById('analyzeBtn'), btnText = document.getElementById('analyzeBtnText');
  btn.disabled = true; btnText.textContent = 'Analisando...'; startAnalysisTimer();
  document.getElementById('resultSection').style.display = 'block'; document.getElementById('visualElements').style.display = 'none'; document.getElementById('chartContainer').style.display = 'none'; document.getElementById('analysisTabsContainer').style.display = 'none';
  ['4h', '1h', '15m', '5m'].forEach(tf => { document.getElementById(`tf-${tf}`).className = 'tf-card'; document.getElementById(`tf-${tf}-status`).textContent = 'Aguardando'; });
  document.getElementById('resultContent').innerHTML = `<div style="text-align:center;padding:40px 0;"><div class="spinner" style="width:28px;height:28px;margin:0 auto 14px;border-width:3px;"></div><div style="font-size:14px;font-weight:500;">Analisando ${selectedAsset}...</div></div>`;
  let images = []; const tfs = ['4h', '1h', '15m', '5m']; const chartDate = document.getElementById('chartDate').value; chartKlines = {};
  try {
    if (uploadedImages.length >= 4) { images = uploadedImages.slice(0, 4).map(img => img.data); for (let i = 0; i < 4; i++) { const c = document.getElementById(`tf-${tfs[i]}`); c.classList.add('active'); document.getElementById(`tf-${tfs[i]}-status`).textContent = 'Processando'; await sleep(250); c.classList.remove('active'); c.classList.add('done'); document.getElementById(`tf-${tfs[i]}-status`).textContent = 'Concluído'; } const sb = document.getElementById('sourceBadge'); if (sb) sb.innerHTML = '<span class="method-badge manual">MANUAL</span>'; } else {
      for (let i = 0; i < tfs.length; i++) { const tf = tfs[i]; const c = document.getElementById(`tf-${tf}`); c.classList.add('active'); document.getElementById(`tf-${tf}-status`).textContent = 'Gerando'; try { const r = await getChartFromBinance(selectedAsset, tf, chartDate); images.push(r.chart); chartKlines[tf] = r.klines; c.classList.remove('active'); c.classList.add('done'); document.getElementById(`tf-${tf}-status`).textContent = 'Concluído'; } catch (err) { c.classList.remove('active'); c.classList.add('error'); document.getElementById(`tf-${tf}-status`).textContent = 'Erro'; showToast(`Erro ${tf.toUpperCase()}: ${err.message}`, 'error'); } await sleep(250); } const sb = document.getElementById('sourceBadge'); if (sb) sb.innerHTML = '<span class="method-badge binance">BINANCE</span>';
    }
    if (images.length === 0) { showToast('Nenhuma imagem disponível', 'error'); isAnalyzing = false; btn.disabled = false; btnText.textContent = 'Analisar'; stopAnalysisTimer(); return; }
    document.getElementById('resultContent').innerHTML = `<div style="text-align:center;padding:40px 0;"><div class="spinner" style="width:28px;height:28px;margin:0 auto 14px;border-width:3px;"></div><div style="font-size:14px;font-weight:500;">Gerando análise com IA...</div></div>`;
    let prompt = globalCustomPrompt.trim() || buildPrompt(selectedAsset); if (visualTableEnabled) prompt = prompt + VISUAL_TABLE_PROMPT;
    lastAnalysisImages = [...images]; lastAnalysisPrompt = prompt;
    const response = await callGemini(geminiKey, prompt, images); incrementDailyRequests();
    const tableData = parseVisualTable(response);
    const ad = { id: Date.now().toString(), asset: selectedAsset, date: new Date().toISOString(), chartDate, direction: tableData?.direction || '—', entry: parseFloat(tableData?.entry) || null, stop: parseFloat(tableData?.stop_loss) || null, target: parseFloat(tableData?.target) || null, trend: tableData?.trend || '—', signal: tableData?.signal || '—', risk: tableData?.risk || '—', volume: tableData?.volume || '—', score: tableData?.score || 0, confidence: tableData?.confidence || '—', entryType: tableData?.entry_type || '—', regime: tableData?.regime || '—', result: 'pending', fullText: response, source: 'site' };
    analysisGroups.push(ad); currentAnalysisIndex = analysisGroups.length - 1; renderAnalysisTabs(); displayAnalysisFromGroup(currentAnalysisIndex);
  } catch (error) { showToast(`Erro: ${error.message}`, 'error'); document.getElementById('resultContent').innerHTML = `<div class="empty-state"><div class="empty-state-title" style="color:var(--red);">Erro na análise</div><div class="empty-state-sub">${error.message}</div></div>`; if (error.message.toLowerCase().includes('quota exceeded') || error.message.toLowerCase().includes('retry in')) { const rm = error.message.match(/retry in ([\d.]+)s/i); if (rm) startRateLimitTimer(parseFloat(rm[1])); else startRateLimitTimer(60); } } finally { isAnalyzing = false; btn.disabled = false; btnText.textContent = 'Analisar'; stopAnalysisTimer(); }
}

async function redoAnalysis() { if (analysisGroups.length >= 5) { showToast('Limite de 5 análises!', 'error'); return; } if (!lastAnalysisImages.length || !lastAnalysisPrompt) { showToast('Nenhuma análise anterior', 'error'); return; } const gk = document.getElementById('geminiApiKey').value.trim(); if (!gk) { showToast('Configure a API Key', 'error'); return; } if (!checkDailyRequests()) { showToast('Limite atingido.', 'error'); return; } isAnalyzing = true; const btn = document.getElementById('analyzeBtn'), bt = document.getElementById('analyzeBtnText'); btn.disabled = true; bt.textContent = 'Reanalisando...'; startAnalysisTimer(); try { const r = await callGemini(gk, lastAnalysisPrompt, lastAnalysisImages); incrementDailyRequests(); const td = parseVisualTable(r); const ad = { id: Date.now().toString(), asset: selectedAsset, date: new Date().toISOString(), chartDate: document.getElementById('chartDate').value, direction: td?.direction || '—', entry: parseFloat(td?.entry) || null, stop: parseFloat(td?.stop_loss) || null, target: parseFloat(td?.target) || null, trend: td?.trend || '—', signal: td?.signal || '—', risk: td?.risk || '—', volume: td?.volume || '—', score: td?.score || 0, confidence: td?.confidence || '—', entryType: td?.entry_type || '—', regime: td?.regime || '—', result: 'pending', fullText: r, source: 'site' }; analysisGroups.push(ad); currentAnalysisIndex = analysisGroups.length - 1; renderAnalysisTabs(); displayAnalysisFromGroup(currentAnalysisIndex); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } finally { isAnalyzing = false; btn.disabled = false; bt.textContent = 'Analisar'; stopAnalysisTimer(); } }

function renderAnalysisTabs() { const c = document.getElementById('analysisTabsContainer'), t = document.getElementById('analysisTabs'); if (analysisGroups.length <= 1) { c.style.display = 'none'; return; } c.style.display = 'block'; t.innerHTML = analysisGroups.map((a, i) => `<button class="analysis-tab ${i === currentAnalysisIndex ? 'active' : ''}" onclick="switchAnalysisTab(${i})">Análise ${i + 1}</button>`).join(''); }
function switchAnalysisTab(i) { currentAnalysisIndex = i; renderAnalysisTabs(); displayAnalysisFromGroup(i); }
function displayAnalysisFromGroup(i) { const a = analysisGroups[i]; if (a?.fullText) displayResult(a.fullText, true); }

function startRateLimitTimer(s) { rateLimitSeconds = Math.ceil(s); document.getElementById('rateLimitTimer').classList.add('active'); document.getElementById('rateLimitValue').textContent = rateLimitSeconds; if (rateLimitTimerInterval) clearInterval(rateLimitTimerInterval); rateLimitTimerInterval = setInterval(() => { rateLimitSeconds--; document.getElementById('rateLimitValue').textContent = rateLimitSeconds; if (rateLimitSeconds <= 0) { clearInterval(rateLimitTimerInterval); rateLimitTimerInterval = null; document.getElementById('rateLimitTimer').classList.remove('active'); showToast('✅ API restaurada!', 'success'); } }, 1000); }

function parseVisualTable(t) { const m = t.match(/\[PRIME_TABLE\]([\s\S]*?)\[\/PRIME_TABLE\]/); if (!m) return null; try { return JSON.parse(m[1].trim()); } catch (e) { return null; } }

async function fetchGroqTable(resp) { const gk = document.getElementById('groqApiKey').value.trim(); if (!gk) { showToast('Configure a API Key do Groq', 'error'); return null; } document.getElementById('groqLoading').classList.add('active'); try { const r = await fetch(GROQ_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gk}` }, body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "system", content: "Extraia dados de trading e retorne JSON dentro de [PRIME_TABLE] e [/PRIME_TABLE]. Preços sem separador de milhar." }, { role: "user", content: COMPARISON_PROMPT + "\n\n" + resp }], temperature: 0.1, max_tokens: 1000 }) }); if (!r.ok) throw new Error(`Groq: ${r.status}`); const d = await r.json(); const c = d.choices?.[0]?.message?.content || ''; const td = parseVisualTable(c); if (!td) { const jm = c.match(/\{[\s\S]*\}/); if (jm) return JSON.parse(jm[0]); throw new Error('Tabela não encontrada'); } return td; } catch (e) { showToast(`Erro Groq: ${e.message}`, 'error'); return null; } finally { document.getElementById('groqLoading').classList.remove('active'); } }

function applyVisualTable(data, isManual = false) {
  if (!data) return; const p = isManual ? 'manual' : ''; const veId = isManual ? 'manualVisualElements' : 'visualElements'; const ccId = isManual ? 'manualChartContainer' : 'chartContainer';
  const ve = document.getElementById(veId); if (ve) ve.style.display = 'block';
  const te = document.getElementById(`${p}InsightTrend`); if (te && data.trend) { te.textContent = data.trend; te.style.color = data.trend.toLowerCase() === 'bullish' ? 'var(--green)' : data.trend.toLowerCase() === 'bearish' ? 'var(--red)' : 'var(--orange)'; }
  const se = document.getElementById(`${p}InsightSignal`); if (se && data.signal) { const s = data.signal.toUpperCase(); se.textContent = s === 'NO TRADE' ? 'HOLD' : s; se.style.color = s === 'LONG' ? 'var(--green)' : s === 'SHORT' ? 'var(--red)' : 'var(--blue)'; }
  const re = document.getElementById(`${p}InsightRisk`); if (re && data.risk) { re.textContent = data.risk; re.style.color = data.risk.toLowerCase() === 'baixo' ? 'var(--green)' : data.risk.toLowerCase() === 'médio' ? 'var(--orange)' : 'var(--red)'; }
  const voe = document.getElementById(`${p}InsightVolume`); if (voe && data.volume) { voe.textContent = data.volume; voe.style.color = 'var(--purple)'; }
  const entry = parseFloat(data.entry) || null, stop = parseFloat(data.stop_loss) || null, target = parseFloat(data.target) || null;
  const ee = document.getElementById(`${p}TradeEntry`); if (ee && entry) ee.textContent = data.entry;
  const ste = document.getElementById(`${p}TradeStop`); if (ste && stop) ste.textContent = data.stop_loss;
  const tte = document.getElementById(`${p}TradeTarget`); if (tte && target) tte.textContent = data.target;
  const de = document.getElementById(`${p}StrategyDirection`); if (de && data.direction) { de.textContent = data.direction; de.style.color = data.direction === 'LONG' ? 'var(--green)' : data.direction === 'SHORT' ? 'var(--red)' : 'var(--text-secondary)'; }
  const tye = document.getElementById(`${p}StrategyType`); if (tye && data.entry_type) tye.textContent = data.entry_type;
  const ste2 = document.getElementById(`${p}StrategyStatus`); if (ste2 && data.confidence) { ste2.textContent = data.confidence; ste2.className = 'strategy-status ' + (data.confidence === 'ALTA' ? 'ideal' : data.confidence === 'MÉDIA' ? 'warning' : 'danger'); }
  const be = document.getElementById(`${p}StrategyBars`); if (be && Array.isArray(data.strategy_bars)) { be.innerHTML = ''; data.strategy_bars.forEach(v => { const c = Math.max(0, Math.min(100, v)); be.innerHTML += `<div class="strategy-bar"><div class="strategy-bar-fill ${c >= 70 ? 'green' : c >= 40 ? 'orange' : 'red'}" style="width:${c}%"></div></div>`; }); }
  if (entry && stop && target) { const risk = Math.abs(entry - stop), reward = Math.abs(target - entry), rr = reward / risk, total = risk + reward; const rc = document.getElementById(`${p}RrCard`); if (rc) rc.style.display = 'block'; const rb = document.getElementById(`${p}RrBarRisk`); if (rb) rb.style.width = (risk / total * 100) + '%'; const rw = document.getElementById(`${p}RrBarReward`); if (rw) { rw.style.left = (risk / total * 100) + '%'; rw.style.width = (reward / total * 100) + '%'; } const rl = document.getElementById(`${p}RrLabelRisk`); if (rl) rl.textContent = `Risco: ${risk.toFixed(risk < 1 ? 4 : 2)}`; const rlr = document.getElementById(`${p}RrLabelReward`); if (rlr) rlr.textContent = `Retorno: ${reward.toFixed(reward < 1 ? 4 : 2)}`; const rre = document.getElementById(`${p}RrRatio`); if (rre) { rre.textContent = `R:R 1:${rr.toFixed(2)}`; rre.style.color = rr >= 2 ? 'var(--green)' : rr >= 1 ? 'var(--orange)' : 'var(--red)'; } }
  const ctp = document.getElementById(`${p}CopyTp`); if (ctp && entry) ctp.textContent = target ? target.toFixed(target < 1 ? 4 : 2) : '—';
  if (stop) { const sd = calculateSLDifference(isManual ? manualAsset : selectedAsset, stop); const cst = document.getElementById(`${p}CopySlTrigger`); const csl = document.getElementById(`${p}CopySlLimit`); if (cst) cst.textContent = stop.toFixed(stop < 1 ? 4 : 2); if (csl) csl.textContent = (stop - sd).toFixed(stop < 1 ? 4 : 2); }
  const td = { entry, stop, target, direction: data.direction };
  if (isManual) { manualTradeData = td; manualAnalysisDate = data.analysis_date ? parseAnalysisDate(data.analysis_date, data.analysis_time) : null; manualAnalysisTimestamp = manualAnalysisDate; const cc = document.getElementById(ccId); if (cc) cc.style.display = 'block'; loadTradingViewWidget(manualAsset, '1h', 'manualTvWidgetContainer'); setTimeout(() => drawSignalCanvasWithRetry(manualChartKlines['1h'], td, '1h', 'manualSignalCanvas', null), 500); switchManualChartView('custom'); } else { currentTradeData = td; const cc = document.getElementById(ccId); if (cc) cc.style.display = 'block'; document.querySelectorAll('#signalTfSelector .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === '1h')); const sl = document.getElementById('signalTfLabel'); if (sl) sl.textContent = 'Timeframe: 1H'; loadTradingViewWidget(selectedAsset, '1h'); setTimeout(() => drawSignalCanvasWithRetry(chartKlines['1h'], td, '1h', 'signalCanvas', null), 500); switchChartView('tv'); }
  if (!isManual) currentAnalysisData = { id: Date.now().toString(), asset: selectedAsset, date: new Date().toISOString(), chartDate: document.getElementById('chartDate').value, direction: data.direction, entry, stop, target, trend: data.trend, signal: data.signal, risk: data.risk, volume: data.volume, score: data.score, confidence: data.confidence, entryType: data.entry_type, regime: data.regime, result: 'pending', source: 'site' };
}

function parseAnalysisDate(ds, ts) { try { const p = ds.split('/'); if (p.length !== 3) return null; let h = 0, m = 0; if (ts) { const tp = ts.split(':'); if (tp.length >= 2) { h = parseInt(tp[0]); m = parseInt(tp[1]); } } const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]), h, m); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); } catch (e) { return null; } }
function calculateSLDifference(a, sp) { const p = parseFloat(sp); if (a === 'BTCUSDT') return 10; if (a === 'ETHUSDT') return 2; if (a === 'SOLUSDT' || a === 'BNBUSDT') return 0.5; if (a === 'XRPUSDT' || a === 'ADAUSDT') return 0.05; if (a === 'DOGEUSDT') return 0.01; if (a === 'AVAXUSDT') return 0.2; return p * 0.001; }
function copyToClipboard(eid, btn) { const t = document.getElementById(eid).textContent; if (t === '—') { showToast('Valor não disponível', 'error'); return; } navigator.clipboard.writeText(t).then(() => { btn.classList.add('copied'); btn.innerHTML = 'Copiado'; setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = 'Copiar'; }, 1500); }).catch(() => showToast('Erro ao copiar', 'error')); }
function openPnLModal() { document.getElementById('pnlModal').classList.add('active'); }
function closePnLModal() { document.getElementById('pnlModal').classList.remove('active'); }

function calculateTrade() { if (!currentTradeData && !manualTradeData && !signalTradeData) { showToast('Faça uma análise primeiro', 'error'); return; } const td = currentTradeData || manualTradeData || signalTradeData; const cap = parseFloat(document.getElementById('capitalInput').value), rp = parseFloat(document.getElementById('riskPercentInput').value), mf = parseFloat(document.getElementById('makerFeeInput').value) / 100, tf = parseFloat(document.getElementById('takerFeeInput').value) / 100; if (!cap || !rp) { showToast('Preencha capital e risco', 'error'); return; } const { entry, stop, target, direction } = td; if (!entry || !stop || !target) { showToast('Dados incompletos', 'error'); return; } const ra = cap * (rp / 100), sd = Math.abs(entry - stop), sdp = sd / entry, ps = ra / sdp, lev = ps / cap, ef = ps * mf, ew = ps * (target / entry) * tf, el = ps * (stop / entry) * tf, tw = ef + ew, tl = ef + el, pr = direction === 'LONG' ? (target - entry) : (entry - target), lo = direction === 'LONG' ? (entry - stop) : (stop - entry), pa = (pr / entry) * ps, la = (lo / entry) * ps; document.getElementById('calcCapital').textContent = `$${cap.toFixed(2)}`; document.getElementById('calcRisk').textContent = `$${ra.toFixed(2)} (${rp}%)`; document.getElementById('calcLeverage').textContent = `${lev.toFixed(1)}x`; document.getElementById('calcPosition').textContent = `$${ps.toFixed(2)}`; document.getElementById('calcEntryFee').textContent = `-$${ef.toFixed(4)}`; document.getElementById('calcExitFee').textContent = `-$${ew.toFixed(4)}`; document.getElementById('calcTotalFees').textContent = `-$${tw.toFixed(4)}`; document.getElementById('calcGrossWin').textContent = `+$${pa.toFixed(4)}`; document.getElementById('calcFeesWin').textContent = `-$${tw.toFixed(4)}`; document.getElementById('calcWin').textContent = `+$${(pa - tw).toFixed(4)}`; document.getElementById('calcBalanceWin').textContent = `$${(cap + pa - tw).toFixed(4)}`; document.getElementById('calcGrossLoss').textContent = `-$${la.toFixed(4)}`; document.getElementById('calcFeesLoss').textContent = `-$${tl.toFixed(4)}`; document.getElementById('calcLoss').textContent = `-$${(la + tl).toFixed(4)}`; document.getElementById('calcBalanceLoss').textContent = `$${(cap - la - tl).toFixed(4)}`; document.getElementById('calcResult').style.display = 'block'; }

async function saveCurrentAnalysis() { if (!currentAnalysisData) return; const a = JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); if (a.find(x => x.id === currentAnalysisData.id)) { showToast('Já salva!', 'error'); return; } try { await FirebaseService.saveAnalysis(currentAnalysisData); loadSavedAnalyses(); showToast('✅ Salva!', 'success'); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }
async function saveManualAnalysis() { if (!manualTradeData) return; const ad = { id: Date.now().toString(), asset: manualAsset, date: new Date().toISOString(), chartDate: manualAnalysisDate, direction: manualTradeData.direction, entry: manualTradeData.entry, stop: manualTradeData.stop, target: manualTradeData.target, trend: document.getElementById('manualInsightTrend').textContent, signal: document.getElementById('manualInsightSignal').textContent, risk: document.getElementById('manualInsightRisk').textContent, volume: document.getElementById('manualInsightVolume').textContent, result: 'pending', source: 'external' }; const a = JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); if (a.find(x => x.id === ad.id)) { showToast('Já salva!', 'error'); return; } try { await FirebaseService.saveAnalysis(ad); loadSavedAnalyses(); showToast('✅ Salva!', 'success'); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }

function loadSavedAnalyses() { savedAnalyses = FirebaseService.getAnalysesLocal(); const c = document.getElementById('savedAnalysesList'); if (!savedAnalyses.length) { c.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><div class="empty-state-title">Nenhuma análise salva</div></div>`; return; } c.innerHTML = savedAnalyses.map(a => { let sb = ''; if (a.source === 'external') sb = '<span class="method-badge external">EXTERNA</span>'; else if (a.source === 'signal') sb = '<span class="method-badge signal">SINAL MANUAL</span>'; return `<div class="saved-analysis-card"><div class="saved-analysis-header"><div class="saved-analysis-asset">${a.asset} ${sb}</div><div class="saved-analysis-date">${new Date(a.date).toLocaleString('pt-BR')}</div></div><div class="saved-analysis-result"><span class="saved-analysis-badge ${a.result || 'pending'}">${a.result === 'win' ? '✅ WIN' : a.result === 'loss' ? '❌ LOSS' : '⏳ Pendente'}</span><span class="saved-analysis-badge" style="background:rgba(10,132,255,0.15);color:var(--blue);">${a.direction || '—'}</span></div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">Entrada: ${a.entry || '—'} | Stop: ${a.stop || '—'} | Alvo: ${a.target || '—'}</div><div class="saved-analysis-actions"><button class="saved-analysis-btn result" onclick="showResultChart('${a.id}')">Resultado</button><button class="saved-analysis-btn verify" onclick="verifySavedAnalysis('${a.id}')">Verificar</button><button class="saved-analysis-btn" onclick="deleteSavedAnalysis('${a.id}')">Excluir</button></div></div>`; }).join(''); }
function loadSavedSets() { savedSets = FirebaseService.getSetsLocal(); const c = document.getElementById('savedSetsList'); if (!c) return; if (!savedSets.length) { c.innerHTML = ''; return; } c.innerHTML = '<div class="asset-label" style="margin-top:20px;margin-bottom:12px;">Conjuntos de Análises</div>' + savedSets.map((s, i) => `<div class="saved-set-card" onclick="openSavedSet(${i})"><div class="saved-analysis-header"><div class="saved-analysis-asset">📦 Conjunto</div><div class="saved-analysis-date">${s.date}</div></div><div style="font-size:11px;color:var(--text-secondary);">${s.analyses.length} análises • ${s.asset}</div></div>`).join(''); }
window.openSavedSet = function (i) { const s = savedSets[i]; if (!s) return; switchPage('pageOptimizer', document.querySelector('[data-page="pageOptimizer"]')); optimizerItems = s.analyses.map(a => ({ ...a, processed: !!a.response })); renderOptimizerList(); document.getElementById('optSelectedName').textContent = s.asset; optAsset = s.asset; showToast(`Conjunto carregado: ${s.analyses.length}`, 'success'); };

function openWinLossManualModal() {
  winLossDirection = 'LONG';
  document.getElementById('winLossManualModal').classList.add('active');
  document.getElementById('winLossRecuo').value = '';
  document.getElementById('winLossAlvo').value = '';
  setWinLossDirection(winLossDirection);
}

function closeWinLossManualModal() { document.getElementById('winLossManualModal').classList.remove('active'); }

function setWinLossDirection(dir) {
  winLossDirection = dir;
  document.getElementById('winLossDirLong').style.background = dir === 'LONG' ? 'rgba(48,209,88,0.2)' : 'transparent';
  document.getElementById('winLossDirLong').style.borderColor = dir === 'LONG' ? 'var(--green)' : 'var(--card-border)';
  document.getElementById('winLossDirShort').style.background = dir === 'SHORT' ? 'rgba(255,69,58,0.2)' : 'transparent';
  document.getElementById('winLossDirShort').style.borderColor = dir === 'SHORT' ? 'var(--red)' : 'var(--card-border)';
}

function executeWinLossManual() {
  const recuo = parseFloat(document.getElementById('winLossRecuo').value);
  const alvoMax = parseFloat(document.getElementById('winLossAlvo').value);
  if (!recuo || !alvoMax) { showToast('Preencha todos os campos', 'error'); return; }
  winLossRecuo = recuo; winLossAlvo = alvoMax;
  let appliedCount = 0;
  if (manualAnalyses.length > 0) {
    manualAnalyses.forEach((a, i) => {
      const e = parseFloat(a.tableData.entry), s = parseFloat(a.tableData.stop_loss), t = parseFloat(a.tableData.target);
      if (!e || !s || !t) return;
      let hitStop = false, hitTarget = false;
      if (winLossDirection === 'LONG') { if (recuo <= s) hitStop = true; if (alvoMax >= t) hitTarget = true; }
      else { if (recuo >= s) hitStop = true; if (alvoMax <= t) hitTarget = true; }
      let result = 'pending';
      if (hitTarget && !hitStop) result = 'win'; else if (hitStop && !hitTarget) result = 'loss'; else if (hitStop && hitTarget) result = 'loss';
      a.result = result;
      const cell = document.getElementById(`joinResult_${i}`);
      if (cell) { if (result === 'win') cell.innerHTML = '<span style="color:var(--green);">✅ WIN</span>'; else if (result === 'loss') cell.innerHTML = '<span style="color:var(--red);">❌ LOSS</span>'; else cell.innerHTML = '<span style="color:var(--text-tertiary);">⏳</span>'; }
      appliedCount++;
    });
  }
  if (signalAnalyses.length > 0) {
    signalAnalyses.forEach((a, i) => {
      const e = a.entry, s = a.stop, t = a.target;
      if (!e || !s || !t) return;
      let hitStop = false, hitTarget = false;
      if (winLossDirection === 'LONG') { if (recuo <= s) hitStop = true; if (alvoMax >= t) hitTarget = true; }
      else { if (recuo >= s) hitStop = true; if (alvoMax <= t) hitTarget = true; }
      let result = 'pending';
      if (hitTarget && !hitStop) result = 'win'; else if (hitStop && !hitTarget) result = 'loss'; else if (hitStop && hitTarget) result = 'loss';
      a.result = result;
      const cell = document.getElementById(`signalJoinResult_${i}`);
      if (cell) { if (result === 'win') cell.innerHTML = '<span style="color:var(--green);">✅ WIN</span>'; else if (result === 'loss') cell.innerHTML = '<span style="color:var(--red);">❌ LOSS</span>'; else cell.innerHTML = '<span style="color:var(--text-tertiary);">⏳</span>'; }
      appliedCount++;
    });
  }
  if (optimizerItems.length > 0) {
    optimizerItems.forEach((item, i) => {
      if (!item.tableData) return;
      const e = parseFloat(item.tableData.entry), s = parseFloat(item.tableData.stop_loss), t = parseFloat(item.tableData.target);
      if (!e || !s || !t) return;
      let hitStop = false, hitTarget = false;
      if (winLossDirection === 'LONG') { if (recuo <= s) hitStop = true; if (alvoMax >= t) hitTarget = true; }
      else { if (recuo >= s) hitStop = true; if (alvoMax <= t) hitTarget = true; }
      let result = 'pending';
      if (hitTarget && !hitStop) result = 'win'; else if (hitStop && !hitTarget) result = 'loss'; else if (hitStop && hitTarget) result = 'loss';
      item.result = result; appliedCount++;
    });
    renderOptimizerList();
  }
  closeWinLossManualModal();
  showToast(`✅ Aplicado a ${appliedCount} análises!`, 'success');
}

function copyComparisonTable() {
  const table = document.querySelector('#joinResponsesContent .comparison-table');
  if (!table) { showToast('Tabela não encontrada', 'error'); return; }
  let text = '';
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('th, td');
    const rowData = Array.from(cells).map(cell => cell.textContent.trim());
    text += rowData.join(' | ') + '\n';
  });
  navigator.clipboard.writeText(text).then(() => showToast('✅ Tabela copiada!', 'success')).catch(() => showToast('Erro ao copiar', 'error'));
}

async function showResultChart(id) { const a = savedAnalyses.find(x => x.id === id); if (!a || !a.entry || !a.stop || !a.target) { showToast('Dados incompletos', 'error'); return; } showToast('Gerando gráficos...', 'info'); const m = document.getElementById('resultModal'), t = document.getElementById('resultModalTitle'), c = document.getElementById('resultModalContent'); t.textContent = `Resultado - ${a.asset}`; c.innerHTML = `<div class="progress-container"><div class="progress-bar" id="resultProgressBar" style="width:0%"></div></div><div class="progress-text" id="resultProgressText">Carregando...</div>`; m.classList.add('active'); try { const ad = new Date(a.chartDate || a.date), rd = new Date(ad.getTime() + 2 * 24 * 60 * 60 * 1000); const tfs = ['4h', '1h', '15m', '5m'], ch = {}; for (let i = 0; i < tfs.length; i++) { const r = await getChartFromBinance(a.asset, tfs[i], rd); ch[tfs[i]] = r.klines; const p = ((i + 1) / tfs.length) * 100; const pb = document.getElementById('resultProgressBar'), pt = document.getElementById('resultProgressText'); if (pb) pb.style.width = p + '%'; if (pt) pt.textContent = `Carregando ${tfs[i].toUpperCase()}... ${Math.round(p)}%`; } c.innerHTML = `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">Gráficos 2 dias após (${rd.toLocaleString('pt-BR')})</div><div class="chart-view-toggle" style="margin-bottom:12px;"><button class="chart-view-btn" id="resultViewTV" onclick="switchResultView('tv','${a.asset}','${rd.toISOString()}','${a.chartDate || a.date}',${a.entry},${a.stop},${a.target})">TradingView</button><button class="chart-view-btn highlight active" id="resultViewCustom" onclick="switchResultView('custom','${a.asset}','${rd.toISOString()}','${a.chartDate || a.date}',${a.entry},${a.stop},${a.target})">✨ Com Sinais</button></div><div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;"><div class="chart-tf-selector" style="flex:1;margin-bottom:0;"><button class="chart-tf-btn" data-tf="4h" onclick="switchResultTf('4h','${a.asset}','${rd.toISOString()}','${a.chartDate || a.date}',${a.entry},${a.stop},${a.target})">4H</button><button class="chart-tf-btn active" data-tf="1h" onclick="switchResultTf('1h','${a.asset}','${rd.toISOString()}','${a.chartDate || a.date}',${a.entry},${a.stop},${a.target})">1H</button><button class="chart-tf-btn" data-tf="15m" onclick="switchResultTf('15m','${a.asset}','${rd.toISOString()}','${a.chartDate || a.date}',${a.entry},${a.stop},${a.target})">15M</button><button class="chart-tf-btn" data-tf="5m" onclick="switchResultTf('5m','${a.asset}','${rd.toISOString()}','${a.chartDate || a.date}',${a.entry},${a.stop},${a.target})">5M</button></div><button class="chart-pnl-btn" onclick="downloadResultChart()">Baixar</button><button class="chart-pnl-btn" onclick="toggleResultDate('${a.asset}','${rd.toISOString()}','${a.chartDate || a.date}',${a.entry},${a.stop},${a.target})">⬅️</button><button class="chart-pnl-btn" onclick="openWinLossManualModal()">Win/Loss?</button></div><div class="chart-wrapper" id="resultChartWrapper" style="height:400px;"><div id="resultTvWidgetContainer" style="width:100%;height:100%;"></div><canvas id="resultSignalCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;"></canvas></div>`; window.resultCharts = ch; window.resultCurrentTf = '1h'; window.resultCurrentView = 'custom'; window.resultSignals = { entry: a.entry, stop: a.stop, target: a.target }; window.resultAsset = a.asset; window.resultDateStr = rd.toISOString(); window.resultOriginalDate = a.chartDate || a.date; window.resultShowingOriginal = false; window.resultAnalysisId = id; window.resultAnalysisTimestamp = a.chartDate || a.date; setTimeout(() => switchResultView('custom', a.asset, rd.toISOString(), a.chartDate || a.date, a.entry, a.stop, a.target), 600); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }

window.switchResultView = function (v, a, d, o, e, s, t) { window.resultCurrentView = v; const tb = document.getElementById('resultViewTV'), cb = document.getElementById('resultViewCustom'); if (tb) tb.classList.toggle('active', v === 'tv'); if (cb) cb.classList.toggle('active', v === 'custom'); if (v === 'tv') { document.getElementById('resultTvWidgetContainer').style.display = 'block'; document.getElementById('resultSignalCanvas').style.display = 'none'; loadTradingViewWidget(a, window.resultCurrentTf, 'resultTvWidgetContainer'); } else { document.getElementById('resultTvWidgetContainer').style.display = 'none'; document.getElementById('resultSignalCanvas').style.display = 'block'; drawSignalCanvasWithRetry(window.resultCharts[window.resultCurrentTf], { entry: e, stop: s, target: t }, window.resultCurrentTf, 'resultSignalCanvas', null, false, true); } };
window.switchResultTf = function (tf, a, d, o, e, s, t) { window.resultCurrentTf = tf; document.querySelectorAll('#resultModal .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf)); if (window.resultCurrentView === 'tv') loadTradingViewWidget(a, tf, 'resultTvWidgetContainer'); else { drawSignalCanvasWithRetry(window.resultCharts[tf], { entry: e, stop: s, target: t }, tf, 'resultSignalCanvas', null, false, true); } };
window.toggleResultDate = async function (a, f, o, e, s, t) { const going = !window.resultShowingOriginal; window.resultShowingOriginal = going; try { const ch = {}; for (const tf of ['4h', '1h', '15m', '5m']) { const r = await getChartFromBinance(a, tf, new Date(going ? o : f)); ch[tf] = r.klines; } window.resultCharts = ch; if (window.resultCurrentView === 'tv') loadTradingViewWidget(a, window.resultCurrentTf, 'resultTvWidgetContainer'); else { drawSignalCanvasWithRetry(window.resultCharts[window.resultCurrentTf], { entry: e, stop: s, target: t }, window.resultCurrentTf, 'resultSignalCanvas', null, false, true); } showToast(going ? 'Gráfico original' : '+2 dias', 'info'); } catch (err) { showToast(`Erro: ${err.message}`, 'error'); } };
window.downloadResultChart = function () { const c = document.getElementById('resultSignalCanvas'); if (!c) return; const l = document.createElement('a'); l.download = `${window.resultAsset}_${window.resultCurrentTf}_resultado.jpg`; l.href = c.toDataURL('image/jpeg', 0.9); l.click(); showToast('Baixado!', 'success'); };
function closeResultModal() { document.getElementById('resultModal').classList.remove('active'); }

async function verifySavedAnalysis(id) { const a = savedAnalyses.find(x => x.id === id); if (!a || !a.entry || !a.stop || !a.target) { showToast('Dados incompletos', 'error'); return; } showToast('Verificando...', 'info'); try { const ad = new Date(a.chartDate || a.date), vd = new Date(ad.getTime() + 2 * 24 * 60 * 60 * 1000); const r = await getChartFromBinance(a.asset, '15m', vd); const k = r.klines; const at = ad.getTime(); let si = 0, md = Infinity; k.forEach((c, i) => { const df = Math.abs(c[0] - at); if (df < md) { md = df; si = i; } }); let rs = 'pending', ht = false, hs = false; for (let i = si; i < k.length; i++) { const h = parseFloat(k[i][2]), l = parseFloat(k[i][3]); if (a.direction === 'LONG') { if (h >= a.target) { ht = true; break; } if (l <= a.stop) { hs = true; break; } } else { if (l <= a.target) { ht = true; break; } if (h >= a.stop) { hs = true; break; } } } if (ht && !hs) rs = 'win'; else if (hs && !ht) rs = 'loss'; else if (ht && hs) rs = 'loss'; await FirebaseService.updateAnalysis(id, { result: rs, verified: true }); loadSavedAnalyses(); if (rs === 'win') showToast('✅ WIN!', 'success'); else if (rs === 'loss') showToast('❌ LOSS', 'error'); else showToast('⏳ Inconclusivo', 'info'); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }
function deleteSavedAnalysis(id) { if (!confirm('Excluir?')) return; const a = JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); localStorage.setItem('savedAnalyses', JSON.stringify(a.filter(x => x.id !== id))); loadSavedAnalyses(); showToast('Excluída', 'success'); }
function loadNotes() { document.getElementById('notesArea').value = FirebaseService.getNotesLocal(); }
function saveNotes() { FirebaseService.saveNotesLocal(document.getElementById('notesArea').value); showToast('Notas salvas!', 'success'); }

function buildPrompt(a) { return `COMITÊ INSTITUCIONAL — ${a}\nSISTEMA DE ANÁLISE MULTI-TIMEFRAME + EXECUÇÃO ADAPTATIVA\n\nVocê é um analista profissional especializado em ${a}, Price Action, SMC, ICT, Liquidity, Market Structure, Volume, Order Flow e análise multi-timeframe.\n\nVocê receberá 4 screenshots: 1. 4H  2. 1H  3. 15M  4. 5M\nSeu objetivo é encontrar a MELHOR OPORTUNIDADE OPERACIONAL DISPONÍVEL.\nDecida: A) ENTRADA IMEDIATA  B) ENTRADA EM PULLBACK  C) ENTRADA APÓS CONFIRMAÇÃO  D) NO TRADE\n\n========================================================\nREGRA MAIS IMPORTANTE — NÃO PERDER MOVIMENTOS POR ESPERAR\n========================================================\n${a.replace('USDT', '')} frequentemente realiza: LIQUIDITY SWEEP → DISPLACEMENT → BOS/CHoCH → CONTINUAÇÃO sem retornar ao FVG/OB.\nNUNCA assuma que o preço fará reteste.\n\n========================================================\nETAPA 0 — LEITURA DAS IMAGENS\n========================================================\nIdentifique: timeframe, preço atual, estrutura, máximas/mínimas, suportes/resistências, liquidez, OBs, FVGs, volume.\nNÃO invente informações.\n\n========================================================\nETAPA 1-4 — ANÁLISE MULTI-TIMEFRAME\n========================================================\n4H: Bullish/Bearish/Lateral/Transição. VIÉS 4H: LONG/SHORT/NEUTRO\n1H: ALINHADO/PARCIALMENTE ALINHADO/CONTRÁRIO\n15M: SETUP DE LONG/SHORT/NENHUM\n5M: Microestrutura, confirmação, momentum\n\n========================================================\nETAPA 5-9 — LIQUIDEZ, PA, SMC, VOLUME, REGIME\n========================================================\nMapeie liquidez, analise PA, OBs, FVGs, volume, regime.\n\n========================================================\nETAPA 10-11 — DECISÃO\n========================================================\nSe sweep + displacement + BOS + momentum → ENTRADA IMEDIATA.\nNUNCA escreva "Esperar reteste" apenas porque existe FVG/OB.\n\n========================================================\nFORMATO FINAL\n========================================================\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n${a} — DECISÃO FINAL\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nVIÉS 4H: [LONG/SHORT/NEUTRO]\nVIÉS 1H: [LONG/SHORT/NEUTRO]\nVIÉS 15M: [LONG/SHORT/NEUTRO]\nVIÉS 5M: [LONG/SHORT/NEUTRO]\nREGIME: [TENDÊNCIA/RANGE/TRANSIÇÃO]\nQUALIDADE DO SETUP: [X/10]\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 OPERAÇÃO PRINCIPAL\n━━━━━━━━━━━━━━━━━━━━━━━━\nDIREÇÃO: [LONG/SHORT/NO TRADE]\nTIPO DE ENTRADA: [IMEDIATA/PULLBACK/CONFIRMAÇÃO]\nENTRADA PRINCIPAL: [preço]\nSTOP LOSS: [preço]\nTP1: [preço]\nTP2: [preço]\nR:R TP1: [X]\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚡ ENTRADA IMEDIATA VS PULLBACK\n━━━━━━━━━━━━━━━━━━━━━━━━\nENTRADA IMEDIATA: [preço] — VANTAGEM: [explicação]\nPULLBACK: [preço] — VANTAGEM: [explicação]\nESCOLHA: [IMEDIATA/PULLBACK/CONFIRMAÇÃO]\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n🧠 TESE / ❌ INVALIDAÇÃO / ⚠️ RISCO /  ALTERNATIVO\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n📌 VEREDITO\n━━━━━━━━━━━━━━━━━━━━━━━━\n[LONG/SHORT/NO TRADE]\nENTRADA: [X]  STOP: [X]  ALVO: [X]\nTIPO: [IMEDIATA/PULLBACK/CONFIRMAÇÃO]\nCONFIANÇA: [BAIXA/MÉDIA/ALTA]\nRESUMO: [1-3 frases]\n\nREGRAS: Não force operação. Não force pullback. Não presuma retorno a FVG/OB. Movimento forte = entrada imediata. Preço esticado = pullback. Sem confirmação = aguarde.`; }

async function callGemini(apiKey, prompt, images) { const model = document.getElementById('geminiModel').value.trim() || 'gemini-3.6-flash'; const parts = [{ text: prompt }]; images.forEach(img => { let bd, mt; if (img.startsWith('data:')) { const m = img.match(/^data:(image\/\w+);base64,(.+)$/); if (m) { mt = m[1]; bd = m[2]; } } else { bd = img; mt = 'image/png'; } if (bd) parts.push({ inline_data: { mime_type: mt, data: bd } }); }); const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 8192 } }) }); if (!r.ok) { const et = await r.text(); let em = `Gemini: ${r.status}`; try { const j = JSON.parse(et); if (j.error?.message) em = j.error.message; } catch (e) { } if (em.toLowerCase().includes('no longer available') || em.toLowerCase().includes('not found')) { showToast('Modelo indisponível, tentando gemini-3.6-flash...', 'error'); const fb = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 8192 } }) }); if (fb.ok) { const d = await fb.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'; } } throw new Error(em); } const d = await r.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'; }

function displayResult(text, skipScroll = false) { const rt = document.getElementById('resultTime'); if (rt) rt.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); const td = parseVisualTable(text); if (td && visualTableEnabled) { applyVisualTable(td, false); text = text.replace(/\[PRIME_TABLE\][\s\S]*?\[\/PRIME_TABLE\]/, '').trim(); } else { const ve = document.getElementById('visualElements'); if (ve) ve.style.display = 'block'; extractVisualsFromText(text); } let f = text.replace(/━━━━━━━━━━━━━━━━━━━━━━━━/g, '\n━━━━━━━━━━━━━━━━━━━━━━━━\n').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\[LONG\]/gi, '<span style="color:var(--green);font-weight:700;">LONG</span>').replace(/\[SHORT\]/gi, '<span style="color:var(--red);font-weight:700;">SHORT</span>').replace(/\[NO TRADE\]/gi, '<span style="color:var(--orange);font-weight:700;">NO TRADE</span>'); document.getElementById('resultContent').innerHTML = `<div style="white-space:pre-wrap;word-wrap:break-word;line-height:1.7;">${f}</div>`; if (!skipScroll) document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function extractVisualsFromText(t) { const tm = t.match(/VIÉS\s+4H:\s*\*?\[?(LONG|SHORT|NEUTRO|BULLISH|BEARISH)/i), sm = t.match(/DIREÇÃO:\s*\*?\[?(LONG|SHORT|NO TRADE)/i), rm = t.match(/RISCO.*?DE\s+PERDER.*?:\s*\*?\[?(BAIXO|MÉDIO|ALTO)/i); const te = document.getElementById('insightTrend'); if (tm && te) { const v = tm[1].toUpperCase(); te.textContent = (v === 'LONG' || v === 'BULLISH') ? 'Bullish' : (v === 'SHORT' || v === 'BEARISH') ? 'Bearish' : 'Neutro'; te.style.color = (v === 'LONG' || v === 'BULLISH') ? 'var(--green)' : (v === 'SHORT' || v === 'BEARISH') ? 'var(--red)' : 'var(--orange)'; } const se = document.getElementById('insightSignal'); if (sm && se) { const v = sm[1].toUpperCase(); se.textContent = v === 'NO TRADE' ? 'Hold' : v; se.style.color = v === 'LONG' ? 'var(--green)' : v === 'SHORT' ? 'var(--red)' : 'var(--blue)'; } const re = document.getElementById('insightRisk'); if (rm && re) { const v = rm[1].toUpperCase(); re.textContent = v; re.style.color = v === 'BAIXO' ? 'var(--green)' : v === 'MÉDIO' ? 'var(--orange)' : 'var(--red)'; } }

async function generatePrints() { if (isGenerating) return; const btn = document.getElementById('generateBtn'), bt = document.getElementById('generateBtnText'), ld = document.getElementById('chartLoading'), lt = document.getElementById('chartLoadingText'); btn.disabled = true; bt.textContent = 'Gerando...'; isGenerating = true; generatedPrints = {}; const pd = document.getElementById('printDate').value, tfs = ['4h', '1h', '15m', '5m'], g = document.getElementById('printPreviewGrid'); g.innerHTML = ''; ld.classList.add('active'); try { for (let i = 0; i < tfs.length; i++) { const tf = tfs[i]; lt.textContent = `Gerando ${tf.toUpperCase()}...`; await sleep(100); const r = await getChartFromBinance(printAsset, tf, pd); generatedPrints[tf] = r.chart; const d = pd ? new Date(pd) : new Date(), ds = d.toLocaleDateString('pt-BR').replace(/\//g, '-'), ts = d.toTimeString().slice(0, 5).replace(':', '-'), fn = `${printAsset}_${ds}_${ts}_${tf.toUpperCase()}.jpg`; g.innerHTML += `<div class="print-preview"><img src="${r.chart}" alt="${tf}"><div class="print-preview-label">${tf.toUpperCase()}</div><button class="print-preview-download" onclick="downloadPrint('${tf}','${fn}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button></div>`; } document.getElementById('downloadZipBtn').style.display = 'flex'; document.getElementById('downloadAllBtn').style.display = 'flex'; lt.textContent = 'Concluído!'; setTimeout(() => ld.classList.remove('active'), 500); showToast('Gráficos gerados!', 'success'); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); ld.classList.remove('active'); } finally { isGenerating = false; btn.disabled = false; bt.textContent = 'Gerar 4 Timeframes'; } }
function downloadPrint(tf, fn) { if (!generatedPrints[tf]) return; const l = document.createElement('a'); l.href = generatedPrints[tf]; l.download = fn; l.click(); }
async function downloadAllSequential() { showToast('Baixando em ordem...', 'info'); const tfs = ['4h', '1h', '15m', '5m'], d = document.getElementById('printDate').value ? new Date(document.getElementById('printDate').value) : new Date(), ds = d.toLocaleDateString('pt-BR').replace(/\//g, '-'), ts = d.toTimeString().slice(0, 5).replace(':', '-'); for (const tf of tfs) { if (generatedPrints[tf]) { downloadPrint(tf, `${printAsset}_${ds}_${ts}_${tf.toUpperCase()}.jpg`); await sleep(500); } } showToast('✅ Baixados em ordem!', 'success'); }
async function downloadAllZip() { if (!Object.keys(generatedPrints).length) return; const z = new JSZip(), d = document.getElementById('printDate').value ? new Date(document.getElementById('printDate').value) : new Date(), ds = d.toLocaleDateString('pt-BR').replace(/\//g, '-'), ts = d.toTimeString().slice(0, 5).replace(':', '-'); Object.entries(generatedPrints).forEach(([tf, data]) => { z.file(`${printAsset}_${ds}_${ts}_${tf.toUpperCase()}.jpg`, data.split(',')[1], { base64: true }); }); const b = await z.generateAsync({ type: 'blob' }); const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = `${printAsset}_${ds}_${ts}_ALL.zip`; l.click(); URL.revokeObjectURL(l.href); showToast('ZIP baixado!', 'success'); }

function copyCurrentPrompt() { let p = globalCustomPrompt.trim() || buildPrompt(selectedAsset); if (visualTableEnabled) p += VISUAL_TABLE_PROMPT; navigator.clipboard.writeText(p).then(() => showToast('Prompt copiado!', 'success')).catch(() => showToast('Erro', 'error')); }
function copyTablePrompt() { navigator.clipboard.writeText(VISUAL_TABLE_PROMPT).then(() => showToast('Prompt da tabela copiado!', 'success')).catch(() => showToast('Erro', 'error')); }
function copyFullPrompt() { let p = globalCustomPrompt.trim() || buildPrompt(manualAsset); if (visualTableEnabled) p += VISUAL_TABLE_PROMPT; navigator.clipboard.writeText(p).then(() => showToast('Prompt completo copiado!', 'success')).catch(() => showToast('Erro', 'error')); }

async function processManualAnalysis() { const resp = document.getElementById('manualResponse').value.trim(); if (!resp) { showToast('Cole a resposta', 'error'); return; } let td = parseVisualTable(resp); if (!td) { showToast('Tabela não encontrada. Tentando Groq...', 'info'); td = await fetchGroqTable(resp); if (!td) { showToast('Não foi possível extrair a tabela.', 'error'); return; } showToast('✅ Tabela extraída pelo Groq!', 'success'); } startAnalysisTimer(); try { const ad = td.analysis_date ? parseAnalysisDate(td.analysis_date, td.analysis_time) : null; if (ad) { const tfs = ['4h', '1h', '15m', '5m']; for (const tf of tfs) { const r = await getChartFromBinance(manualAsset, tf, ad); manualChartKlines[tf] = r.klines; } } applyVisualTable(td, true); document.getElementById('manualResultSection').style.display = 'block'; document.getElementById('manualDateChanger').style.display = 'block'; manualAnalyses.push({ tableData: td, klines: { ...manualChartKlines }, analysisDate: ad, response: resp, analysisTimestamp: manualAnalysisTimestamp }); currentManualAnalysisIndex = manualAnalyses.length - 1; updateFloatingButton(); setTimeout(() => document.getElementById('manualResultSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } finally { stopAnalysisTimer(); } }

async function pasteAndProcess() { try { const t = await navigator.clipboard.readText(); document.getElementById('manualResponse').value = t; showToast('Colado!', 'success'); startAnalysisTimer(); setTimeout(() => processManualAnalysis(), 300); } catch (e) { showToast('Use Ctrl+V manualmente.', 'error'); } }
function clearManualResponse() { document.getElementById('manualResponse').value = ''; showToast('Limpo!', 'success'); }
function applyManualDateCorrection() { const nd = document.getElementById('manualCorrectDate').value; if (!nd) { showToast('Selecione uma data', 'error'); return; } manualAnalysisDate = nd; manualAnalysisTimestamp = nd; const tfs = ['4h', '1h', '15m', '5m']; let lc = 0; showToast('Atualizando...', 'info'); tfs.forEach(async tf => { try { const r = await getChartFromBinance(manualAsset, tf, nd); manualChartKlines[tf] = r.klines; lc++; if (lc === 4) { drawSignalCanvasWithRetry(manualChartKlines['1h'], manualTradeData, '1h', 'manualSignalCanvas', null); showToast('✅ Data atualizada!', 'success'); } } catch (e) { showToast(`Erro ${tf}: ${e.message}`, 'error'); } }); if (manualAnalyses[currentManualAnalysisIndex]) { manualAnalyses[currentManualAnalysisIndex].analysisDate = nd; manualAnalyses[currentManualAnalysisIndex].analysisTimestamp = nd; manualAnalyses[currentManualAnalysisIndex].klines = { ...manualChartKlines }; } }

async function showManualResultChart() { if (!manualTradeData || !manualAnalysisDate) { showToast('Dados incompletos', 'error'); return; } showToast('Gerando...', 'info'); const m = document.getElementById('resultModal'), t = document.getElementById('resultModalTitle'), c = document.getElementById('resultModalContent'); t.textContent = `Resultado - ${manualAsset}`; c.innerHTML = `<div class="progress-container"><div class="progress-bar" id="resultProgressBar" style="width:0%"></div></div><div class="progress-text" id="resultProgressText">Carregando...</div>`; m.classList.add('active'); try { const ad = new Date(manualAnalysisDate), rd = new Date(ad.getTime() + 2 * 24 * 60 * 60 * 1000); const tfs = ['4h', '1h', '15m', '5m'], ch = {}; for (let i = 0; i < tfs.length; i++) { const r = await getChartFromBinance(manualAsset, tfs[i], rd); ch[tfs[i]] = r.klines; const p = ((i + 1) / tfs.length) * 100; const pb = document.getElementById('resultProgressBar'), pt = document.getElementById('resultProgressText'); if (pb) pb.style.width = p + '%'; if (pt) pt.textContent = `${tfs[i].toUpperCase()}... ${Math.round(p)}%`; } c.innerHTML = `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">2 dias após (${rd.toLocaleString('pt-BR')})</div><div class="chart-view-toggle" style="margin-bottom:12px;"><button class="chart-view-btn" id="manualResultViewTV" onclick="switchManualResultView('tv','${manualAsset}','${rd.toISOString()}','${manualAnalysisDate}',${manualTradeData.entry},${manualTradeData.stop},${manualTradeData.target})">TradingView</button><button class="chart-view-btn highlight active" id="manualResultViewCustom" onclick="switchManualResultView('custom','${manualAsset}','${rd.toISOString()}','${manualAnalysisDate}',${manualTradeData.entry},${manualTradeData.stop},${manualTradeData.target})">✨ Com Sinais</button></div><div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;"><div class="chart-tf-selector" style="flex:1;margin-bottom:0;"><button class="chart-tf-btn" data-tf="4h" onclick="switchManualResultTf('4h','${manualAsset}','${rd.toISOString()}','${manualAnalysisDate}',${manualTradeData.entry},${manualTradeData.stop},${manualTradeData.target})">4H</button><button class="chart-tf-btn active" data-tf="1h" onclick="switchManualResultTf('1h','${manualAsset}','${rd.toISOString()}','${manualAnalysisDate}',${manualTradeData.entry},${manualTradeData.stop},${manualTradeData.target})">1H</button><button class="chart-tf-btn" data-tf="15m" onclick="switchManualResultTf('15m','${manualAsset}','${rd.toISOString()}','${manualAnalysisDate}',${manualTradeData.entry},${manualTradeData.stop},${manualTradeData.target})">15M</button><button class="chart-tf-btn" data-tf="5m" onclick="switchManualResultTf('5m','${manualAsset}','${rd.toISOString()}','${manualAnalysisDate}',${manualTradeData.entry},${manualTradeData.stop},${manualTradeData.target})">5M</button></div><button class="chart-pnl-btn" onclick="downloadManualResultChart()">Baixar</button><button class="chart-pnl-btn" onclick="toggleManualResultDate('${manualAsset}','${rd.toISOString()}','${manualAnalysisDate}',${manualTradeData.entry},${manualTradeData.stop},${manualTradeData.target})">⬅️</button><button class="chart-pnl-btn" onclick="openWinLossManualModal()">Win/Loss?</button></div><div class="chart-wrapper" id="manualResultChartWrapper" style="height:400px;"><div id="manualResultTvWidgetContainer" style="width:100%;height:100%;"></div><canvas id="manualResultSignalCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;"></canvas></div>`; window.manualResultCharts = ch; window.manualResultCurrentTf = '1h'; window.manualResultCurrentView = 'custom'; window.manualResultSignals = { entry: manualTradeData.entry, stop: manualTradeData.stop, target: manualTradeData.target }; window.manualResultAsset = manualAsset; window.manualResultDateStr = rd.toISOString(); window.manualResultOriginalDate = manualAnalysisDate; window.manualResultShowingOriginal = false; window.manualResultAnalysisTimestamp = manualAnalysisDate; setTimeout(() => switchManualResultView('custom', manualAsset, rd.toISOString(), manualAnalysisDate, manualTradeData.entry, manualTradeData.stop, manualTradeData.target), 600); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }

window.switchManualResultView = function (v, a, d, o, e, s, t) { window.manualResultCurrentView = v; const tb = document.getElementById('manualResultViewTV'), cb = document.getElementById('manualResultViewCustom'); if (tb) tb.classList.toggle('active', v === 'tv'); if (cb) cb.classList.toggle('active', v === 'custom'); if (v === 'tv') { document.getElementById('manualResultTvWidgetContainer').style.display = 'block'; document.getElementById('manualResultSignalCanvas').style.display = 'none'; loadTradingViewWidget(a, window.manualResultCurrentTf, 'manualResultTvWidgetContainer'); } else { document.getElementById('manualResultTvWidgetContainer').style.display = 'none'; document.getElementById('manualResultSignalCanvas').style.display = 'block'; drawSignalCanvasWithRetry(window.manualResultCharts[window.manualResultCurrentTf], { entry: e, stop: s, target: t }, window.manualResultCurrentTf, 'manualResultSignalCanvas', null, false, true); } };
window.switchManualResultTf = function (tf, a, d, o, e, s, t) { window.manualResultCurrentTf = tf; document.querySelectorAll('#resultModal .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf)); if (window.manualResultCurrentView === 'tv') loadTradingViewWidget(a, tf, 'manualResultTvWidgetContainer'); else { drawSignalCanvasWithRetry(window.manualResultCharts[tf], { entry: e, stop: s, target: t }, tf, 'manualResultSignalCanvas', null, false, true); } };
window.toggleManualResultDate = async function (a, f, o, e, s, t) { const going = !window.manualResultShowingOriginal; window.manualResultShowingOriginal = going; try { const ch = {}; for (const tf of ['4h', '1h', '15m', '5m']) { const r = await getChartFromBinance(a, tf, new Date(going ? o : f)); ch[tf] = r.klines; } window.manualResultCharts = ch; if (window.manualResultCurrentView === 'tv') loadTradingViewWidget(a, window.manualResultCurrentTf, 'manualResultTvWidgetContainer'); else { drawSignalCanvasWithRetry(window.manualResultCharts[window.manualResultCurrentTf], { entry: e, stop: s, target: t }, window.manualResultCurrentTf, 'manualResultSignalCanvas', null, false, true); } showToast(going ? 'Original' : '+2 dias', 'info'); } catch (err) { showToast(`Erro: ${err.message}`, 'error'); } };
window.downloadManualResultChart = function () { const c = document.getElementById('manualResultSignalCanvas'); if (!c) return; const l = document.createElement('a'); l.download = `${window.manualResultAsset}_${window.manualResultCurrentTf}_resultado.jpg`; l.href = c.toDataURL('image/jpeg', 0.9); l.click(); showToast('Baixado!', 'success'); };

function checkDailyRequests() { const n = new Date(), bt = new Date(n.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })), today = bt.toDateString(), lr = localStorage.getItem('lastResetDate'); if (lr !== today || (bt.getHours() >= 4 && lr !== today)) { dailyRequests = 0; localStorage.setItem('lastResetDate', today); localStorage.setItem('dailyRequests', '0'); } else { dailyRequests = parseInt(localStorage.getItem('dailyRequests') || '0'); } return dailyRequests < 20; }
function incrementDailyRequests() { dailyRequests++; localStorage.setItem('dailyRequests', dailyRequests.toString()); updateRequestsCounter(); }
function updateRequestsCounter() { const c = document.getElementById('requestsCounter'); if (c) { c.textContent = `${dailyRequests}/20`; c.style.color = dailyRequests >= 18 ? 'var(--red)' : dailyRequests >= 15 ? 'var(--orange)' : 'var(--green)'; } }

function openAddAnalysisPopup() { document.getElementById('addAnalysisPopup').classList.add('active'); }
function closeAddAnalysisPopup() { document.getElementById('addAnalysisPopup').classList.remove('active'); document.getElementById('popupResponse').value = ''; }
async function pasteInPopup() { try { document.getElementById('popupResponse').value = await navigator.clipboard.readText(); showToast('Colado!', 'success'); } catch (e) { showToast('Erro', 'error'); } }
async function processPopupAnalysis() { const resp = document.getElementById('popupResponse').value.trim(); if (!resp) { showToast('Cole a resposta', 'error'); return; } let td = parseVisualTable(resp); if (!td) { td = await fetchGroqTable(resp); if (!td) return; } if (manualAnalyses.length >= 10) { showToast('Limite de 10!', 'error'); return; } startAnalysisTimer(); try { const ad = td.analysis_date ? parseAnalysisDate(td.analysis_date, td.analysis_time) : null; if (ad) { const nk = {}; for (const tf of ['4h', '1h', '15m', '5m']) { const r = await getChartFromBinance(manualAsset, tf, ad); nk[tf] = r.klines; } manualAnalyses.push({ tableData: td, klines: nk, analysisDate: ad, response: resp, analysisTimestamp: ad }); currentManualAnalysisIndex = manualAnalyses.length - 1; manualChartKlines = nk; applyVisualTable(td, true); document.getElementById('manualResultSection').style.display = 'block'; updateFloatingButton(); closeAddAnalysisPopup(); showToast(`✅ Análise ${manualAnalyses.length} adicionada!`, 'success'); } } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } finally { stopAnalysisTimer(); } }

function updateFloatingButton() { const b = document.getElementById('floatingAnalysisBtn'); if (manualAnalyses.length > 0) { b.classList.add('visible'); b.textContent = currentManualAnalysisIndex + 1; } else { b.classList.remove('visible'); } }
function toggleFloatingAnalysis() { if (!manualAnalyses.length) return; currentManualAnalysisIndex = (currentManualAnalysisIndex + 1) % manualAnalyses.length; const a = manualAnalyses[currentManualAnalysisIndex]; manualChartKlines = a.klines; manualTradeData = { entry: parseFloat(a.tableData.entry) || null, stop: parseFloat(a.tableData.stop_loss) || null, target: parseFloat(a.tableData.target) || null, direction: a.tableData.direction }; manualAnalysisDate = a.analysisDate; manualAnalysisTimestamp = a.analysisTimestamp || a.analysisDate; applyVisualTable(a.tableData, true); updateFloatingButton(); showToast(`Análise ${currentManualAnalysisIndex + 1} de ${manualAnalyses.length}`, 'info'); }
function closeAllAnalyses() { if (!confirm('Fechar tudo?')) return; manualAnalyses = []; currentManualAnalysisIndex = 0; manualTradeData = null; manualAnalysisDate = null; manualAnalysisTimestamp = null; manualChartKlines = {}; document.getElementById('manualResponse').value = ''; document.getElementById('manualResultSection').style.display = 'none'; document.getElementById('manualDateChanger').style.display = 'none'; updateFloatingButton(); showToast('Fechado!', 'success'); }

function joinResponses() {
  if (!manualAnalyses.length) { showToast('Nenhuma análise', 'error'); return; }
  let th = '<table class="comparison-table"><tr><th>#</th><th>Dir</th><th>Entrada</th><th>Stop</th><th>Alvo</th><th>R:R</th><th>Resultado</th></tr>';
  let ls = 0, st = Infinity, li = -1, si = -1, cp = null;
  manualAnalyses.forEach((a, i) => { const e = parseFloat(a.tableData.entry) || 0, s = parseFloat(a.tableData.stop_loss) || 0, t = parseFloat(a.tableData.target) || 0, d = a.tableData.direction || '—', r = Math.abs(e - s), rw = Math.abs(t - e), rr = r > 0 ? (rw / r).toFixed(2) : '—'; if (r > ls) { ls = r; li = i; } if (rw < st && rw > 0) { st = rw; si = i; } if (!cp && e > 0) cp = e; const rb = a.result === 'win' ? '<span style="color:var(--green);">✅ WIN</span>' : a.result === 'loss' ? '<span style="color:var(--red);">❌ LOSS</span>' : '<span style="color:var(--text-tertiary);">—</span>'; th += `<tr><td>${i + 1}</td><td>${d}</td><td>${e}</td><td>${s}</td><td>${t}</td><td>1:${rr}</td><td id="joinResult_${i}">${rb}</td></tr>`; });
  th += '</table>';
  let sh = '<div class="comparison-summary">';
  sh += `<strong>Stop mais longo:</strong> #${li + 1} (${ls.toFixed(2)})<br><strong>Alvo mais curto:</strong> #${si + 1} (${st.toFixed(2)})<br>`;
  if (cp && ls > 0 && st > 0) sh += `<br><strong>R:R conservador:</strong> 1:${(st / ls).toFixed(2)}`;
  sh += '</div>';
  const btns = `<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn-secondary" onclick="copyComparisonTable()" style="flex:1;margin:0;">Copiar Tabela</button><button class="btn-primary" onclick="openWinLossManualModal()" style="flex:1;margin:0;background:var(--blue);color:white;">Win/Loss? All</button></div>`;
  document.getElementById('joinResponsesContent').innerHTML = th + sh + btns;
  document.getElementById('joinResponsesModal').classList.add('active');
}

function closeJoinResponses() { document.getElementById('joinResponsesModal').classList.remove('active'); document.getElementById('joinResponsesSpinner').classList.remove('active'); }

function setSignalDirection(d) { document.getElementById('signalDirLong').style.background = d === 'LONG' ? 'rgba(48,209,88,0.2)' : 'transparent'; document.getElementById('signalDirLong').style.borderColor = d === 'LONG' ? 'var(--green)' : 'var(--card-border)'; document.getElementById('signalDirShort').style.background = d === 'SHORT' ? 'rgba(255,69,58,0.2)' : 'transparent'; document.getElementById('signalDirShort').style.borderColor = d === 'SHORT' ? 'var(--red)' : 'var(--card-border)'; window.currentSignalDirection = d; }
async function generateManualSignal() { const d = document.getElementById('signalDate').value, e = parseFloat(document.getElementById('signalEntry').value), s = parseFloat(document.getElementById('signalStop').value), t = parseFloat(document.getElementById('signalTarget').value), dir = window.currentSignalDirection; if (!d || !e || !s || !t || !dir) { showToast('Preencha todos os campos', 'error'); return; } showToast('Gerando...', 'info'); const ld = document.getElementById('chartLoading'), lt = document.getElementById('chartLoadingText'); ld.classList.add('active'); try { const tfs = ['4h', '1h', '15m', '5m'], ch = {}; for (let i = 0; i < tfs.length; i++) { lt.textContent = `Gerando ${tfs[i].toUpperCase()}...`; const r = await getChartFromBinance(signalAsset, tfs[i], d); ch[tfs[i]] = r.klines; } signalCharts = ch; signalTradeData = { entry: e, stop: s, target: t, direction: dir }; signalAnalysisDate = d; signalCurrentTf = '1h'; signalShowingOriginal = true; document.getElementById('signalTradeEntry').textContent = e; document.getElementById('signalTradeStop').textContent = s; document.getElementById('signalTradeTarget').textContent = t; document.getElementById('signalResultSection').style.display = 'block'; switchSignalView('custom'); signalAnalyses.push({ id: Date.now().toString(), asset: signalAsset, date: d, direction: dir, entry: e, stop: s, target: t, source: 'signal', klines: ch }); currentSignalAnalysisIndex = signalAnalyses.length - 1; updateFloatingSignalButton(); ld.classList.remove('active'); showToast('✅ Sinal gerado!', 'success'); } catch (err) { ld.classList.remove('active'); showToast(`Erro: ${err.message}`, 'error'); } }
function switchSignalView(v) { signalCurrentView = v; document.getElementById('signalViewTV').classList.toggle('active', v === 'tv'); document.getElementById('signalViewCustom').classList.toggle('active', v === 'custom'); if (v === 'tv') { document.getElementById('signalTvWidgetContainer').style.display = 'block'; document.getElementById('signalManualCanvas').style.display = 'none'; loadTradingViewWidget(signalAsset, signalCurrentTf, 'signalTvWidgetContainer'); } else { document.getElementById('signalTvWidgetContainer').style.display = 'none'; document.getElementById('signalManualCanvas').style.display = 'block'; drawSignalCanvasWithRetry(signalCharts[signalCurrentTf], signalTradeData, signalCurrentTf, 'signalManualCanvas', null); } }
function switchSignalTfResult(tf) { signalCurrentTf = tf; document.querySelectorAll('#signalChartWrapper .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf)); document.getElementById('signalTfLabelResult').textContent = `Timeframe: ${tf.toUpperCase()}`; if (signalCurrentView === 'tv') loadTradingViewWidget(signalAsset, tf, 'signalTvWidgetContainer'); else drawSignalCanvasWithRetry(signalCharts[tf], signalTradeData, tf, 'signalManualCanvas', null); }
async function showSignalResultChart() { if (!signalTradeData || !signalAnalysisDate) return; showToast('Gerando +2 dias...', 'info'); try { const rd = new Date(new Date(signalAnalysisDate).getTime() + 2 * 24 * 60 * 60 * 1000); for (const tf of ['4h', '1h', '15m', '5m']) { const r = await getChartFromBinance(signalAsset, tf, rd); signalCharts[tf] = r.klines; } signalShowingOriginal = false; switchSignalView('custom'); showToast('✅ +2 dias carregado!', 'success'); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }
async function saveManualSignal() { if (!signalTradeData) return; const ad = { id: Date.now().toString(), asset: signalAsset, date: new Date().toISOString(), chartDate: signalAnalysisDate, direction: signalTradeData.direction, entry: signalTradeData.entry, stop: signalTradeData.stop, target: signalTradeData.target, result: 'pending', source: 'signal' }; try { await FirebaseService.saveAnalysis(ad); loadSavedAnalyses(); showToast('✅ Salvo!', 'success'); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }
function addManualSignal() { document.getElementById('addSignalPopup').classList.add('active'); document.getElementById('popupSignalDate').value = signalAnalysisDate || ''; }
function closeAddSignalPopup() { document.getElementById('addSignalPopup').classList.remove('active'); }
function setPopupSignalDirection(d) { document.getElementById('popupSignalLong').style.borderColor = d === 'LONG' ? 'var(--green)' : 'var(--card-border)'; document.getElementById('popupSignalShort').style.borderColor = d === 'SHORT' ? 'var(--red)' : 'var(--card-border)'; window.popupSignalDirection = d; }
async function processPopupSignal() { const d = document.getElementById('popupSignalDate').value, e = parseFloat(document.getElementById('popupSignalEntry').value), s = parseFloat(document.getElementById('popupSignalStop').value), t = parseFloat(document.getElementById('popupSignalTarget').value), dir = window.popupSignalDirection; if (!d || !e || !s || !t || !dir) { showToast('Preencha tudo', 'error'); return; } signalAnalyses.push({ id: Date.now().toString(), asset: signalAsset, date: d, direction: dir, entry: e, stop: s, target: t, source: 'signal' }); signalAnalysisDate = d; signalTradeData = { entry: e, stop: s, target: t, direction: dir }; for (const tf of ['4h', '1h', '15m', '5m']) { const r = await getChartFromBinance(signalAsset, tf, d); signalCharts[tf] = r.klines; signalAnalyses[signalAnalyses.length - 1].klines = signalAnalyses[signalAnalyses.length - 1].klines || {}; signalAnalyses[signalAnalyses.length - 1].klines[tf] = r.klines; } currentSignalAnalysisIndex = signalAnalyses.length - 1; updateFloatingSignalButton(); switchSignalView('custom'); closeAddSignalPopup(); showToast('✅ Sinal adicionado!', 'success'); }
function updateFloatingSignalButton() { const b = document.getElementById('floatingSignalBtn'); if (signalAnalyses.length > 0) { b.classList.add('visible'); b.textContent = currentSignalAnalysisIndex + 1; } else { b.classList.remove('visible'); } }
function toggleFloatingSignal() { if (!signalAnalyses.length) return; currentSignalAnalysisIndex = (currentSignalAnalysisIndex + 1) % signalAnalyses.length; const a = signalAnalyses[currentSignalAnalysisIndex]; signalAnalysisDate = a.date; signalTradeData = { entry: a.entry, stop: a.stop, target: a.target, direction: a.direction }; document.getElementById('signalDate').value = a.date; document.getElementById('signalEntry').value = a.entry; document.getElementById('signalStop').value = a.stop; document.getElementById('signalTarget').value = a.target; setSignalDirection(a.direction); if (a.klines) signalCharts = a.klines; updateFloatingSignalButton(); switchSignalView('custom'); showToast(`Sinal ${currentSignalAnalysisIndex + 1} de ${signalAnalyses.length}`, 'info'); }
function closeAllSignalAnalyses() { if (!confirm('Fechar tudo?')) return; signalAnalyses = []; currentSignalAnalysisIndex = 0; signalTradeData = null; signalAnalysisDate = null; signalCharts = {}; document.getElementById('signalResultSection').style.display = 'none'; updateFloatingSignalButton(); showToast('Fechado!', 'success'); }
function copyComparisonPrompt() { navigator.clipboard.writeText(COMPARISON_PROMPT).then(() => showToast('Prompt de comparação copiado!', 'success')); }
async function pasteComparisonTable() { try { const t = await navigator.clipboard.readText(); document.getElementById('comparisonResponse').value = t; showToast('Colado! Processando...', 'success'); setTimeout(() => processComparison(), 300); } catch (e) { showToast('Use Ctrl+V manualmente.', 'error'); } }
async function processComparison() { const resp = document.getElementById('comparisonResponse').value.trim(); if (!resp) { showToast('Cole a resposta', 'error'); return; } showToast('Processando...', 'info'); const ld = document.getElementById('chartLoading'), lt = document.getElementById('chartLoadingText'); ld.classList.add('active'); try { const m = resp.match(/\[COMPARISON_TABLE\]([\s\S]*?)\[\/COMPARISON_TABLE\]/); let data = []; if (m) data = JSON.parse(m[1].trim()); else { const jm = resp.match(/\[[\s\S]*\]/); if (jm) data = JSON.parse(jm[0]); else throw new Error('Formato não encontrado'); } if (!data.length) throw new Error('Nenhuma análise encontrada'); signalAnalyses = []; const today = new Date().toISOString().slice(0, 16); for (let i = 0; i < data.length; i++) { const item = data[i]; signalAnalyses.push({ id: Date.now().toString() + i, asset: signalAsset, date: today, direction: item.direction, entry: parseFloat(item.entry), stop: parseFloat(item.stop), target: parseFloat(item.target), source: 'signal' }); } currentSignalAnalysisIndex = 0; const first = signalAnalyses[0]; signalAnalysisDate = first.date; signalTradeData = { entry: first.entry, stop: first.stop, target: first.target, direction: first.direction }; lt.textContent = `Carregando gráficos... 0/${data.length}`; for (let i = 0; i < signalAnalyses.length; i++) { lt.textContent = `Carregando... ${i + 1}/${data.length}`; const ch = {}; for (const tf of ['4h', '1h', '15m', '5m']) { const r = await getChartFromBinance(signalAsset, tf, signalAnalyses[i].date); ch[tf] = r.klines; } signalAnalyses[i].klines = ch; await sleep(100); } signalCharts = signalAnalyses[0].klines; document.getElementById('signalResultSection').style.display = 'block'; document.getElementById('signalDate').value = signalAnalysisDate; document.getElementById('signalEntry').value = signalTradeData.entry; document.getElementById('signalStop').value = signalTradeData.stop; document.getElementById('signalTarget').value = signalTradeData.target; setSignalDirection(signalTradeData.direction); updateFloatingSignalButton(); switchSignalView('custom'); ld.classList.remove('active'); showToast(`✅ ${data.length} análises importadas!`, 'success'); } catch (e) { ld.classList.remove('active'); showToast(`Erro: ${e.message}`, 'error'); } }

function joinSignalAnalyses() {
  if (!signalAnalyses.length) { showToast('Nenhuma análise', 'error'); return; }
  let th = '<table class="comparison-table"><tr><th>#</th><th>Dir</th><th>Entrada</th><th>Stop</th><th>Alvo</th><th>R:R</th><th>Resultado</th></tr>';
  let ls = 0, st = Infinity, li = -1, si = -1, cp = null;
  signalAnalyses.forEach((a, i) => { const e = a.entry || 0, s = a.stop || 0, t = a.target || 0, d = a.direction || '—', r = Math.abs(e - s), rw = Math.abs(t - e), rr = r > 0 ? (rw / r).toFixed(2) : '—'; if (r > ls) { ls = r; li = i; } if (rw < st && rw > 0) { st = rw; si = i; } if (!cp && e > 0) cp = e; const rb = a.result === 'win' ? '<span style="color:var(--green);">✅ WIN</span>' : a.result === 'loss' ? '<span style="color:var(--red);">❌ LOSS</span>' : '<span style="color:var(--text-tertiary);">—</span>'; th += `<tr><td>${i + 1}</td><td>${d}</td><td>${e}</td><td>${s}</td><td>${t}</td><td>1:${rr}</td><td id="signalJoinResult_${i}">${rb}</td></tr>`; });
  th += '</table>';
  let sh = '<div class="comparison-summary">';
  sh += `<strong>Stop mais longo:</strong> #${li + 1} (${ls.toFixed(2)})<br><strong>Alvo mais curto:</strong> #${si + 1} (${st.toFixed(2)})<br>`;
  if (cp && ls > 0 && st > 0) sh += `<br><strong>R:R conservador:</strong> 1:${(st / ls).toFixed(2)}`;
  sh += '</div>';
  const btns = `<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn-secondary" onclick="copyComparisonTable()" style="flex:1;margin:0;">Copiar Tabela</button><button class="btn-primary" onclick="openWinLossManualModal()" style="flex:1;margin:0;background:var(--blue);color:white;">Win/Loss? All</button></div>`;
  document.getElementById('joinResponsesContent').innerHTML = th + sh + btns;
  document.getElementById('joinResponsesModal').classList.add('active');
}

async function startOptimizerGeneration() { if (optimizerIsGenerating) return; const sd = document.getElementById('optStartDate').value, ed = document.getElementById('optEndDate').value; if (!sd || !ed) { showToast('Selecione datas', 'error'); return; } optimizerIsGenerating = true; optimizerCharts = []; optimizerItems = []; document.getElementById('optGenerateBtn').disabled = true; document.getElementById('optProgressContainer').style.display = 'block'; document.getElementById('optDownloadBtn').style.display = 'none'; document.getElementById('optPromptSection').style.display = 'none'; const ld = document.getElementById('chartLoading'), lt = document.getElementById('chartLoadingText'); ld.classList.add('active'); const start = new Date(sd), end = new Date(ed); end.setHours(23, 59, 59); const times = [6, 12, 21], tasks = []; const cur = new Date(start); while (cur <= end) { if (cur.getDay() !== 0 && cur.getDay() !== 6) for (const h of times) tasks.push({ date: new Date(cur), hour: h }); cur.setDate(cur.getDate() + 1); } const total = tasks.length; let comp = 0; for (const task of tasks) { const ds = `${String(task.date.getDate()).padStart(2, '0')}/${task.hour}h`; const lc = document.createElement('canvas'); lc.width = 400; lc.height = 400; const lx = lc.getContext('2d'); lx.fillStyle = '#000'; lx.fillRect(0, 0, 400, 400); lx.fillStyle = '#fff'; lx.font = 'bold 80px Inter,sans-serif'; lx.textAlign = 'center'; lx.textBaseline = 'middle'; lx.fillText(`${String(task.date.getDate()).padStart(2, '0')}/${task.hour}`, 200, 200); optimizerCharts.push({ type: 'label', label: ds, data: lc.toDataURL('image/jpeg', 0.9), date: task.date, hour: task.hour }); comp++; updateOptimizerProgress(comp, total * 5); lt.textContent = `${Math.round((comp / (total * 5)) * 100)}%`; const bt = new Date(task.date); bt.setHours(task.hour, 0, 0, 0); for (const tf of ['4h', '1h', '15m', '5m']) { try { const r = await getChartFromBinance(optAsset, tf, bt); optimizerCharts.push({ type: 'chart', label: `${ds} ${tf.toUpperCase()}`, data: r.chart, date: task.date, hour: task.hour, tf }); } catch (e) { console.error(e); } comp++; updateOptimizerProgress(comp, total * 5); lt.textContent = `${Math.round((comp / (total * 5)) * 100)}%`; await sleep(50); } } for (const task of tasks) optimizerItems.push({ label: `${String(task.date.getDate()).padStart(2, '0')}/${task.hour}h`, date: task.date, hour: task.hour, response: '', processed: false, result: null }); optimizerIsGenerating = false; document.getElementById('optGenerateBtn').disabled = false; document.getElementById('optDownloadBtn').style.display = 'flex'; document.getElementById('optPromptSection').style.display = 'block'; renderOptimizerList(); lt.textContent = 'Concluído!'; setTimeout(() => ld.classList.remove('active'), 500); showToast(`✅ ${total} conjuntos gerados!`, 'success'); }
function updateOptimizerProgress(c, t) { const p = Math.min(100, Math.round((c / t) * 100)); const pb = document.getElementById('optProgressBar'), pt = document.getElementById('optProgressText'); if (pb) pb.style.width = p + '%'; if (pt) pt.textContent = `${p}% - Gerando...`; }
async function downloadOptimizerCharts() { showToast('Baixando...', 'info'); for (let i = 0; i < optimizerCharts.length; i++) { const l = document.createElement('a'); l.download = `${optAsset}_${optimizerCharts[i].label.replace('/', '-')}.jpg`; l.href = optimizerCharts[i].data; l.click(); await sleep(300); } showToast('✅ Baixados!', 'success'); }
function renderOptimizerList() { const c = document.getElementById('optimizerList'); if (!optimizerItems.length) { c.innerHTML = ''; return; } c.innerHTML = optimizerItems.map((item, i) => `<div class="optimizer-item"><div class="optimizer-item-header"><div class="optimizer-item-title">${item.label}</div><div style="display:flex;gap:6px;align-items:center;">${item.result ? `<span class="optimizer-item-status ${item.result}">${item.result === 'win' ? '✅ WIN' : '❌ LOSS'}</span>` : ''}<span class="optimizer-item-status ${item.processed ? 'done' : 'pending'}">${item.processed ? '✅ Concluída' : '⏳ Pendente'}</span></div></div><textarea class="optimizer-item-textarea" id="optResponse_${i}" placeholder="Cole a resposta...">${item.response || ''}</textarea><div class="optimizer-item-actions"><button class="optimizer-item-btn" onclick="copyOptimizerItemPrompt(${i})">📋 Copiar</button><button class="optimizer-item-btn" onclick="pasteOptimizerResponse(${i})">📋 Colar</button><button class="optimizer-item-btn" onclick="processOptimizerItem(${i})">⚡ Processar</button><button class="optimizer-item-btn" onclick="openWinLossManualModal()">Win/Loss?</button><button class="optimizer-item-btn" onclick="showOptimizerResult(${i})">📊 Resultado</button></div></div>`).join(''); document.getElementById('optWinRateBtn').style.display = optimizerItems.every(i => i.processed) ? 'flex' : 'none'; document.getElementById('optWinRateAllBtn').style.display = optimizerItems.length ? 'flex' : 'none'; }
function copyOptimizerItemPrompt(i) { let p = globalCustomPrompt.trim() || buildPrompt(optAsset); if (visualTableEnabled) p += VISUAL_TABLE_PROMPT; navigator.clipboard.writeText(p).then(() => showToast('Copiado!', 'success')).catch(() => showToast('Erro', 'error')); }
async function pasteOptimizerResponse(i) { try { document.getElementById(`optResponse_${i}`).value = await navigator.clipboard.readText(); showToast('Colado!', 'success'); } catch (e) { showToast('Erro', 'error'); } }
async function processOptimizerItem(i) { const r = document.getElementById(`optResponse_${i}`).value.trim(); if (!r) { showToast('Cole a resposta', 'error'); return; } let td = parseVisualTable(r); if (!td) { td = await fetchGroqTable(r); if (!td) return; } optimizerItems[i].response = r; optimizerItems[i].processed = true; optimizerItems[i].tableData = td; renderOptimizerList(); showToast(`✅ ${optimizerItems[i].label} processada!`, 'success'); }
async function analyzeAllWinLoss() { const uv = optimizerItems.filter(i => i.processed && !i.result); if (!uv.length) { showToast('Todas verificadas', 'info'); return; } openWinLossManualModal(); }
async function showOptimizerResult(i) { const item = optimizerItems[i]; if (!item.tableData) return; const e = parseFloat(item.tableData.entry), s = parseFloat(item.tableData.stop_loss), t = parseFloat(item.tableData.target), d = item.tableData.direction; if (!e || !s || !t) return; showToast('Gerando...', 'info'); const m = document.getElementById('resultModal'), ti = document.getElementById('resultModalTitle'), c = document.getElementById('resultModalContent'); ti.textContent = `Resultado - ${item.label}`; c.innerHTML = `<div class="progress-container"><div class="progress-bar" id="optResultProgressBar" style="width:0%"></div></div><div class="progress-text" id="optResultProgressText">Carregando...</div>`; m.classList.add('active'); try { const ad = new Date(item.date); ad.setHours(item.hour, 0, 0, 0); const rd = new Date(ad.getTime() + 2 * 24 * 60 * 60 * 1000); const ch = {}; for (let j = 0; j < 4; j++) { const tf = ['4h', '1h', '15m', '5m'][j]; const r = await getChartFromBinance(optAsset, tf, rd); ch[tf] = r.klines; const p = ((j + 1) / 4) * 100; document.getElementById('optResultProgressBar').style.width = p + '%'; document.getElementById('optResultProgressText').textContent = `${tf.toUpperCase()}... ${Math.round(p)}%`; } c.innerHTML = `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">2 dias após ${item.label}</div><div class="chart-view-toggle" style="margin-bottom:12px;"><button class="chart-view-btn" id="optResultViewTV" onclick="switchOptResultView('tv','${optAsset}','${rd.toISOString()}','${item.date.toISOString()}',${e},${s},${t})">TradingView</button><button class="chart-view-btn highlight active" id="optResultViewCustom" onclick="switchOptResultView('custom','${optAsset}','${rd.toISOString()}','${item.date.toISOString()}',${e},${s},${t})">✨ Com Sinais</button></div><div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;"><div class="chart-tf-selector" style="flex:1;margin-bottom:0;"><button class="chart-tf-btn" data-tf="4h" onclick="switchOptResultTf('4h','${optAsset}','${rd.toISOString()}','${item.date.toISOString()}',${e},${s},${t})">4H</button><button class="chart-tf-btn active" data-tf="1h" onclick="switchOptResultTf('1h','${optAsset}','${rd.toISOString()}','${item.date.toISOString()}',${e},${s},${t})">1H</button><button class="chart-tf-btn" data-tf="15m" onclick="switchOptResultTf('15m','${optAsset}','${rd.toISOString()}','${item.date.toISOString()}',${e},${s},${t})">15M</button><button class="chart-tf-btn" data-tf="5m" onclick="switchOptResultTf('5m','${optAsset}','${rd.toISOString()}','${item.date.toISOString()}',${e},${s},${t})">5M</button></div><button class="chart-pnl-btn" onclick="downloadOptResultChart()">Baixar</button><button class="chart-pnl-btn" onclick="openWinLossManualModal()">Win/Loss?</button></div><div class="chart-wrapper" id="optResultChartWrapper" style="height:400px;"><div id="optResultTvWidgetContainer" style="width:100%;height:100%;"></div><canvas id="optResultSignalCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;"></canvas></div>`; window.optResultCharts = ch; window.optResultCurrentTf = '1h'; window.optResultCurrentView = 'custom'; window.optResultSignals = { entry: e, stop: s, target: t }; window.optResultAsset = optAsset; window.optResultDateStr = rd.toISOString(); window.optResultIdx = i; window.optResultAnalysisTimestamp = item.date.toISOString(); setTimeout(() => switchOptResultView('custom', optAsset, rd.toISOString(), item.date.toISOString(), e, s, t), 600); } catch (err) { showToast(`Erro: ${err.message}`, 'error'); } }

window.switchOptResultView = function (v, a, d, o, e, s, t) { window.optResultCurrentView = v; const tb = document.getElementById('optResultViewTV'), cb = document.getElementById('optResultViewCustom'); if (tb) tb.classList.toggle('active', v === 'tv'); if (cb) cb.classList.toggle('active', v === 'custom'); if (v === 'tv') { document.getElementById('optResultTvWidgetContainer').style.display = 'block'; document.getElementById('optResultSignalCanvas').style.display = 'none'; loadTradingViewWidget(a, window.optResultCurrentTf, 'optResultTvWidgetContainer'); } else { document.getElementById('optResultTvWidgetContainer').style.display = 'none'; document.getElementById('optResultSignalCanvas').style.display = 'block'; drawSignalCanvasWithRetry(window.optResultCharts[window.optResultCurrentTf], { entry: e, stop: s, target: t }, window.optResultCurrentTf, 'optResultSignalCanvas', null, false, true); } };
window.switchOptResultTf = function (tf, a, d, o, e, s, t) { window.optResultCurrentTf = tf; document.querySelectorAll('#resultModal .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf)); if (window.optResultCurrentView === 'tv') loadTradingViewWidget(a, tf, 'optResultTvWidgetContainer'); else { drawSignalCanvasWithRetry(window.optResultCharts[tf], { entry: e, stop: s, target: t }, tf, 'optResultSignalCanvas', null, false, true); } };
window.downloadOptResultChart = function () { const c = document.getElementById('optResultSignalCanvas'); if (!c) return; const l = document.createElement('a'); l.download = `${window.optResultAsset}_${window.optResultCurrentTf}_resultado.jpg`; l.href = c.toDataURL('image/jpeg', 0.9); l.click(); showToast('Baixado!', 'success'); };
function copyOptimizerPrompt() { let p = globalCustomPrompt.trim() || buildPrompt(optAsset); if (visualTableEnabled) p += VISUAL_TABLE_PROMPT; navigator.clipboard.writeText(p).then(() => showToast('Copiado!', 'success')).catch(() => showToast('Erro', 'error')); }
async function analyzeWinRate() { const pr = optimizerItems.filter(i => i.processed); if (!pr.length) { showToast('Nenhuma processada', 'error'); return; } const w = pr.filter(i => i.result === 'win').length, l = pr.filter(i => i.result === 'loss').length, p = pr.filter(i => !i.result).length, t = pr.length, wr = t > 0 ? ((w / t) * 100).toFixed(1) : 0; const cpt = 12, mf = 0.001, tkf = 0.001; let pnl = 0; pr.forEach(item => { if (!item.tableData || !item.result) return; const e = parseFloat(item.tableData.entry), s = parseFloat(item.tableData.stop_loss), tg = parseFloat(item.tableData.target), d = item.tableData.direction; if (!e || !s || !tg) return; const ra = cpt * 0.02, sd = Math.abs(e - s), ps = ra / (sd / e), ef = ps * mf; if (item.result === 'win') { const pr2 = d === 'LONG' ? (tg - e) : (e - tg); pnl += (pr2 / e) * ps - ef - ps * (tg / e) * tkf; } else { const lo = d === 'LONG' ? (e - s) : (s - e); pnl -= (lo / e) * ps + ef + ps * (s / e) * tkf; } }); const ic = t * cpt, fb = ic + pnl; let pu = globalCustomPrompt.trim() || buildPrompt(optAsset); if (visualTableEnabled) pu += VISUAL_TABLE_PROMPT; optimizerWinRateResult = `📊 RESULTADO OTIMIZADOR\n\n💰 Ativo: ${optAsset}\n📅 Período: ${document.getElementById('optStartDate').value} a ${document.getElementById('optEndDate').value}\n📈 Total: ${t}\n✅ Wins: ${w}\n❌ Losses: ${l}\n⏳ Pendentes: ${p}\n🎯 Taxa: ${wr}%\n💵 Capital/trade: $${cpt}\n💰 Total investido: $${ic}\n📊 PnL: $${pnl.toFixed(2)}\n💳 Saldo final: $${fb.toFixed(2)}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\nPROMPT USADO:\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${pu}`; document.getElementById('optWinRateText').textContent = optimizerWinRateResult; document.getElementById('optWinRateResult').style.display = 'block'; showToast('✅ Win Rate analisado!', 'success'); }
function copyWinRateResult() { if (!optimizerWinRateResult) return; navigator.clipboard.writeText(optimizerWinRateResult).then(() => showToast('Copiado!', 'success')).catch(() => showToast('Erro', 'error')); }
async function saveOptimizerSet() { const pr = optimizerItems.filter(i => i.processed); if (!pr.length) return; try { await FirebaseService.saveSet({ id: Date.now().toString(), date: new Date().toLocaleString('pt-BR'), asset: optAsset, analyses: pr.map(i => ({ ...i })) }); loadSavedSets(); showToast('✅ Salvo!', 'success'); } catch (e) { showToast(`Erro: ${e.message}`, 'error'); } }
function clearOptimizerPage() { if (!confirm('Limpar tudo?')) return; optimizerCharts = []; optimizerItems = []; optimizerWinRateResult = ''; document.getElementById('optStartDate').value = ''; document.getElementById('optEndDate').value = ''; document.getElementById('optProgressContainer').style.display = 'none'; document.getElementById('optDownloadBtn').style.display = 'none'; document.getElementById('optPromptSection').style.display = 'none'; document.getElementById('optWinRateResult').style.display = 'none'; document.getElementById('optimizerList').innerHTML = ''; document.getElementById('optWinRateBtn').style.display = 'none'; document.getElementById('optWinRateAllBtn').style.display = 'none'; showToast('Limpo!', 'success'); }

// ==========================================
// LÓGICA DO GERADOR TESTER
// ==========================================
function switchGenerator(mode) {
  const original = document.getElementById('originalGenerator');
  const tester = document.getElementById('testerGenerator');
  const btnOriginal = document.getElementById('btnOriginal');
  const btnTester = document.getElementById('btnTester');

  if (mode === 'tester') {
    original.style.display = 'none';
    tester.style.display = 'block';
    btnOriginal.classList.remove('btn-primary');
    btnOriginal.classList.add('btn-secondary');
    btnTester.classList.remove('btn-secondary');
    btnTester.classList.add('btn-primary');
  } else {
    original.style.display = 'block';
    tester.style.display = 'none';
    btnTester.classList.remove('btn-primary');
    btnTester.classList.add('btn-secondary');
    btnOriginal.classList.remove('btn-secondary');
    btnOriginal.classList.add('btn-primary');
  }
}

async function fetchTesterKlines(symbol, interval, endTime, limit = 85) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&endTime=${endTime}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro na API Binance: ${response.status}`);
  return await response.json();
}

function drawTesterTradingViewChart(klines, symbol, interval, endTimeDate) {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  const width = 800;
  const height = 600;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  const bgColor = '#000000';
  const gridColor = '#1a1a1a';
  const textColor = '#FFFFFF';
  const textMuted = '#A1A1AA';
  const upColor = '#26a69a';
  const downColor = '#ef5350';
  
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  
  const candles = klines.map(k => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]), closeTime: k[6]
  }));
  
  const lastCandle = candles[candles.length - 1];
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  const scale = calculateNiceScale(minPrice, maxPrice, 8);
  const yMin = scale.min;
  const yMax = scale.max;
  const tickSpacing = scale.tickSpacing;
  
  const rightPaddingCandles = 4;
  const chartLeft = 10;
  const chartRight = width - 80;
  const chartTop = 60;
  const chartBottom = height - 120;
  
  const totalSlots = candles.length + rightPaddingCandles;
  const chartWidth = chartRight - chartLeft;
  const spacing = chartWidth / totalSlots;
  const candleWidth = Math.max(2, spacing * 0.7);
  const chartHeight = chartBottom - chartTop;
  
  function priceToY(price) {
    return chartTop + chartHeight * (1 - (price - yMin) / (yMax - yMin));
  }
  
  function indexToX(i) {
    return chartLeft + spacing * i + spacing / 2;
  }
  
  const prevCandle = candles[candles.length - 2];
  const isLastGreen = lastCandle.close >= lastCandle.open;
  const ohlcColor = isLastGreen ? upColor : downColor;
  
  ctx.fillStyle = textColor;
  ctx.font = '600 14px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  const symbolName = symbol.replace('USDT', ' / USDT');
  ctx.fillText(`${symbolName} · ${interval.toUpperCase()}`, chartLeft, 25);
  
  if (interval === '4h') {
    const dateStr = endTimeDate.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    ctx.fillStyle = textMuted;
    ctx.font = '400 11px Montserrat, sans-serif';
    ctx.fillText(`Ref: ${dateStr}`, chartLeft, 45);
  }
  
  const priceChange = lastCandle.close - prevCandle.close;
  const percentChange = (priceChange / prevCandle.close) * 100;
  const changeColor = priceChange >= 0 ? upColor : downColor;
  const changeSign = priceChange >= 0 ? '+' : '';
  
  ctx.fillStyle = changeColor;
  ctx.font = '500 12px Montserrat, sans-serif';
  ctx.fillText(`${changeSign}${priceChange.toFixed(2)} (${changeSign}${percentChange.toFixed(2)}%)`, chartLeft + 200, 25);
  
  const ohlcStart = 380;
  ctx.fillStyle = textMuted;
  ctx.fillText('O', ohlcStart, 25);
  ctx.fillStyle = ohlcColor;
  ctx.fillText(formatPrice(lastCandle.open), ohlcStart + 12, 25);
  
  ctx.fillStyle = textMuted;
  ctx.fillText('H', ohlcStart + 80, 25);
  ctx.fillStyle = ohlcColor;
  ctx.fillText(formatPrice(lastCandle.high), ohlcStart + 92, 25);
  
  ctx.fillStyle = textMuted;
  ctx.fillText('L', ohlcStart + 160, 25);
  ctx.fillStyle = ohlcColor;
  ctx.fillText(formatPrice(lastCandle.low), ohlcStart + 172, 25);
  
  ctx.fillStyle = textMuted;
  ctx.fillText('C', ohlcStart + 240, 25);
  ctx.fillStyle = ohlcColor;
  ctx.fillText(formatPrice(lastCandle.close), ohlcStart + 252, 25);
  
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.font = '500 11px Montserrat, sans-serif';
  
  for (let price = yMin; price <= yMax; price += tickSpacing) {
    const y = priceToY(price);
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(price), chartRight + 8, y + 4);
  }
  
  const timeLabels = [];
  
  if (interval === '4h') {
    candles.forEach((c, i) => {
      const date = new Date(c.time);
      if (date.getHours() === 0 && date.getMinutes() === 0) {
        const x = indexToX(i);
        ctx.strokeStyle = gridColor;
        ctx.beginPath();
        ctx.moveTo(x, chartTop);
        ctx.lineTo(x, chartBottom);
        ctx.stroke();
        timeLabels.push({ x, label: String(date.getDate()) });
      }
    });
  } else {
    candles.forEach((c, i) => {
      const date = new Date(c.time);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      let shouldMark = false;
      let label = '';
      
      if (interval === '1h' && minutes === 0 && hours % 6 === 0) {
        shouldMark = true;
        label = hours === 0 ? String(date.getDate()) : `${String(hours).padStart(2, '0')}:00`;
      } else if (interval === '15m' && minutes === 0 && hours % 3 === 0) {
        shouldMark = true;
        label = hours === 0 ? String(date.getDate()) : `${String(hours).padStart(2, '0')}:00`;
      } else if (interval === '5m' && minutes === 0) {
        shouldMark = true;
        label = hours === 0 ? String(date.getDate()) : `${String(hours).padStart(2, '0')}:00`;
      }
      
      if (shouldMark) {
        const x = indexToX(i);
        ctx.strokeStyle = gridColor;
        ctx.beginPath();
        ctx.moveTo(x, chartTop);
        ctx.lineTo(x, chartBottom);
        ctx.stroke();
        timeLabels.push({ x, label });
      }
    });
  }
  
  candles.forEach((c, i) => {
    const x = indexToX(i);
    const isGreen = c.close >= c.open;
    const color = isGreen ? upColor : downColor;
    const centerX = x;
    const halfWidth = candleWidth / 2;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, priceToY(c.high));
    ctx.lineTo(centerX, priceToY(c.low));
    ctx.stroke();
    
    const bodyTop = priceToY(Math.max(c.open, c.close));
    const bodyBottom = priceToY(Math.min(c.open, c.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);
    
    ctx.fillStyle = color;
    ctx.fillRect(centerX - halfWidth, bodyTop, candleWidth, bodyHeight);
  });
  
  const lastPrice = lastCandle.close;
  const lastY = priceToY(lastPrice);
  
  ctx.strokeStyle = isLastGreen ? upColor : downColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(chartLeft, lastY);
  ctx.lineTo(chartRight, lastY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.fillStyle = isLastGreen ? upColor : downColor;
  ctx.fillRect(chartRight, lastY - 10, 78, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 11px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatPrice(lastPrice), chartRight + 4, lastY + 4);
  
  const volumes = candles.map(c => c.volume);
  const sma9 = calculateSMA(volumes, 9);
  const maxVol = Math.max(...volumes);
  const volHeight = 50;
  const volTop = chartBottom + 10;
  
  ctx.fillStyle = textMuted;
  ctx.font = '500 11px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  const baseSymbol = symbol.replace('USDT', '');
  ctx.fillText(`Volume · ${baseSymbol} SMA 9  ${formatVolume(lastCandle.volume)}`, chartLeft, volTop - 2);
  
  candles.forEach((c, i) => {
    const x = indexToX(i);
    const isGreen = c.close >= c.open;
    const barHeight = (c.volume / maxVol) * volHeight;
    const centerX = x;
    const halfWidth = candleWidth / 2;
    ctx.fillStyle = isGreen ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)';
    ctx.fillRect(centerX - halfWidth, volTop + volHeight - barHeight, candleWidth, barHeight);
  });
  
  ctx.strokeStyle = '#f0b90b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  sma9.forEach((val, i) => {
    if (val !== null) {
      const x = indexToX(i);
      const y = volTop + volHeight - (val / maxVol) * volHeight;
      if (!started) { ctx.moveTo(x, y); started = true; } 
      else { ctx.lineTo(x, y); }
    }
  });
  ctx.stroke();
  
  ctx.fillStyle = textMuted;
  ctx.font = '500 10px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  timeLabels.forEach(tl => {
    ctx.fillText(tl.label, tl.x, volTop + volHeight + 18);
  });
  
  return canvas;
}

function formatDateForTesterFilename(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const h = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}_${h}-${min}`;
}

async function generateTesterCharts() {
  const symbol = document.getElementById('testerSymbol').value;
  const dateTimeVal = document.getElementById('testerDateTime').value;
  
  if (!dateTimeVal) {
    showToast('Por favor, selecione uma data e hora.', 'error');
    return;
  }
  
  const exactEndTime = new Date(dateTimeVal).getTime();
  const dateObj = new Date(exactEndTime);
  
  testerChartImageData = {};
  
  const timeframes = ['4h', '1h', '15m', '5m'];
  const loading = document.getElementById('testerLoading');
  const container = document.getElementById('testerChartsContainer');
  const btn = document.getElementById('testerGenerateBtn');
  const downloadBtn = document.getElementById('testerDownloadAllBtn');
  
  loading.classList.add('active');
  container.innerHTML = '';
  btn.disabled = true;
  downloadBtn.disabled = true;
  
  try {
    for (const tf of timeframes) {
      await new Promise(r => setTimeout(r, 150));
      
      const rawKlines = await fetchTesterKlines(symbol, tf, exactEndTime, 85);
      const filteredKlines = rawKlines.filter(k => k[6] <= exactEndTime);
      const klines = filteredKlines.length > 0 ? filteredKlines : rawKlines;
      
      const canvas = drawTesterTradingViewChart(klines, symbol, tf, dateObj);
      testerChartImageData[tf] = canvas.toDataURL('image/jpeg', 0.7);
      
      const card = document.createElement('div');
      card.className = 'tester-chart-card';
      card.innerHTML = `
        <div class="tester-chart-header">
          <div class="tester-chart-title">${symbol} <span>${tf.toUpperCase()} • ${dateObj.toLocaleString('pt-BR')}</span></div>
        </div>
      `;
      card.appendChild(canvas);
      container.appendChild(card);
    }
    
    downloadBtn.disabled = false;
    setTimeout(() => loading.classList.remove('active'), 300);
    
  } catch (error) {
    showToast('Erro: ' + error.message, 'error');
    loading.classList.remove('active');
  } finally {
    btn.disabled = false;
  }
}

async function downloadTesterSequentially() {
  const btn = document.getElementById('testerDownloadAllBtn');
  const originalText = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = 'Baixando imagens...';

  const symbol = document.getElementById('testerSymbol').value;
  const dateTime = document.getElementById('testerDateTime').value;
  const dateObj = new Date(new Date(dateTime).getTime());
  const filenameDate = formatDateForTesterFilename(dateObj);
  
  const timeframes = ['4h', '1h', '15m', '5m'];

  for (const tf of timeframes) {
    const filename = `${symbol}_${filenameDate}_${tf}.jpg`;
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = testerChartImageData[tf];
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  btn.disabled = false;
  btn.innerHTML = originalText;
  showToast('✅ Imagens baixadas em sequência!', 'success');
}