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

const TELEGRAM_BOT_TOKEN = '8857528344:AAGlCVjT6mRjSEw8v3zU30azQFbu1rpssSI';
const TELEGRAM_CHAT_ID = '4440013813';
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-70b-versatile";

let selectedAsset = 'BTCUSDT';
let selectedAssetIcon = '₿';
let printAsset = 'BTCUSDT';
let printAssetIcon = '';
let manualAsset = 'BTCUSDT';
let manualAssetIcon = '₿';
let signalAsset = 'BTCUSDT';
let signalAssetIcon = '₿';
let optAsset = 'BTCUSDT';
let optAssetIcon = '';
let uploadedImages = [];
let isAnalyzing = false;
let isGenerating = false;
let generatedPrints = {};
let visualTableEnabled = true;
let experimentalMode = true;
let currentTradeData = null;
let chartKlines = {};
let currentChartView = 'tv';
let currentSignalTf = '1h';
let manualChartKlines = {};
let manualCurrentChartView = 'custom';
let manualCurrentSignalTf = '1h';
let manualTradeData = null;
let manualAnalysisDate = null;
let manualAnalysisTimestamp = null;
let analysisTimerInterval = null;
let analysisStartTime = 0;
let rateLimitTimerInterval = null;
let rateLimitSeconds = 60;
let savedAnalyses = [];
let savedSets = [];
let currentAnalysisData = null;
let analysisGroups = [];
let currentAnalysisIndex = 0;
let lastAnalysisImages = [];
let lastAnalysisPrompt = '';
let dailyRequests = 0;
let manualAnalyses = [];
let currentManualAnalysisIndex = 0;

// NOVO: Prompt personalizado global
let globalCustomPrompt = '';

// Sinal Manual
let signalAnalyses = [];
let currentSignalAnalysisIndex = 0;
let signalTradeData = null;
let signalAnalysisDate = null;
let signalCharts = {};
let signalCurrentTf = '1h';
let signalCurrentView = 'custom';
let signalShowingOriginal = true;

let optimizerCharts = [];
let optimizerItems = [];
let optimizerIsGenerating = false;
let optimizerWinRateResult = '';

const FirebaseService = {
  enabled: false,
  config: null,
  async init(config) { this.config = config; this.enabled = true; },
  async saveAnalysis(analysis) { return this.saveAnalysisLocal(analysis); },
  async getAnalyses() { return this.getAnalysesLocal(); },
  async updateAnalysis(id, updates) { return this.updateAnalysisLocal(id, updates); },
  async saveNotes(notes) { return this.saveNotesLocal(notes); },
  async getNotes() { return this.getNotesLocal(); },
  async saveSet(set) { return this.saveSetLocal(set); },
  async getSets() { return this.getSetsLocal(); },
  saveAnalysisLocal(analysis) {
    const analyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    analyses.unshift(analysis);
    localStorage.setItem('savedAnalyses', JSON.stringify(analyses));
    return analysis;
  },
  getAnalysesLocal() { return JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); },
  updateAnalysisLocal(id, updates) {
    const analyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    const idx = analyses.findIndex(a => a.id === id);
    if (idx !== -1) {
      analyses[idx] = { ...analyses[idx], ...updates };
      localStorage.setItem('savedAnalyses', JSON.stringify(analyses));
    }
    return analyses[idx];
  },
  saveNotesLocal(notes) { localStorage.setItem('userNotes', notes); return notes; },
  getNotesLocal() { return localStorage.getItem('userNotes') || ''; },
  saveSetLocal(set) {
    const sets = JSON.parse(localStorage.getItem('savedSets') || '[]');
    sets.unshift(set);
    localStorage.setItem('savedSets', JSON.stringify(sets));
    return set;
  },
  getSetsLocal() { return JSON.parse(localStorage.getItem('savedSets') || '[]'); }
};

document.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('geminiApiKey');
  const savedModel = localStorage.getItem('geminiModel');
  const savedGroq = localStorage.getItem('groqApiKey');
  const savedBinanceKey = localStorage.getItem('binanceApiKey');
  const savedBinanceSecret = localStorage.getItem('binanceApiSecret');
  const savedVisual = localStorage.getItem('visualTable');
  const savedExperimental = localStorage.getItem('experimental');
  const savedCapital = localStorage.getItem('capital');
  const savedRisk = localStorage.getItem('riskPercent');
  const savedGlobalPrompt = localStorage.getItem('globalCustomPrompt');
  
  if (savedKey) document.getElementById('geminiApiKey').value = savedKey;
  if (savedModel) document.getElementById('geminiModel').value = savedModel;
  if (savedGroq) document.getElementById('groqApiKey').value = savedGroq;
  if (savedBinanceKey) document.getElementById('binanceApiKey').value = savedBinanceKey;
  if (savedBinanceSecret) document.getElementById('binanceApiSecret').value = savedBinanceSecret;
  if (savedGlobalPrompt) {
    globalCustomPrompt = savedGlobalPrompt;
    document.getElementById('globalCustomPrompt').value = savedGlobalPrompt;
  }
  
  if (savedVisual !== null) { visualTableEnabled = savedVisual === 'true'; document.getElementById('toggleVisualTable').checked = visualTableEnabled; }
  if (savedExperimental !== null) { experimentalMode = savedExperimental === 'true'; document.getElementById('toggleExperimental').checked = experimentalMode; }
  if (savedCapital) document.getElementById('capitalInput').value = savedCapital;
  if (savedRisk) document.getElementById('riskPercentInput').value = savedRisk;
  
  // Auto-save do prompt personalizado global
  document.getElementById('globalCustomPrompt').addEventListener('input', (e) => {
    globalCustomPrompt = e.target.value;
    localStorage.setItem('globalCustomPrompt', globalCustomPrompt);
  });
  
  setNow(); setPrintNow(); setSignalNow();
  buildAssetDropdowns();
  loadSavedAnalyses();
  loadSavedSets();
  loadNotes();
  updateFirebaseWarning();
  updateRequestsCounter();
});

['geminiApiKey', 'geminiModel', 'groqApiKey', 'binanceApiKey', 'binanceApiSecret'].forEach(id => { 
  document.getElementById(id).addEventListener('change', (e) => localStorage.setItem(id, e.target.value)); 
});
['capitalInput', 'riskPercentInput'].forEach(id => { 
  document.getElementById(id).addEventListener('change', (e) => localStorage.setItem(id.replace('Input',''), e.target.value)); 
});

function saveToggle(key, value) { 
  localStorage.setItem(key, value); 
  if (key === 'visualTable') visualTableEnabled = value;
  if (key === 'experimental') { experimentalMode = value; updateFirebaseWarning(); }
}

function updateFirebaseWarning() {
  const warning = document.getElementById('firebaseWarning');
  if (warning) warning.style.display = experimentalMode ? 'block' : 'none';
}

function toggleApiSettings() { const s = document.getElementById('apiSection'); s.style.display = s.style.display === 'none' ? 'block' : 'none'; }
function toggleApiContent() { document.getElementById('apiToggle').classList.toggle('open'); document.getElementById('apiContent').classList.toggle('open'); }
function toggleNotesContent() { document.getElementById('notesToggle').classList.toggle('open'); document.getElementById('notesContent').classList.toggle('open'); }

function setNow() { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); document.getElementById('chartDate').value = now.toISOString().slice(0, 16); }
function setPrintNow() { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); document.getElementById('printDate').value = now.toISOString().slice(0, 16); }
function setSignalNow() { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); document.getElementById('signalDate').value = now.toISOString().slice(0, 16); }

function buildAssetDropdowns() {
  const html = ASSETS.map(a => `
    <div class="asset-option ${a.symbol === selectedAsset ? 'selected' : ''}" data-asset="${a.symbol}" data-icon="${a.icon}" onclick="selectAsset(this)">
      <div class="asset-option-icon">${a.icon}</div>
      <div><div class="asset-option-name">${a.name}</div><div class="asset-option-pair">${a.symbol}</div></div>
    </div>
  `).join('');
  document.getElementById('assetDropdown').innerHTML = html;
  
  document.getElementById('printAssetDropdown').innerHTML = ASSETS.map(a => `
    <div class="asset-option ${a.symbol === printAsset ? 'selected' : ''}" data-asset="${a.symbol}" data-icon="${a.icon}" onclick="selectPrintAsset(this)">
      <div class="asset-option-icon">${a.icon}</div>
      <div><div class="asset-option-name">${a.name}</div><div class="asset-option-pair">${a.symbol}</div></div>
    </div>
  `).join('');
  
  document.getElementById('manualAssetDropdown').innerHTML = ASSETS.map(a => `
    <div class="asset-option ${a.symbol === manualAsset ? 'selected' : ''}" data-asset="${a.symbol}" data-icon="${a.icon}" onclick="selectManualAsset(this)">
      <div class="asset-option-icon">${a.icon}</div>
      <div><div class="asset-option-name">${a.name}</div><div class="asset-option-pair">${a.symbol}</div></div>
    </div>
  `).join('');
  
  document.getElementById('signalAssetDropdown').innerHTML = ASSETS.map(a => `
    <div class="asset-option ${a.symbol === signalAsset ? 'selected' : ''}" data-asset="${a.symbol}" data-icon="${a.icon}" onclick="selectSignalAsset(this)">
      <div class="asset-option-icon">${a.icon}</div>
      <div><div class="asset-option-name">${a.name}</div><div class="asset-option-pair">${a.symbol}</div></div>
    </div>
  `).join('');
  
  document.getElementById('optAssetDropdown').innerHTML = ASSETS.map(a => `
    <div class="asset-option ${a.symbol === optAsset ? 'selected' : ''}" data-asset="${a.symbol}" data-icon="${a.icon}" onclick="selectOptAsset(this)">
      <div class="asset-option-icon">${a.icon}</div>
      <div><div class="asset-option-name">${a.name}</div><div class="asset-option-pair">${a.symbol}</div></div>
    </div>
  `).join('');
}

function toggleAssetDropdown() { document.getElementById('assetDropdown').classList.toggle('open'); }
function selectAsset(el) {
  selectedAsset = el.dataset.asset; selectedAssetIcon = el.dataset.icon;
  document.getElementById('selectedAssetIcon').textContent = selectedAssetIcon;
  document.getElementById('selectedAssetName').textContent = selectedAsset;
  document.querySelectorAll('#assetDropdown .asset-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('assetDropdown').classList.remove('open');
}
function togglePrintAssetDropdown() { document.getElementById('printAssetDropdown').classList.toggle('open'); }
function selectPrintAsset(el) {
  printAsset = el.dataset.asset; printAssetIcon = el.dataset.icon;
  document.getElementById('printSelectedIcon').textContent = printAssetIcon;
  document.getElementById('printSelectedName').textContent = printAsset;
  document.querySelectorAll('#printAssetDropdown .asset-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('printAssetDropdown').classList.remove('open');
}
function toggleManualAssetDropdown() { document.getElementById('manualAssetDropdown').classList.toggle('open'); }
function selectManualAsset(el) {
  manualAsset = el.dataset.asset; manualAssetIcon = el.dataset.icon;
  document.getElementById('manualSelectedIcon').textContent = manualAssetIcon;
  document.getElementById('manualSelectedName').textContent = manualAsset;
  document.querySelectorAll('#manualAssetDropdown .asset-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('manualAssetDropdown').classList.remove('open');
}
function toggleSignalAssetDropdown() { document.getElementById('signalAssetDropdown').classList.toggle('open'); }
function selectSignalAsset(el) {
  signalAsset = el.dataset.asset; signalAssetIcon = el.dataset.icon;
  document.getElementById('signalSelectedIcon').textContent = signalAssetIcon;
  document.getElementById('signalSelectedName').textContent = signalAsset;
  document.querySelectorAll('#signalAssetDropdown .asset-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('signalAssetDropdown').classList.remove('open');
}
function toggleOptAssetDropdown() { document.getElementById('optAssetDropdown').classList.toggle('open'); }
function selectOptAsset(el) {
  optAsset = el.dataset.asset; optAssetIcon = el.dataset.icon;
  document.getElementById('optSelectedIcon').textContent = optAssetIcon;
  document.getElementById('optSelectedName').textContent = optAsset;
  document.querySelectorAll('#optAssetDropdown .asset-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('optAssetDropdown').classList.remove('open');
}
document.addEventListener('click', (e) => { if (!e.target.closest('.asset-selector')) document.querySelectorAll('.asset-dropdown').forEach(d => d.classList.remove('open')); });

function switchPage(pageId, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  window.scrollTo(0, 0);
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { sma.push(null); }
    else { let sum = 0; for (let j = 0; j < period; j++) sum += data[i - j]; sma.push(sum / period); }
  }
  return sma;
}

function formatVolume(vol) {
  if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(2) + 'K';
  return vol.toFixed(2);
}

function formatPrice(price) {
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(3);
  return price.toFixed(2);
}

function niceNum(range, round) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

function calculateNiceScale(min, max, numTicks = 8) {
  const range = max - min;
  let tickSpacing = niceNum(range / (numTicks - 1), true);
  let niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  let niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
  const numActualTicks = Math.round((niceMax - niceMin) / tickSpacing) + 1;
  if (numActualTicks < 6) {
    tickSpacing = tickSpacing / 2;
    niceMin = Math.floor(min / tickSpacing) * tickSpacing;
    niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
  } else if (numActualTicks > 10) {
    tickSpacing = tickSpacing * 2;
    niceMin = Math.floor(min / tickSpacing) * tickSpacing;
    niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
  }
  return { min: niceMin, max: niceMax, tickSpacing };
}

function drawTradingViewChart(klines, symbol, interval, endTimeDate) {
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
  const textColor = '#d1d4dc';
  const textMuted = '#787b86';
  const upColor = '#26a69a';
  const downColor = '#ef5350';
  
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  
  const candles = klines.map(k => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
  }));
  
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
  
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length >= 2 ? candles[candles.length - 2] : lastCandle;
  const isLastGreen = lastCandle.close >= lastCandle.open;
  const ohlcColor = isLastGreen ? upColor : downColor;
  
  ctx.fillStyle = textColor;
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  const symbolName = symbol.replace('USDT', ' / USDT');
  ctx.fillText(`${symbolName} · ${interval.toUpperCase()}`, chartLeft, 25);
  
  const priceChange = lastCandle.close - prevCandle.close;
  const percentChange = (priceChange / prevCandle.close) * 100;
  const changeColor = priceChange >= 0 ? upColor : downColor;
  const changeSign = priceChange >= 0 ? '+' : '';
  
  ctx.fillStyle = changeColor;
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${changeSign}${priceChange.toFixed(2)} (${changeSign}${percentChange.toFixed(2)}%)`, chartLeft + 200, 25);
  
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  const ohlcStart = 380;
  
  ctx.fillStyle = textMuted; ctx.fillText('O', ohlcStart, 25);
  ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.open), ohlcStart + 12, 25);
  ctx.fillStyle = textMuted; ctx.fillText('H', ohlcStart + 80, 25);
  ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.high), ohlcStart + 92, 25);
  ctx.fillStyle = textMuted; ctx.fillText('L', ohlcStart + 160, 25);
  ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.low), ohlcStart + 172, 25);
  ctx.fillStyle = textMuted; ctx.fillText('C', ohlcStart + 240, 25);
  ctx.fillStyle = ohlcColor; ctx.fillText(formatPrice(lastCandle.close), ohlcStart + 252, 25);
  
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  
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
    const startOffset = 6 - (candles.length % 6);
    for (let i = startOffset; i < candles.length; i += 6) {
      const date = new Date(candles[i].time);
      const x = indexToX(i);
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartTop);
      ctx.lineTo(x, chartBottom);
      ctx.stroke();
      timeLabels.push({ x, label: String(date.getDate()) });
    }
  } else {
    candles.forEach((c, i) => {
      const date = new Date(c.time);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      let shouldMark = false;
      let label = '';
      
      if (interval === '1h') {
        if (minutes === 0 && hours % 6 === 0) {
          shouldMark = true;
          label = hours === 0 ? String(date.getDate()) : `${String(hours).padStart(2, '0')}:00`;
        }
      } else if (interval === '15m') {
        if (minutes === 0 && hours % 3 === 0) {
          shouldMark = true;
          label = hours === 0 ? String(date.getDate()) : `${String(hours).padStart(2, '0')}:00`;
        }
      } else if (interval === '5m') {
        if (minutes === 0) {
          shouldMark = true;
          label = hours === 0 ? String(date.getDate()) : `${String(hours).padStart(2, '0')}:00`;
        }
      }
      
      if (shouldMark) {
        const x = indexToX(i);
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
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
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatPrice(lastPrice), chartRight + 4, lastY + 4);
  
  const volumes = candles.map(c => c.volume);
  const sma9 = calculateSMA(volumes, 9);
  const maxVol = Math.max(...volumes);
  const volHeight = 50;
  const volTop = chartBottom + 10;
  
  ctx.fillStyle = textMuted;
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
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
  
  const labelY = volTop + volHeight + 18;
  ctx.fillStyle = textMuted;
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  timeLabels.forEach(tl => { ctx.fillText(tl.label, tl.x, labelY); });
  
  return canvas;
}

async function fetchBinanceKlines(symbol, interval, endTime, limit = 85) {
  let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  if (endTime) url += `&endTime=${endTime}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API: ${res.status}`);
  return await res.json();
}

async function getChartFromBinance(symbol, timeframe, endDate) {
  const intervalMap = { '4h': '4h', '1h': '1h', '15m': '15m', '5m': '5m' };
  let endTime = null;
  if (endDate) {
    endTime = new Date(endDate).getTime();
  }
  const klines = await fetchBinanceKlines(symbol, intervalMap[timeframe], endTime, 85);
  const canvas = drawTradingViewChart(klines, symbol, timeframe, endDate);
  const chart = canvas.toDataURL('image/jpeg', 0.7);
  return { klines, chart };
}

function drawSignalCanvasWithRetry(klines, signals, tf, canvasId, analysisTimestamp, maxRetries = 10) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const wrapperId = canvasId === 'signalCanvas' ? 'chartWrapper' : 
                    canvasId === 'manualSignalCanvas' ? 'manualChartWrapper' :
                    canvasId === 'resultSignalCanvas' ? 'resultChartWrapper' :
                    canvasId === 'manualResultSignalCanvas' ? 'manualResultChartWrapper' :
                    canvasId === 'optResultSignalCanvas' ? 'optResultChartWrapper' :
                    canvasId === 'signalManualCanvas' ? 'signalChartWrapper' : null;
  
  if (!wrapperId) return;
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  
  const rect = wrapper.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    if (maxRetries > 0) {
      setTimeout(() => drawSignalCanvasWithRetry(klines, signals, tf, canvasId, analysisTimestamp, maxRetries - 1), 200);
    }
    return;
  }
  
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const width = rect.width, height = rect.height;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);
  
  const candles = klines.map(k => ({ time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const padding = priceRange * 0.2;
  const yMin = minPrice - padding, yMax = maxPrice + padding;
  const chartLeft = 10, chartRight = width - 75, chartTop = 10, chartBottom = height - 10;
  const chartWidth = chartRight - chartLeft, chartHeight = chartBottom - chartTop;
  const candleWidth = Math.max(2, (chartWidth / candles.length) * 0.7);
  const spacing = chartWidth / candles.length;
  const priceToY = (p) => chartTop + chartHeight * (1 - (p - yMin) / (yMax - yMin));
  const indexToX = (i) => chartLeft + spacing * i + spacing / 2;
  
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const y = chartTop + (chartHeight / 6) * i;
    ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke();
    const price = yMax - ((yMax - yMin) / 6) * i;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(price.toFixed(price < 1 ? 4 : 2), chartRight + 65, y + 3);
  }
  
  candles.forEach((c, i) => {
    const x = indexToX(i);
    const isGreen = c.close >= c.open;
    const color = isGreen ? '#26a69a' : '#ef5350';
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, priceToY(c.high)); ctx.lineTo(x, priceToY(c.low)); ctx.stroke();
    const bodyTop = priceToY(Math.max(c.open, c.close)), bodyBottom = priceToY(Math.min(c.open, c.close));
    ctx.fillStyle = color;
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyBottom - bodyTop));
  });

  if (signals) {
    const { entry, stop, target } = signals;
    if (entry) { const entryY = priceToY(entry); ctx.strokeStyle = '#0a84ff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(chartLeft, entryY); ctx.lineTo(chartRight + 70, entryY); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#0a84ff'; ctx.fillRect(chartRight + 2, entryY - 10, 68, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'left'; ctx.fillText(`ENT ${formatPrice(entry)}`, chartRight + 5, entryY + 3); }
    if (stop) { const stopY = priceToY(stop); ctx.strokeStyle = '#ff453a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(chartLeft, stopY); ctx.lineTo(chartRight + 70, stopY); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ff453a'; ctx.fillRect(chartRight + 2, stopY - 10, 68, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.fillText(`SL ${formatPrice(stop)}`, chartRight + 5, stopY + 3); }
    if (target) { const targetY = priceToY(target); ctx.strokeStyle = '#30d158'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(chartLeft, targetY); ctx.lineTo(chartRight + 70, targetY); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#30d158'; ctx.fillRect(chartRight + 2, targetY - 10, 68, 20); ctx.fillStyle = '#000'; ctx.font = 'bold 10px Inter'; ctx.fillText(`TP ${formatPrice(target)}`, chartRight + 5, targetY + 3); }
  }
}

function drawAnalysisLine(klines, canvasId, analysisTimestamp, maxRetries = 10) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analysisTimestamp) return;
  
  const wrapperId = canvasId === 'resultSignalCanvas' ? 'resultChartWrapper' :
                    canvasId === 'manualResultSignalCanvas' ? 'manualResultChartWrapper' :
                    canvasId === 'optResultSignalCanvas' ? 'optResultChartWrapper' : null;
  if (!wrapperId) return;
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  
  const rect = wrapper.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    if (maxRetries > 0) {
      setTimeout(() => drawAnalysisLine(klines, canvasId, analysisTimestamp, maxRetries - 1), 200);
    }
    return;
  }
  
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  
  const chartLeft = 10, chartRight = width - 75, chartTop = 10, chartBottom = height - 10;
  const chartWidth = chartRight - chartLeft;
  const spacing = chartWidth / (klines.length + 4);
  const indexToX = (i) => chartLeft + spacing * i + spacing / 2;
  
  const analysisTime = new Date(analysisTimestamp).getTime();
  let closestIdx = -1;
  let closestDiff = Infinity;
  klines.forEach((c, i) => {
    const diff = Math.abs(c.time - analysisTime);
    if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
  });
  
  if (closestIdx >= 0) {
    const x = indexToX(closestIdx);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, chartTop);
    ctx.lineTo(x, chartBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('ANÁLISE', x, chartTop - 2);
  }
}

function loadTradingViewWidget(symbol, tf, containerId = 'tvWidgetContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const tvSymbol = `BINANCE:${symbol}`;
  const intervalMap = { '4h': '240', '1h': '60', '15m': '15', '5m': '5' };
  const tvInterval = intervalMap[tf] || '60';
  const widget = document.createElement('div');
  widget.className = 'tradingview-widget-container';
  widget.style.height = '100%'; widget.style.width = '100%';
  const widgetDiv = document.createElement('div');
  widgetDiv.className = 'tradingview-widget-container__widget';
  widgetDiv.style.height = '100%'; widgetDiv.style.width = '100%';
  widget.appendChild(widgetDiv);
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.innerHTML = JSON.stringify({
    autosize: true, symbol: tvSymbol, interval: tvInterval, timezone: 'America/Sao_Paulo',
    theme: 'dark', style: '1', locale: 'br', backgroundColor: '#0a0a0a', gridColor: 'rgba(255,255,255,0.04)',
    hide_top_toolbar: false, hide_legend: false, save_image: false, calendar: false,
    support_host: 'https://www.tradingview.com', studies: [], show_popup_button: true
  });
  widget.appendChild(script);
  container.appendChild(widget);
}

function switchChartView(view) {
  currentChartView = view;
  document.getElementById('viewTV').classList.toggle('active', view === 'tv');
  document.getElementById('viewCustom').classList.toggle('active', view === 'custom');
  const tvContainer = document.getElementById('tvWidgetContainer');
  const signalCanvas = document.getElementById('signalCanvas');
  if (view === 'tv') {
    tvContainer.style.display = 'block'; signalCanvas.style.display = 'none';
    if (chartKlines[currentSignalTf]) loadTradingViewWidget(selectedAsset, currentSignalTf);
  } else {
    tvContainer.style.display = 'none'; signalCanvas.style.display = 'block';
    drawSignalCanvasWithRetry(chartKlines[currentSignalTf], currentTradeData, currentSignalTf, 'signalCanvas', null);
  }
}

function switchSignalTf(tf) {
  currentSignalTf = tf;
  document.querySelectorAll('#signalTfSelector .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  document.getElementById('signalTfLabel').textContent = `Timeframe: ${tf.toUpperCase()}`;
  if (currentChartView === 'custom' && chartKlines[tf] && currentTradeData) {
    drawSignalCanvasWithRetry(chartKlines[tf], currentTradeData, tf, 'signalCanvas', null);
  } else if (currentChartView === 'tv') {
    loadTradingViewWidget(selectedAsset, tf);
  }
}

function switchManualChartView(view) {
  manualCurrentChartView = view;
  document.getElementById('manualViewTV').classList.toggle('active', view === 'tv');
  document.getElementById('manualViewCustom').classList.toggle('active', view === 'custom');
  const tvContainer = document.getElementById('manualTvWidgetContainer');
  const signalCanvas = document.getElementById('manualSignalCanvas');
  if (view === 'tv') {
    tvContainer.style.display = 'block'; signalCanvas.style.display = 'none';
    if (manualChartKlines[manualCurrentSignalTf]) loadTradingViewWidget(manualAsset, manualCurrentSignalTf, 'manualTvWidgetContainer');
  } else {
    tvContainer.style.display = 'none'; signalCanvas.style.display = 'block';
    drawSignalCanvasWithRetry(manualChartKlines[manualCurrentSignalTf], manualTradeData, manualCurrentSignalTf, 'manualSignalCanvas', null);
  }
}

function switchManualSignalTf(tf) {
  manualCurrentSignalTf = tf;
  document.querySelectorAll('#pageManual .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  document.getElementById('manualSignalTfLabel').textContent = `Timeframe: ${tf.toUpperCase()}`;
  if (manualCurrentChartView === 'custom' && manualChartKlines[tf] && manualTradeData) {
    drawSignalCanvasWithRetry(manualChartKlines[tf], manualTradeData, tf, 'manualSignalCanvas', null);
  } else if (manualCurrentChartView === 'tv') {
    loadTradingViewWidget(manualAsset, tf, 'manualTvWidgetContainer');
  }
}

function handleFileUpload(event) {
  Array.from(event.target.files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => { uploadedImages.push({ name: file.name, data: e.target.result }); renderUploadedImages(); };
      reader.readAsDataURL(file);
    }
  });
  event.target.value = '';
}

function renderUploadedImages() {
  const section = document.getElementById('uploadSection');
  const container = document.getElementById('uploadedImages');
  if (uploadedImages.length > 0) section.style.display = 'block';
  container.innerHTML = uploadedImages.map((img, idx) => `
    <div class="print-preview"><img src="${img.data}" alt="${img.name}"><div class="print-preview-label">${['4H','1H','15M','5M'][idx] || `IMG ${idx+1}`}</div><button class="print-preview-download" onclick="removeUploadedImage(${idx})" style="background: rgba(255,69,58,0.9);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: #fff;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
  `).join('');
}

function removeUploadedImage(idx) { 
  uploadedImages.splice(idx, 1); 
  renderUploadedImages(); 
  if (uploadedImages.length === 0) document.getElementById('uploadSection').style.display = 'none'; 
}

const VISUAL_TABLE_PROMPT = `

========================================================
TABELA VISUAL — DADOS ESTRUTURADOS (OBRIGATÓRIO)
========================================================

Após toda a sua análise, você DEVE gerar um bloco JSON estruturado entre as tags [PRIME_TABLE] e [/PRIME_TABLE] com os seguintes campos. Preencha TODOS os campos com base na sua análise. Use valores curtos e objetivos.

[PRIME_TABLE]
{
  "score": 0,
  "score_label": "Muito Fraco|Fraco|Moderado|Bom|Muito Bom|Excelente|Excepcional",
  "trend": "Bullish|Bearish|Neutro",
  "signal": "LONG|SHORT|HOLD|NO TRADE",
  "risk": "Baixo|Médio|Alto",
  "volume": "Baixo|Médio|Alto",
  "direction": "LONG|SHORT|NO TRADE",
  "entry": "apenas numeros com ponto decimal, SEM PONTOS OU VIRGULAS DE MILHAR (ex: 65000.50)",
  "stop_loss": "apenas numeros com ponto decimal, SEM PONTOS OU VIRGULAS DE MILHAR (ex: 64000.00)",
  "target": "apenas numeros com ponto decimal, SEM PONTOS OU VIRGULAS DE MILHAR (ex: 68000.00)",
  "risk_reward": "1:X (ex: 1:2.5)",
  "entry_type": "IMEDIATA|PULLBACK|CONFIRMAÇÃO",
  "confidence": "BAIXA|MÉDIA|ALTA",
  "regime": "TENDÊNCIA|RANGE|TRANSIÇÃO|COMPRESSÃO|EXPANSÃO",
  "strategy_name": "nome curto da estratégia",
  "strategy_bars": [0, 0, 0, 0],
  "analysis_date": "DD/MM/YYYY",
  "analysis_time": "HH:MM"
}
[/PRIME_TABLE]

REGRAS DA TABELA:
- entry, stop_loss e target DEVEM ser apenas números com ponto decimal. NUNCA use vírgulas ou pontos para separar milhares (ex: NÃO use 65.000,50 ou 65,000.50). Use apenas 65000.50.
- score: número de 0 a 10
- risk_reward: formato "1:X" onde X é o ratio
- strategy_bars: array com 4 números de 0 a 100
- analysis_date: data das imagens/gráficos analisados no formato DD/MM/YYYY
- analysis_time: horário aproximado das imagens no formato HH:MM
- Todos os campos de texto devem ser curtos (máximo 20 caracteres cada)
- Este bloco é OBRIGATÓRIO e deve vir no FINAL da resposta`;

const COMPARISON_PROMPT = `Analise as seguintes respostas de IA e extraia os dados de cada análise para preencher uma tabela comparativa. Para cada análise, identifique: Número da Análise, Direção (LONG/SHORT), Entrada, Stop, Alvo e R:R. Retorne APENAS um bloco JSON válido entre [COMPARISON_TABLE] e [/COMPARISON_TABLE] no seguinte formato:
[COMPARISON_TABLE]
[
  {"id": 1, "direction": "LONG", "entry": "65000", "stop": "64000", "target": "68000", "rr": "1:3"},
  {"id": 2, "direction": "SHORT", "entry": "65000", "stop": "66000", "target": "62000", "rr": "1:3"}
]
[/COMPARISON_TABLE]
Respostas para analisar: `;

function startAnalysisTimer() {
  analysisStartTime = Date.now();
  document.getElementById('analysisTimer').classList.add('active');
  if (analysisTimerInterval) clearInterval(analysisTimerInterval);
  analysisTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - analysisStartTime) / 1000);
    document.getElementById('analysisTimerValue').textContent = `${elapsed}s`;
  }, 1000);
}

function stopAnalysisTimer() {
  if (analysisTimerInterval) { clearInterval(analysisTimerInterval); analysisTimerInterval = null; }
  document.getElementById('analysisTimer').classList.remove('active');
}

async function startAnalysis() {
  if (isAnalyzing) return;
  const geminiKey = document.getElementById('geminiApiKey').value.trim();
  if (!geminiKey) { showToast('Configure a API Key do Gemini', 'error'); return; }
  if (!checkDailyRequests()) { showToast('Limite diário de requisições atingido. Tente amanhã.', 'error'); return; }
  
  isAnalyzing = true;
  const btn = document.getElementById('analyzeBtn');
  const btnText = document.getElementById('analyzeBtnText');
  btn.disabled = true; btnText.textContent = 'Analisando...';
  
  startAnalysisTimer();
  
  document.getElementById('resultSection').style.display = 'block';
  document.getElementById('visualElements').style.display = 'none';
  document.getElementById('chartContainer').style.display = 'none';
  document.getElementById('analysisTabsContainer').style.display = 'none';
  ['4h','1h','15m','5m'].forEach(tf => { const card = document.getElementById(`tf-${tf}`); card.className = 'tf-card'; document.getElementById(`tf-${tf}-status`).textContent = 'Aguardando'; });
  document.getElementById('resultContent').innerHTML = `<div style="text-align: center; padding: 40px 0;"><div class="spinner" style="width: 28px; height: 28px; margin: 0 auto 14px; border-width: 3px;"></div><div style="font-size: 14px; font-weight: 500;">Analisando ${selectedAsset}...</div></div>`;
  
  let images = [];
  const tfs = ['4h','1h','15m','5m'];
  const chartDate = document.getElementById('chartDate').value;
  chartKlines = {};
  
  try {
    if (uploadedImages.length >= 4) {
      images = uploadedImages.slice(0, 4).map(img => img.data);
      for (let i = 0; i < 4; i++) {
        const card = document.getElementById(`tf-${tfs[i]}`);
        card.classList.add('active');
        document.getElementById(`tf-${tfs[i]}-status`).textContent = 'Processando';
        await sleep(250);
        card.classList.remove('active'); card.classList.add('done');
        document.getElementById(`tf-${tfs[i]}-status`).textContent = 'Concluído';
      }
      const sourceBadge = document.getElementById('sourceBadge');
      if (sourceBadge) sourceBadge.innerHTML = '<span class="method-badge manual">MANUAL</span>';
    } else {
      for (let i = 0; i < tfs.length; i++) {
        const tf = tfs[i];
        const card = document.getElementById(`tf-${tf}`);
        card.classList.add('active');
        document.getElementById(`tf-${tf}-status`).textContent = 'Gerando';
        try {
          const result = await getChartFromBinance(selectedAsset, tf, chartDate);
          images.push(result.chart);
          chartKlines[tf] = result.klines;
          card.classList.remove('active'); card.classList.add('done');
          document.getElementById(`tf-${tf}-status`).textContent = 'Concluído';
        } catch (err) {
          card.classList.remove('active'); card.classList.add('error');
          document.getElementById(`tf-${tf}-status`).textContent = 'Erro';
          showToast(`Erro ${tf.toUpperCase()}: ${err.message}`, 'error');
        }
        await sleep(250);
      }
      const sourceBadge = document.getElementById('sourceBadge');
      if (sourceBadge) sourceBadge.innerHTML = '<span class="method-badge binance">BINANCE</span>';
    }
    
    if (images.length === 0) {
      showToast('Nenhuma imagem disponível', 'error');
      isAnalyzing = false; btn.disabled = false; btnText.textContent = 'Analisar';
      stopAnalysisTimer(); return;
    }
    
    document.getElementById('resultContent').innerHTML = `<div style="text-align: center; padding: 40px 0;"><div class="spinner" style="width: 28px; height: 28px; margin: 0 auto 14px; border-width: 3px;"></div><div style="font-size: 14px; font-weight: 500;">Gerando análise com IA...</div></div>`;
    
    // NOVO: Usa o prompt global personalizado se existir
    let prompt = globalCustomPrompt.trim() || buildPrompt(selectedAsset);
    if (visualTableEnabled) prompt = prompt + VISUAL_TABLE_PROMPT;
    
    lastAnalysisImages = [...images];
    lastAnalysisPrompt = prompt;
    
    const response = await callGemini(geminiKey, prompt, images);
    incrementDailyRequests();
    
    const tableData = parseVisualTable(response);
    const analysisData = {
      id: Date.now().toString(), asset: selectedAsset, date: new Date().toISOString(),
      chartDate: chartDate, direction: tableData?.direction || '—',
      entry: parseFloat(tableData?.entry) || null, stop: parseFloat(tableData?.stop_loss) || null,
      target: parseFloat(tableData?.target) || null, trend: tableData?.trend || '—',
      signal: tableData?.signal || '—', risk: tableData?.risk || '—',
      volume: tableData?.volume || '—', score: tableData?.score || 0,
      confidence: tableData?.confidence || '—', entryType: tableData?.entry_type || '—',
      regime: tableData?.regime || '—', result: 'pending', fullText: response, source: 'site'
    };
    
    analysisGroups.push(analysisData);
    currentAnalysisIndex = analysisGroups.length - 1;
    renderAnalysisTabs();
    displayAnalysisFromGroup(currentAnalysisIndex);
  } catch (error) {
    showToast(`Erro: ${error.message}`, 'error');
    document.getElementById('resultContent').innerHTML = `<div class="empty-state"><div class="empty-state-title" style="color: var(--red);">Erro na análise</div><div class="empty-state-sub">${error.message}</div></div>`;
    if (error.message.toLowerCase().includes('quota exceeded') || error.message.toLowerCase().includes('retry in')) {
      const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
      if (retryMatch) startRateLimitTimer(parseFloat(retryMatch[1]));
      else startRateLimitTimer(60);
    }
  } finally { 
    isAnalyzing = false; btn.disabled = false; btnText.textContent = 'Analisar'; 
    stopAnalysisTimer();
  }
}

async function redoAnalysis() {
  if (analysisGroups.length >= 5) { showToast('⚠️ Limite de 5 análises agrupadas atingido!', 'error'); return; }
  if (lastAnalysisImages.length === 0 || !lastAnalysisPrompt) { showToast('Nenhuma análise anterior para refazer', 'error'); return; }
  const geminiKey = document.getElementById('geminiApiKey').value.trim();
  if (!geminiKey) { showToast('Configure a API Key do Gemini', 'error'); return; }
  if (!checkDailyRequests()) { showToast('Limite diário de requisições atingido. Tente amanhã.', 'error'); return; }
  
  isAnalyzing = true;
  const btn = document.getElementById('analyzeBtn');
  const btnText = document.getElementById('analyzeBtnText');
  btn.disabled = true; btnText.textContent = 'Reanalisando...';
  startAnalysisTimer();
  
  try {
    const response = await callGemini(geminiKey, lastAnalysisPrompt, lastAnalysisImages);
    incrementDailyRequests();
    const tableData = parseVisualTable(response);
    const analysisData = {
      id: Date.now().toString(), asset: selectedAsset, date: new Date().toISOString(),
      chartDate: document.getElementById('chartDate').value, direction: tableData?.direction || '—',
      entry: parseFloat(tableData?.entry) || null, stop: parseFloat(tableData?.stop_loss) || null,
      target: parseFloat(tableData?.target) || null, trend: tableData?.trend || '—',
      signal: tableData?.signal || '—', risk: tableData?.risk || '—',
      volume: tableData?.volume || '—', score: tableData?.score || 0,
      confidence: tableData?.confidence || '—', entryType: tableData?.entry_type || '—',
      regime: tableData?.regime || '—', result: 'pending', fullText: response, source: 'site'
    };
    analysisGroups.push(analysisData);
    currentAnalysisIndex = analysisGroups.length - 1;
    renderAnalysisTabs();
    displayAnalysisFromGroup(currentAnalysisIndex);
  } catch (error) {
    showToast(`Erro: ${error.message}`, 'error');
    if (error.message.toLowerCase().includes('quota exceeded') || error.message.toLowerCase().includes('retry in')) {
      const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
      if (retryMatch) startRateLimitTimer(parseFloat(retryMatch[1]));
      else startRateLimitTimer(60);
    }
  } finally {
    isAnalyzing = false; btn.disabled = false; btnText.textContent = 'Analisar';
    stopAnalysisTimer();
  }
}

function renderAnalysisTabs() {
  const container = document.getElementById('analysisTabsContainer');
  const tabsContainer = document.getElementById('analysisTabs');
  if (analysisGroups.length <= 1) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  tabsContainer.innerHTML = analysisGroups.map((a, idx) => `
    <button class="analysis-tab ${idx === currentAnalysisIndex ? 'active' : ''}" onclick="switchAnalysisTab(${idx})">Análise ${idx + 1}</button>
  `).join('');
}

function switchAnalysisTab(index) { currentAnalysisIndex = index; renderAnalysisTabs(); displayAnalysisFromGroup(index); }
function displayAnalysisFromGroup(index) { const analysis = analysisGroups[index]; if (!analysis) return; if (analysis.fullText) displayResult(analysis.fullText, true); }

function startRateLimitTimer(seconds) {
  rateLimitSeconds = Math.ceil(seconds);
  document.getElementById('rateLimitTimer').classList.add('active');
  document.getElementById('rateLimitValue').textContent = rateLimitSeconds;
  if (rateLimitTimerInterval) clearInterval(rateLimitTimerInterval);
  rateLimitTimerInterval = setInterval(() => {
    rateLimitSeconds--;
    document.getElementById('rateLimitValue').textContent = rateLimitSeconds;
    if (rateLimitSeconds <= 0) {
      clearInterval(rateLimitTimerInterval); rateLimitTimerInterval = null;
      document.getElementById('rateLimitTimer').classList.remove('active');
      showToast('✅ Requisição da API restaurada! Você pode tentar novamente.', 'success');
    }
  }, 1000);
}

function parseVisualTable(text) {
  const match = text.match(/\[PRIME_TABLE\]([\s\S]*?)\[\/PRIME_TABLE\]/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch (e) { return null; }
}

async function fetchGroqTable(userResponse) {
  const groqKey = document.getElementById('groqApiKey').value.trim();
  if (!groqKey) {
    showToast('Configure a API Key do Groq nas configurações', 'error');
    return null;
  }
  
  document.getElementById('groqLoading').classList.add('active');
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "Você é um assistente que extrai dados de trading de textos e retorna APENAS JSON válido dentro das tags [PRIME_TABLE] e [/PRIME_TABLE]. Preços devem ser números com ponto decimal, sem vírgulas ou pontos de milhar." },
          { role: "user", content: COMPARISON_PROMPT + "\n\n" + userResponse }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) throw new Error(`Groq API: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const tableData = parseVisualTable(content);
    if (!tableData) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Não foi possível extrair a tabela da resposta do Groq');
    }
    return tableData;
  } catch (err) {
    showToast(`Erro no Groq: ${err.message}`, 'error');
    return null;
  } finally {
    document.getElementById('groqLoading').classList.remove('active');
  }
}

function applyVisualTable(data, isManual = false) {
  if (!data) return;
  const prefix = isManual ? 'manual' : '';
  const visualElementsId = isManual ? 'manualVisualElements' : 'visualElements';
  const chartContainerId = isManual ? 'manualChartContainer' : 'chartContainer';
  const visualEl = document.getElementById(visualElementsId);
  if (visualEl) visualEl.style.display = 'block';
  
  const trendEl = document.getElementById(`${prefix}InsightTrend`);
  if (trendEl && data.trend) { trendEl.textContent = data.trend; trendEl.style.color = data.trend.toLowerCase() === 'bullish' ? 'var(--green)' : data.trend.toLowerCase() === 'bearish' ? 'var(--red)' : 'var(--orange)'; }
  const signalEl = document.getElementById(`${prefix}InsightSignal`);
  if (signalEl && data.signal) { const s = data.signal.toUpperCase(); signalEl.textContent = s === 'NO TRADE' ? 'HOLD' : s; signalEl.style.color = s === 'LONG' ? 'var(--green)' : s === 'SHORT' ? 'var(--red)' : 'var(--blue)'; }
  const riskEl = document.getElementById(`${prefix}InsightRisk`);
  if (riskEl && data.risk) { riskEl.textContent = data.risk; riskEl.style.color = data.risk.toLowerCase() === 'baixo' ? 'var(--green)' : data.risk.toLowerCase() === 'médio' ? 'var(--orange)' : 'var(--red)'; }
  const volumeEl = document.getElementById(`${prefix}InsightVolume`);
  if (volumeEl && data.volume) { volumeEl.textContent = data.volume; volumeEl.style.color = 'var(--purple)'; }
  
  const entry = parseFloat(data.entry) || null, stop = parseFloat(data.stop_loss) || null, target = parseFloat(data.target) || null;
  const entryEl = document.getElementById(`${prefix}TradeEntry`); if (entryEl && entry) entryEl.textContent = data.entry;
  const stopEl = document.getElementById(`${prefix}TradeStop`); if (stopEl && stop) stopEl.textContent = data.stop_loss;
  const targetEl = document.getElementById(`${prefix}TradeTarget`); if (targetEl && target) targetEl.textContent = data.target;
  
  const dirEl = document.getElementById(`${prefix}StrategyDirection`);
  if (dirEl && data.direction) { dirEl.textContent = data.direction; dirEl.style.color = data.direction === 'LONG' ? 'var(--green)' : data.direction === 'SHORT' ? 'var(--red)' : 'var(--text-secondary)'; }
  const typeEl = document.getElementById(`${prefix}StrategyType`); if (typeEl && data.entry_type) typeEl.textContent = data.entry_type;
  const statusEl = document.getElementById(`${prefix}StrategyStatus`);
  if (statusEl && data.confidence) { statusEl.textContent = data.confidence; statusEl.className = 'strategy-status ' + (data.confidence === 'ALTA' ? 'ideal' : data.confidence === 'MÉDIA' ? 'warning' : 'danger'); }
  const barsEl = document.getElementById(`${prefix}StrategyBars`);
  if (barsEl && data.strategy_bars && Array.isArray(data.strategy_bars)) { barsEl.innerHTML = ''; data.strategy_bars.forEach(v => { const c = Math.max(0, Math.min(100, v)); const cl = c >= 70 ? 'green' : c >= 40 ? 'orange' : 'red'; barsEl.innerHTML += `<div class="strategy-bar"><div class="strategy-bar-fill ${cl}" style="width: ${c}%"></div></div>`; }); }

  if (entry && stop && target) {
    const risk = Math.abs(entry - stop), reward = Math.abs(target - entry);
    const rr = reward / risk; const total = risk + reward;
    const riskPct = (risk / total) * 100, rewardPct = (reward / total) * 100;
    const rrCard = document.getElementById(`${prefix}RrCard`); if (rrCard) rrCard.style.display = 'block';
    const rrBarRisk = document.getElementById(`${prefix}RrBarRisk`); if (rrBarRisk) rrBarRisk.style.width = riskPct + '%';
    const rrBarReward = document.getElementById(`${prefix}RrBarReward`); if (rrBarReward) { rrBarReward.style.left = riskPct + '%'; rrBarReward.style.width = rewardPct + '%'; }
    const rrLabelRisk = document.getElementById(`${prefix}RrLabelRisk`); if (rrLabelRisk) rrLabelRisk.textContent = `Risco: ${risk.toFixed(risk < 1 ? 4 : 2)}`;
    const rrLabelReward = document.getElementById(`${prefix}RrLabelReward`); if (rrLabelReward) rrLabelReward.textContent = `Retorno: ${reward.toFixed(reward < 1 ? 4 : 2)}`;
    const rrRatio = document.getElementById(`${prefix}RrRatio`);
    if (rrRatio) { rrRatio.textContent = `R:R 1:${rr.toFixed(2)}`; rrRatio.style.color = rr >= 2 ? 'var(--green)' : rr >= 1 ? 'var(--orange)' : 'var(--red)'; }
  } else if (data.risk_reward) {
    const rrCard = document.getElementById(`${prefix}RrCard`); if (rrCard) rrCard.style.display = 'block';
    const rrRatio = document.getElementById(`${prefix}RrRatio`); if (rrRatio) rrRatio.textContent = `R:R ${data.risk_reward}`;
  }

  const copyTp = document.getElementById(`${prefix}CopyTp`); if (copyTp && entry) copyTp.textContent = target ? target.toFixed(target < 1 ? 4 : 2) : '—';
  if (stop) { 
    const slDifference = calculateSLDifference(isManual ? manualAsset : selectedAsset, stop);
    const copySlTrigger = document.getElementById(`${prefix}CopySlTrigger`); const copySlLimit = document.getElementById(`${prefix}CopySlLimit`);
    if (copySlTrigger) copySlTrigger.textContent = stop.toFixed(stop < 1 ? 4 : 2);
    if (copySlLimit) copySlLimit.textContent = (stop - slDifference).toFixed(stop < 1 ? 4 : 2);
  }

  const tradeData = { entry, stop, target, direction: data.direction };
  
  if (isManual) {
    manualTradeData = tradeData;
    manualAnalysisDate = data.analysis_date ? parseAnalysisDate(data.analysis_date, data.analysis_time) : null;
    manualAnalysisTimestamp = manualAnalysisDate;
    const chartContainer = document.getElementById(chartContainerId); if (chartContainer) chartContainer.style.display = 'block';
    currentSignalTf = '1h';
    loadTradingViewWidget(manualAsset, '1h', 'manualTvWidgetContainer');
    setTimeout(() => {
      drawSignalCanvasWithRetry(manualChartKlines['1h'], tradeData, '1h', 'manualSignalCanvas', null);
    }, 500);
    switchManualChartView('custom');
  } else {
    currentTradeData = tradeData;
    const chartContainer = document.getElementById(chartContainerId); if (chartContainer) chartContainer.style.display = 'block';
    currentSignalTf = '1h';
    document.querySelectorAll('#signalTfSelector .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === '1h'));
    const signalTfLabel = document.getElementById('signalTfLabel'); if (signalTfLabel) signalTfLabel.textContent = 'Timeframe: 1H';
    loadTradingViewWidget(selectedAsset, '1h');
    setTimeout(() => {
      drawSignalCanvasWithRetry(chartKlines['1h'], tradeData, '1h', 'signalCanvas', null);
    }, 500);
    switchChartView('tv');
  }

  if (!isManual) {
    currentAnalysisData = { id: Date.now().toString(), asset: selectedAsset, date: new Date().toISOString(), chartDate: document.getElementById('chartDate').value, direction: data.direction, entry: entry, stop: stop, target: target, trend: data.trend, signal: data.signal, risk: data.risk, volume: data.volume, score: data.score, confidence: data.confidence, entryType: data.entry_type, regime: data.regime, result: 'pending', source: 'site' };
  }
}

function parseAnalysisDate(dateStr, timeStr) {
  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]); const month = parseInt(parts[1]) - 1; const year = parseInt(parts[2]);
    let hour = 0, minute = 0;
    if (timeStr) { const timeParts = timeStr.split(':'); if (timeParts.length >= 2) { hour = parseInt(timeParts[0]); minute = parseInt(timeParts[1]); } }
    const date = new Date(year, month, day, hour, minute);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  } catch (e) { return null; }
}

function calculateSLDifference(asset, stopPrice) {
  const price = parseFloat(stopPrice);
  if (asset === 'BTCUSDT') return 10; if (asset === 'ETHUSDT') return 2;
  if (asset === 'SOLUSDT' || asset === 'BNBUSDT') return 0.5;
  if (asset === 'XRPUSDT' || asset === 'ADAUSDT') return 0.05;
  if (asset === 'DOGEUSDT') return 0.01; if (asset === 'AVAXUSDT') return 0.2;
  return price * 0.001;
}

function copyToClipboard(elementId, btn) {
  const text = document.getElementById(elementId).textContent;
  if (text === '—') { showToast('Valor não disponível', 'error'); return; }
  navigator.clipboard.writeText(text).then(() => { 
    btn.classList.add('copied'); 
    btn.innerHTML = 'Copiado'; 
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = 'Copiar'; }, 1500); 
  }).catch(() => showToast('Erro ao copiar', 'error'));
}

function openPnLModal() { document.getElementById('pnlModal').classList.add('active'); }
function closePnLModal() { document.getElementById('pnlModal').classList.remove('active'); }

function calculateTrade() {
  if (!currentTradeData && !manualTradeData && !signalTradeData) { showToast('Faça uma análise primeiro', 'error'); return; }
  const tradeData = currentTradeData || manualTradeData || signalTradeData;
  const capital = parseFloat(document.getElementById('capitalInput').value);
  const riskPercent = parseFloat(document.getElementById('riskPercentInput').value);
  const makerFee = parseFloat(document.getElementById('makerFeeInput').value) / 100;
  const takerFee = parseFloat(document.getElementById('takerFeeInput').value) / 100;
  if (!capital || !riskPercent) { showToast('Preencha capital e risco', 'error'); return; }
  const { entry, stop, target, direction } = tradeData;
  if (!entry || !stop || !target) { showToast('Dados do trade incompletos', 'error'); return; }
  const riskAmount = capital * (riskPercent / 100);
  const stopDistance = Math.abs(entry - stop); const stopDistancePercent = stopDistance / entry;
  const positionSize = riskAmount / stopDistancePercent; const leverage = positionSize / capital;
  const entryFee = positionSize * makerFee;
  const exitFeeWin = positionSize * (target / entry) * takerFee;
  const exitFeeLoss = positionSize * (stop / entry) * takerFee;
  const totalFeesWin = entryFee + exitFeeWin; const totalFeesLoss = entryFee + exitFeeLoss;
  const profit = direction === 'LONG' ? (target - entry) : (entry - target);
  const loss = direction === 'LONG' ? (entry - stop) : (stop - entry);
  const profitAmount = (profit / entry) * positionSize; const lossAmount = (loss / entry) * positionSize;
  const netWin = profitAmount - totalFeesWin; const netLoss = lossAmount + totalFeesLoss;
  document.getElementById('calcCapital').textContent = `$${capital.toFixed(2)}`;
  document.getElementById('calcRisk').textContent = `$${riskAmount.toFixed(2)} (${riskPercent}%)`;
  document.getElementById('calcLeverage').textContent = `${leverage.toFixed(1)}x`;
  document.getElementById('calcPosition').textContent = `$${positionSize.toFixed(2)}`;
  document.getElementById('calcEntryFee').textContent = `-$${entryFee.toFixed(4)}`;
  document.getElementById('calcExitFee').textContent = `-$${exitFeeWin.toFixed(4)}`;
  document.getElementById('calcTotalFees').textContent = `-$${totalFeesWin.toFixed(4)}`;
  document.getElementById('calcGrossWin').textContent = `+$${profitAmount.toFixed(4)}`;
  document.getElementById('calcFeesWin').textContent = `-$${totalFeesWin.toFixed(4)}`;
  document.getElementById('calcWin').textContent = `+$${netWin.toFixed(4)}`;
  document.getElementById('calcBalanceWin').textContent = `$${(capital + netWin).toFixed(4)}`;
  document.getElementById('calcGrossLoss').textContent = `-$${lossAmount.toFixed(4)}`;
  document.getElementById('calcFeesLoss').textContent = `-$${totalFeesLoss.toFixed(4)}`;
  document.getElementById('calcLoss').textContent = `-$${netLoss.toFixed(4)}`;
  document.getElementById('calcBalanceLoss').textContent = `$${(capital - netLoss).toFixed(4)}`;
  document.getElementById('calcResult').style.display = 'block';
}

async function saveCurrentAnalysis() {
  if (!currentAnalysisData) { showToast('Nenhuma análise para salvar', 'error'); return; }
  const analyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
  const exists = analyses.find(a => a.id === currentAnalysisData.id);
  if (exists) { showToast('⚠️ Esta análise já foi salva!', 'error'); return; }
  try { await FirebaseService.saveAnalysis(currentAnalysisData); loadSavedAnalyses(); showToast('✅ Análise salva com sucesso!', 'success'); }
  catch (err) { showToast(`Erro ao salvar: ${err.message}`, 'error'); }
}

async function saveManualAnalysis() {
  if (!manualTradeData) { showToast('Processe uma análise primeiro', 'error'); return; }
  const analysisData = { id: Date.now().toString(), asset: manualAsset, date: new Date().toISOString(), chartDate: manualAnalysisDate, direction: manualTradeData.direction, entry: manualTradeData.entry, stop: manualTradeData.stop, target: manualTradeData.target, trend: document.getElementById('manualInsightTrend').textContent, signal: document.getElementById('manualInsightSignal').textContent, risk: document.getElementById('manualInsightRisk').textContent, volume: document.getElementById('manualInsightVolume').textContent, result: 'pending', source: 'external' };
  const analyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
  const exists = analyses.find(a => a.id === analysisData.id);
  if (exists) { showToast('⚠️ Esta análise já foi salva!', 'error'); return; }
  try { await FirebaseService.saveAnalysis(analysisData); loadSavedAnalyses(); showToast('✅ Análise externa salva com sucesso!', 'success'); }
  catch (err) { showToast(`Erro ao salvar: ${err.message}`, 'error'); }
}

function loadSavedAnalyses() {
  savedAnalyses = FirebaseService.getAnalysesLocal();
  const container = document.getElementById('savedAnalysesList');
  if (savedAnalyses.length === 0) { container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><div class="empty-state-title">Nenhuma análise salva</div><div class="empty-state-sub">Faça uma análise e clique em "Salvar Análise"</div></div>`; return; }
  container.innerHTML = savedAnalyses.map(a => {
    let sourceBadge = '';
    if (a.source === 'external') sourceBadge = '<span class="method-badge external">EXTERNA</span>';
    else if (a.source === 'signal') sourceBadge = '<span class="method-badge signal">SINAL MANUAL</span>';
    
    return `
    <div class="saved-analysis-card">
      <div class="saved-analysis-header"><div class="saved-analysis-asset">${a.asset} ${sourceBadge}</div><div class="saved-analysis-date">${new Date(a.date).toLocaleString('pt-BR')}</div></div>
      <div class="saved-analysis-result"><span class="saved-analysis-badge ${a.result || 'pending'}">${a.result === 'win' ? '✅ WIN' : a.result === 'loss' ? '❌ LOSS' : '⏳ Pendente'}</span><span class="saved-analysis-badge" style="background: rgba(10, 132, 255, 0.15); color: var(--blue);">${a.direction || '—'}</span></div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">Entrada: ${a.entry || '—'} | Stop: ${a.stop || '—'} | Alvo: ${a.target || '—'}</div>
      <div class="saved-analysis-actions"><button class="saved-analysis-btn result" onclick="showResultChart('${a.id}')">Resultado</button><button class="saved-analysis-btn verify" onclick="verifySavedAnalysis('${a.id}')">Verificar</button><button class="saved-analysis-btn" onclick="deleteSavedAnalysis('${a.id}')">Excluir</button></div>
    </div>
  `}).join('');
}

function loadSavedSets() {
  savedSets = FirebaseService.getSetsLocal();
  const container = document.getElementById('savedSetsList');
  if (!container) return;
  if (savedSets.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = '<div class="asset-label" style="margin-top: 20px; margin-bottom: 12px;">Conjuntos de Análises</div>' + savedSets.map((s, idx) => `
    <div class="saved-set-card" onclick="openSavedSet(${idx})">
      <div class="saved-analysis-header"><div class="saved-analysis-asset">📦 Conjunto de Análises</div><div class="saved-analysis-date">${s.date}</div></div>
      <div style="font-size: 11px; color: var(--text-secondary);">${s.analyses.length} análises • ${s.asset}</div>
    </div>
  `).join('');
}

window.openSavedSet = function(idx) {
  const set = savedSets[idx];
  if (!set) return;
  switchPage('pageOptimizer', document.querySelector('[data-page="pageOptimizer"]'));
  optimizerItems = set.analyses.map(a => ({ ...a, processed: !!a.response }));
  renderOptimizerList();
  document.getElementById('optSelectedName').textContent = set.asset;
  optAsset = set.asset;
  showToast(`Conjunto carregado: ${set.analyses.length} análises`, 'success');
};

async function showResultChart(id) {
  const analysis = savedAnalyses.find(a => a.id === id);
  if (!analysis) { showToast('Análise não encontrada', 'error'); return; }
  if (!analysis.entry || !analysis.stop || !analysis.target) { showToast('Dados incompletos', 'error'); return; }
  
  showToast('📊 Gerando gráficos de resultado...', 'info');
  
  const modal = document.getElementById('resultModal');
  const title = document.getElementById('resultModalTitle');
  const content = document.getElementById('resultModalContent');
  title.textContent = `📊 Resultado - ${analysis.asset}`;
  content.innerHTML = `
    <div class="progress-container"><div class="progress-bar" id="resultProgressBar" style="width: 0%"></div></div>
    <div class="progress-text" id="resultProgressText">Carregando...</div>
  `;
  modal.classList.add('active');
  
  try {
    const analysisDate = new Date(analysis.chartDate || analysis.date);
    const resultDate = new Date(analysisDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    const tfs = ['4h', '1h', '15m', '5m'];
    const charts = {};
    
    for (let i = 0; i < tfs.length; i++) {
      const tf = tfs[i];
      const result = await getChartFromBinance(analysis.asset, tf, resultDate);
      charts[tf] = result.klines;
      const progress = ((i + 1) / tfs.length) * 100;
      const progressBar = document.getElementById('resultProgressBar');
      const progressText = document.getElementById('resultProgressText');
      if (progressBar) progressBar.style.width = progress + '%';
      if (progressText) progressText.textContent = `Carregando ${tf.toUpperCase()}... ${Math.round(progress)}%`;
    }
    
    content.innerHTML = `
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Gráficos gerados 2 dias após a análise (${resultDate.toLocaleString('pt-BR')})</div>
      <div class="chart-view-toggle" style="margin-bottom: 12px;">
        <button class="chart-view-btn" id="resultViewTV" onclick="switchResultView('tv', '${analysis.asset}', '${resultDate.toISOString()}', '${analysis.chartDate || analysis.date}', ${analysis.entry}, ${analysis.stop}, ${analysis.target})">TradingView</button>
        <button class="chart-view-btn highlight active" id="resultViewCustom" onclick="switchResultView('custom', '${analysis.asset}', '${resultDate.toISOString()}', '${analysis.chartDate || analysis.date}', ${analysis.entry}, ${analysis.stop}, ${analysis.target})">✨ Com Sinais</button>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
        <div class="chart-tf-selector" style="flex: 1; margin-bottom: 0;">
          <button class="chart-tf-btn" data-tf="4h" onclick="switchResultTf('4h', '${analysis.asset}', '${resultDate.toISOString()}', '${analysis.chartDate || analysis.date}', ${analysis.entry}, ${analysis.stop}, ${analysis.target})">4H</button>
          <button class="chart-tf-btn active" data-tf="1h" onclick="switchResultTf('1h', '${analysis.asset}', '${resultDate.toISOString()}', '${analysis.chartDate || analysis.date}', ${analysis.entry}, ${analysis.stop}, ${analysis.target})">1H</button>
          <button class="chart-tf-btn" data-tf="15m" onclick="switchResultTf('15m', '${analysis.asset}', '${resultDate.toISOString()}', '${analysis.chartDate || analysis.date}', ${analysis.entry}, ${analysis.stop}, ${analysis.target})">15M</button>
          <button class="chart-tf-btn" data-tf="5m" onclick="switchResultTf('5m', '${analysis.asset}', '${resultDate.toISOString()}', '${analysis.chartDate || analysis.date}', ${analysis.entry}, ${analysis.stop}, ${analysis.target})">5M</button>
        </div>
        <button class="chart-pnl-btn" onclick="downloadResultChart()" title="Baixar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
        <button class="chart-pnl-btn" onclick="toggleResultDate('${analysis.asset}', '${resultDate.toISOString()}', '${analysis.chartDate || analysis.date}', ${analysis.entry}, ${analysis.stop}, ${analysis.target})" title="Alternar data">⬅️</button>
        <button class="chart-pnl-btn" onclick="verifyResultChart('${analysis.asset}', '${resultDate.toISOString()}', ${analysis.entry}, ${analysis.stop}, ${analysis.target}, '${analysis.direction}', '${id}')">Win/Loss?</button>
      </div>
      <div class="chart-wrapper" id="resultChartWrapper" style="height: 400px;">
        <div id="resultTvWidgetContainer" style="width: 100%; height: 100%;"></div>
        <canvas id="resultSignalCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none;"></canvas>
      </div>
      <div style="font-size: 11px; color: var(--text-tertiary); text-align: center; margin-top: 12px;">Linhas marcadas: Entrada (azul), Stop Loss (vermelho), Alvo (verde)</div>
    `;
    
    window.resultCharts = charts;
    window.resultCurrentTf = '1h';
    window.resultCurrentView = 'custom';
    window.resultSignals = { entry: analysis.entry, stop: analysis.stop, target: analysis.target };
    window.resultAsset = analysis.asset;
    window.resultDateStr = resultDate.toISOString();
    window.resultOriginalDate = analysis.chartDate || analysis.date;
    window.resultShowingOriginal = false;
    window.resultAnalysisId = id;
    window.resultAnalysisTimestamp = analysis.chartDate || analysis.date;
    
    setTimeout(() => {
      switchResultView('custom', analysis.asset, resultDate.toISOString(), analysis.chartDate || analysis.date, analysis.entry, analysis.stop, analysis.target);
    }, 600);
  } catch (err) {
    showToast(`Erro ao gerar gráficos: ${err.message}`, 'error');
  }
}

window.switchResultView = function(view, asset, dateStr, originalDateStr, entry, stop, target) {
  window.resultCurrentView = view;
  const tvBtn = document.getElementById('resultViewTV'); const customBtn = document.getElementById('resultViewCustom');
  if (tvBtn) tvBtn.classList.toggle('active', view === 'tv');
  if (customBtn) customBtn.classList.toggle('active', view === 'custom');
  const tvContainer = document.getElementById('resultTvWidgetContainer');
  const signalCanvas = document.getElementById('resultSignalCanvas');
  if (view === 'tv') {
    tvContainer.style.display = 'block'; signalCanvas.style.display = 'none';
    loadTradingViewWidget(asset, window.resultCurrentTf, 'resultTvWidgetContainer');
  } else {
    tvContainer.style.display = 'none'; signalCanvas.style.display = 'block';
    drawSignalCanvasWithRetry(window.resultCharts[window.resultCurrentTf], { entry, stop, target }, window.resultCurrentTf, 'resultSignalCanvas', null);
    setTimeout(() => {
      drawAnalysisLine(window.resultCharts[window.resultCurrentTf], 'resultSignalCanvas', window.resultAnalysisTimestamp);
    }, 400);
  }
};

window.switchResultTf = function(tf, asset, dateStr, originalDateStr, entry, stop, target) {
  window.resultCurrentTf = tf;
  document.querySelectorAll('#resultModal .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  if (window.resultCurrentView === 'tv') { loadTradingViewWidget(asset, tf, 'resultTvWidgetContainer'); }
  else {
    drawSignalCanvasWithRetry(window.resultCharts[tf], { entry, stop, target }, tf, 'resultSignalCanvas', null);
    setTimeout(() => {
      drawAnalysisLine(window.resultCharts[tf], 'resultSignalCanvas', window.resultAnalysisTimestamp);
    }, 400);
  }
};

window.toggleResultDate = async function(asset, futureDateStr, originalDateStr, entry, stop, target) {
  if (window.resultShowingOriginal) {
    window.resultShowingOriginal = false;
    try {
      const tfs = ['4h', '1h', '15m', '5m'];
      const charts = {};
      const futureDate = new Date(futureDateStr);
      for (const tf of tfs) {
        const result = await getChartFromBinance(asset, tf, futureDate);
        charts[tf] = result.klines;
      }
      window.resultCharts = charts;
      if (window.resultCurrentView === 'tv') {
        loadTradingViewWidget(asset, window.resultCurrentTf, 'resultTvWidgetContainer');
      } else {
        drawSignalCanvasWithRetry(window.resultCharts[window.resultCurrentTf], { entry, stop, target }, window.resultCurrentTf, 'resultSignalCanvas', null);
        setTimeout(() => {
          drawAnalysisLine(window.resultCharts[window.resultCurrentTf], 'resultSignalCanvas', window.resultAnalysisTimestamp);
        }, 400);
      }
      showToast('Gráfico de +2 dias', 'info');
    } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  } else {
    window.resultShowingOriginal = true;
    try {
      const tfs = ['4h', '1h', '15m', '5m'];
      const charts = {};
      const origDate = new Date(originalDateStr);
      for (const tf of tfs) {
        const result = await getChartFromBinance(asset, tf, origDate);
        charts[tf] = result.klines;
      }
      window.resultCharts = charts;
      if (window.resultCurrentView === 'tv') {
        loadTradingViewWidget(asset, window.resultCurrentTf, 'resultTvWidgetContainer');
      } else {
        drawSignalCanvasWithRetry(window.resultCharts[window.resultCurrentTf], { entry, stop, target }, window.resultCurrentTf, 'resultSignalCanvas', null);
        setTimeout(() => {
          drawAnalysisLine(window.resultCharts[window.resultCurrentTf], 'resultSignalCanvas', window.resultAnalysisTimestamp);
        }, 400);
      }
      showToast('Gráfico da análise original', 'info');
    } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  }
};

window.downloadResultChart = function() {
  const canvas = document.getElementById('resultSignalCanvas');
  if (!canvas) { showToast('Canvas não encontrado', 'error'); return; }
  const link = document.createElement('a');
  link.download = `${window.resultAsset}_${window.resultCurrentTf}_resultado.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.9);
  link.click();
  showToast('Gráfico baixado!', 'success');
};

window.verifyResultChart = async function(asset, dateStr, entry, stop, target, direction, analysisId) {
  showToast('Verificando resultado...', 'info');
  try {
    const result = await getChartFromBinance(asset, '15m', dateStr);
    const klines = result.klines;
    
    const analysisTime = new Date(window.resultOriginalDate).getTime();
    let startIdx = 0;
    let minDiff = Infinity;
    klines.forEach((c, i) => {
      const diff = Math.abs(c[0] - analysisTime);
      if (diff < minDiff) { minDiff = diff; startIdx = i; }
    });

    let hitTarget = false, hitStop = false, hitTargetIdx = -1, hitStopIdx = -1;
    
    for (let i = startIdx; i < klines.length; i++) {
      const high = parseFloat(klines[i][2]);
      const low = parseFloat(klines[i][3]);
      
      if (direction === 'LONG') {
        if (high >= target) { hitTarget = true; hitTargetIdx = i; break; }
        if (low <= stop) { hitStop = true; hitStopIdx = i; break; }
      } else {
        if (low <= target) { hitTarget = true; hitTargetIdx = i; break; }
        if (high >= stop) { hitStop = true; hitStopIdx = i; break; }
      }
    }
    
    let resultStatus = 'pending';
    if (hitTarget && !hitStop) resultStatus = 'win';
    else if (hitStop && !hitTarget) resultStatus = 'loss';
    else if (hitTarget && hitStop) {
      resultStatus = (hitTargetIdx < hitStopIdx) ? 'win' : 'loss';
    }
    
    if (analysisId) { await FirebaseService.updateAnalysis(analysisId, { result: resultStatus, verified: true }); loadSavedAnalyses(); }
    
    if (resultStatus === 'win') showToast('✅ WIN! Alvo atingido primeiro!', 'success');
    else if (resultStatus === 'loss') showToast('❌ LOSS! Stop atingido primeiro!', 'error');
    else showToast('⏳ Resultado inconclusivo no período analisado', 'info');
    
  } catch (err) { showToast(`Erro na verificação: ${err.message}`, 'error'); }
};

function closeResultModal() { document.getElementById('resultModal').classList.remove('active'); }

async function verifySavedAnalysis(id) {
  const analysis = savedAnalyses.find(a => a.id === id);
  if (!analysis) { showToast('Análise não encontrada', 'error'); return; }
  if (!analysis.entry || !analysis.stop || !analysis.target) { showToast('Dados incompletos', 'error'); return; }
  showToast('🔍 Verificando análise...', 'info');
  try {
    const analysisDate = new Date(analysis.chartDate || analysis.date);
    const verifyDate = new Date(analysisDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    const result = await getChartFromBinance(analysis.asset, '15m', verifyDate);
    const klines = result.klines;
    
    let startIdx = 0;
    const analysisTime = new Date(analysis.chartDate || analysis.date).getTime();
    let minDiff = Infinity;
    klines.forEach((c, i) => {
      const diff = Math.abs(c[0] - analysisTime);
      if (diff < minDiff) { minDiff = diff; startIdx = i; }
    });

    let result_status = 'pending';
    let hitTarget = false, hitStop = false;
    
    for (let i = startIdx; i < klines.length; i++) {
      const high = parseFloat(klines[i][2]); const low = parseFloat(klines[i][3]);
      if (analysis.direction === 'LONG') { 
        if (high >= analysis.target) { hitTarget = true; break; } 
        if (low <= analysis.stop) { hitStop = true; break; } 
      } else if (analysis.direction === 'SHORT') { 
        if (low <= analysis.target) { hitTarget = true; break; } 
        if (high >= analysis.stop) { hitStop = true; break; } 
      }
    }
    
    if (hitTarget && !hitStop) result_status = 'win';
    else if (hitStop && !hitTarget) result_status = 'loss';
    else if (hitTarget && hitStop) result_status = 'loss';
    
    await FirebaseService.updateAnalysis(id, { result: result_status, verified: true, verifyDate: verifyDate.toISOString() });
    loadSavedAnalyses();
    if (result_status === 'win') showToast('✅ Análise verificada: WIN!', 'success');
    else if (result_status === 'loss') showToast('❌ Análise verificada: LOSS', 'error');
    else showToast('⏳ Resultado ainda não definido', 'info');
  } catch (err) { showToast(`Erro na verificação: ${err.message}`, 'error'); }
}

function deleteSavedAnalysis(id) {
  if (!confirm('Tem certeza que deseja excluir esta análise?')) return;
  const analyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
  const filtered = analyses.filter(a => a.id !== id);
  localStorage.setItem('savedAnalyses', JSON.stringify(filtered));
  loadSavedAnalyses();
  showToast('Análise excluída', 'success');
}

function loadNotes() { const notes = FirebaseService.getNotesLocal(); document.getElementById('notesArea').value = notes; }
function saveNotes() { const notes = document.getElementById('notesArea').value; FirebaseService.saveNotesLocal(notes); showToast('📝 Notas salvas!', 'success'); }

function buildPrompt(asset) {
  return `COMITÊ INSTITUCIONAL — ${asset}\nSISTEMA DE ANÁLISE MULTI-TIMEFRAME + EXECUÇÃO ADAPTATIVA\n\nVocê é um analista profissional especializado em ${asset}, Price Action, SMC, ICT, Liquidity, Market Structure, Volume, Order Flow e análise multi-timeframe.\n\nVocê receberá 4 screenshots: 1. 4H  2. 1H  3. 15M  4. 5M\nSeu objetivo é encontrar a MELHOR OPORTUNIDADE OPERACIONAL DISPONÍVEL.\nDecida: A) ENTRADA IMEDIATA  B) ENTRADA EM PULLBACK  C) ENTRADA APÓS CONFIRMAÇÃO  D) NO TRADE\n\n========================================================\nREGRA MAIS IMPORTANTE — NÃO PERDER MOVIMENTOS POR ESPERAR\n========================================================\n${asset.replace('USDT','')} frequentemente realiza: LIQUIDITY SWEEP → DISPLACEMENT → BOS/CHoCH → CONTINUAÇÃO sem retornar ao FVG/OB.\nNUNCA assuma que o preço fará reteste.\n\n========================================================\nETAPA 0 — LEITURA DAS IMAGENS\n========================================================\nIdentifique: timeframe, preço atual, estrutura, máximas/mínimas, suportes/resistências, liquidez, OBs, FVGs, volume.\nNÃO invente informações.\n\n========================================================\nETAPA 1-4 — ANÁLISE MULTI-TIMEFRAME\n========================================================\n4H: Bullish/Bearish/Lateral/Transição. VIÉS 4H: LONG/SHORT/NEUTRO\n1H: ALINHADO/PARCIALMENTE ALINHADO/CONTRÁRIO\n15M: SETUP DE LONG/SHORT/NENHUM\n5M: Microestrutura, confirmação, momentum\n\n========================================================\nETAPA 5-9 — LIQUIDEZ, PA, SMC, VOLUME, REGIME\n========================================================\nMapeie liquidez, analise PA, OBs, FVGs, volume, regime.\n\n========================================================\nETAPA 10-11 — DECISÃO\n========================================================\nSe sweep + displacement + BOS + momentum → ENTRADA IMEDIATA.\nNUNCA escreva "Esperar reteste" apenas porque existe FVG/OB.\n\n========================================================\nFORMATO FINAL\n========================================================\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n${asset} — DECISÃO FINAL\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nVIÉS 4H: [LONG/SHORT/NEUTRO]\nVIÉS 1H: [LONG/SHORT/NEUTRO]\nVIÉS 15M: [LONG/SHORT/NEUTRO]\nVIÉS 5M: [LONG/SHORT/NEUTRO]\nREGIME: [TENDÊNCIA/RANGE/TRANSIÇÃO]\nQUALIDADE DO SETUP: [X/10]\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 OPERAÇÃO PRINCIPAL\n━━━━━━━━━━━━━━━━━━━━━━━━\nDIREÇÃO: [LONG/SHORT/NO TRADE]\nTIPO DE ENTRADA: [IMEDIATA/PULLBACK/CONFIRMAÇÃO]\nENTRADA PRINCIPAL: [preço]\nSTOP LOSS: [preço]\nTP1: [preço]\nTP2: [preço]\nR:R TP1: [X]\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚡ ENTRADA IMEDIATA VS PULLBACK\n━━━━━━━━━━━━━━━━━━━━━━━━\nENTRADA IMEDIATA: [preço] — VANTAGEM: [explicação]\nPULLBACK: [preço] — VANTAGEM: [explicação]\nESCOLHA: [IMEDIATA/PULLBACK/CONFIRMAÇÃO]\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n🧠 TESE / ❌ INVALIDAÇÃO / ⚠️ RISCO /  ALTERNATIVO\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n📌 VEREDITO\n━━━━━━━━━━━━━━━━━━━━━━━━\n[LONG/SHORT/NO TRADE]\nENTRADA: [X]  STOP: [X]  ALVO: [X]\nTIPO: [IMEDIATA/PULLBACK/CONFIRMAÇÃO]\nCONFIANÇA: [BAIXA/MÉDIA/ALTA]\nRESUMO: [1-3 frases]\n\nREGRAS: Não force operação. Não force pullback. Não presuma retorno a FVG/OB. Movimento forte = entrada imediata. Preço esticado = pullback. Sem confirmação = aguarde.`;
}

async function callGemini(apiKey, prompt, images) {
  const model = document.getElementById('geminiModel').value.trim() || 'gemini-3.6-flash';
  const parts = [{ text: prompt }];
  images.forEach(img => {
    let base64Data, mimeType;
    if (img.startsWith('data:')) { const match = img.match(/^data:(image\/\w+);base64,(.+)$/); if (match) { mimeType = match[1]; base64Data = match[2]; } }
    else { base64Data = img; mimeType = 'image/png'; }
    if (base64Data) parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
  });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 8192 } })
  });
  if (!response.ok) {
    const errText = await response.text(); let errMsg = `Gemini API: ${response.status}`;
    try { const j = JSON.parse(errText); if (j.error?.message) errMsg = j.error.message; } catch(e) {}
    if (errMsg.toLowerCase().includes('no longer available') || errMsg.toLowerCase().includes('not found')) {
      showToast('Modelo indisponível, tentando gemini-3.6-flash...', 'error');
      const fb = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 8192 } }) });
      if (fb.ok) { const d = await fb.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'; }
    }
    throw new Error(errMsg);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
}

function displayResult(text, skipScroll = false) {
  const now = new Date();
  const resultTime = document.getElementById('resultTime'); if (resultTime) resultTime.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const tableData = parseVisualTable(text);
  if (tableData && visualTableEnabled) { applyVisualTable(tableData, false); text = text.replace(/\[PRIME_TABLE\][\s\S]*?\[\/PRIME_TABLE\]/, '').trim(); }
  else { const visualEl = document.getElementById('visualElements'); if (visualEl) visualEl.style.display = 'block'; extractVisualsFromText(text); }
  let formatted = text.replace(/━━━━━━━━━━━━━━━━━━━━━━━━/g, '\n━━━━━━━━━━━━━━━━━━━━━━━━\n').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\[LONG\]/gi, '<span style="color: var(--green); font-weight: 700;">LONG</span>').replace(/\[SHORT\]/gi, '<span style="color: var(--red); font-weight: 700;">SHORT</span>').replace(/\[NO TRADE\]/gi, '<span style="color: var(--orange); font-weight: 700;">NO TRADE</span>');
  const resultContent = document.getElementById('resultContent'); if (resultContent) resultContent.innerHTML = `<div style="white-space: pre-wrap; word-wrap: break-word; line-height: 1.7;">${formatted}</div>`;
  if (!skipScroll) document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function extractVisualsFromText(text) {
  const trendMatch = text.match(/VIÉS\s+4H:\s*\*?\[?(LONG|SHORT|NEUTRO|BULLISH|BEARISH)/i);
  const signalMatch = text.match(/DIREÇÃO:\s*\*?\[?(LONG|SHORT|NO TRADE)/i);
  const riskMatch = text.match(/RISCO.*?DE\s+PERDER.*?:\s*\*?\[?(BAIXO|MÉDIO|ALTO)/i);
  const trendEl = document.getElementById('insightTrend');
  if (trendMatch && trendEl) { const t = trendMatch[1].toUpperCase(); trendEl.textContent = (t === 'LONG' || t === 'BULLISH') ? 'Bullish' : (t === 'SHORT' || t === 'BEARISH') ? 'Bearish' : 'Neutro'; trendEl.style.color = (t === 'LONG' || t === 'BULLISH') ? 'var(--green)' : (t === 'SHORT' || t === 'BEARISH') ? 'var(--red)' : 'var(--orange)'; }
  const signalEl = document.getElementById('insightSignal');
  if (signalMatch && signalEl) { const s = signalMatch[1].toUpperCase(); signalEl.textContent = s === 'NO TRADE' ? 'Hold' : s; signalEl.style.color = s === 'LONG' ? 'var(--green)' : s === 'SHORT' ? 'var(--red)' : 'var(--blue)'; }
  const riskEl = document.getElementById('insightRisk');
  if (riskMatch && riskEl) { const r = riskMatch[1].toUpperCase(); riskEl.textContent = r; riskEl.style.color = r === 'BAIXO' ? 'var(--green)' : r === 'MÉDIO' ? 'var(--orange)' : 'var(--red)'; }
}

async function generatePrints() {
  if (isGenerating) return;
  const btn = document.getElementById('generateBtn');
  const btnText = document.getElementById('generateBtnText');
  const loading = document.getElementById('chartLoading');
  const loadingText = document.getElementById('chartLoadingText');
  
  btn.disabled = true; btnText.textContent = 'Gerando...'; isGenerating = true; generatedPrints = {};
  const printDate = document.getElementById('printDate').value;
  const tfs = ['4h','1h','15m','5m'];
  const grid = document.getElementById('printPreviewGrid'); grid.innerHTML = '';
  
  loading.classList.add('active');
  
  try {
    for (let i = 0; i < tfs.length; i++) {
      const tf = tfs[i];
      loadingText.textContent = `Gerando gráfico ${tf.toUpperCase()}...`;
      await new Promise(r => setTimeout(r, 100));
      
      const result = await getChartFromBinance(printAsset, tf, printDate);
      generatedPrints[tf] = result.chart;
      const dateObj = printDate ? new Date(printDate) : new Date();
      const dateStr = dateObj.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const timeStr = dateObj.toTimeString().slice(0, 5).replace(':', '-');
      const filename = `${printAsset}_${dateStr}_${timeStr}_${tf.toUpperCase()}.jpg`;
      grid.innerHTML += `<div class="print-preview"><img src="${result.chart}" alt="${tf}"><div class="print-preview-label">${tf.toUpperCase()}</div><button class="print-preview-download" onclick="downloadPrint('${tf}', '${filename}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button></div>`;
    }
    document.getElementById('downloadZipBtn').style.display = 'flex';
    document.getElementById('downloadAllBtn').style.display = 'flex';
    loadingText.textContent = 'Concluído!';
    setTimeout(() => loading.classList.remove('active'), 500);
    showToast('Gráficos gerados com sucesso!', 'success');
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
    loading.classList.remove('active');
  } finally {
    isGenerating = false; btn.disabled = false; btnText.textContent = 'Gerar 4 Timeframes';
  }
}

function downloadPrint(tf, filename) { if (!generatedPrints[tf]) return; const link = document.createElement('a'); link.href = generatedPrints[tf]; link.download = filename; link.click(); }

async function downloadAllSequential() {
  showToast('Baixando gráficos em ordem...', 'info');
  const tfs = ['4h', '1h', '15m', '5m'];
  const dateObj = document.getElementById('printDate').value ? new Date(document.getElementById('printDate').value) : new Date();
  const dateStr = dateObj.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const timeStr = dateObj.toTimeString().slice(0, 5).replace(':', '-');
  
  for (const tf of tfs) {
    if (generatedPrints[tf]) {
      const filename = `${printAsset}_${dateStr}_${timeStr}_${tf.toUpperCase()}.jpg`;
      downloadPrint(tf, filename);
      await sleep(500);
    }
  }
  showToast('✅ Todos os gráficos baixados em ordem!', 'success');
}

async function downloadAllZip() {
  if (Object.keys(generatedPrints).length === 0) return;
  const zip = new JSZip();
  const dateObj = document.getElementById('printDate').value ? new Date(document.getElementById('printDate').value) : new Date();
  const dateStr = dateObj.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const timeStr = dateObj.toTimeString().slice(0, 5).replace(':', '-');
  Object.entries(generatedPrints).forEach(([tf, data]) => { const base64 = data.split(',')[1]; zip.file(`${printAsset}_${dateStr}_${timeStr}_${tf.toUpperCase()}.jpg`, base64, { base64: true }); });
  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${printAsset}_${dateStr}_${timeStr}_ALL.zip`; link.click(); URL.revokeObjectURL(link.href);
  showToast('ZIP baixado!', 'success');
}

// NOVO: Copiar prompt com adição automática do prompt da tabela
function copyCurrentPrompt() {
  let prompt = globalCustomPrompt.trim() || buildPrompt(selectedAsset);
  if (visualTableEnabled) prompt = prompt + VISUAL_TABLE_PROMPT;
  navigator.clipboard.writeText(prompt).then(() => { showToast('📋 Prompt copiado!', 'success'); }).catch(() => showToast('Erro ao copiar', 'error'));
}

function copyTablePrompt() {
  navigator.clipboard.writeText(VISUAL_TABLE_PROMPT).then(() => { showToast('Prompt da tabela copiado!', 'success'); }).catch(() => showToast('Erro ao copiar', 'error'));
}

function copyFullPrompt() {
  let prompt = globalCustomPrompt.trim() || buildPrompt(manualAsset);
  if (visualTableEnabled) prompt = prompt + VISUAL_TABLE_PROMPT;
  navigator.clipboard.writeText(prompt).then(() => { showToast('Prompt completo copiado!', 'success'); }).catch(() => showToast('Erro ao copiar', 'error'));
}

async function processManualAnalysis() {
  const response = document.getElementById('manualResponse').value.trim();
  if (!response) { showToast('Cole a resposta da IA primeiro', 'error'); return; }
  
  let tableData = parseVisualTable(response);
  
  if (!tableData) {
    showToast('Tabela não encontrada. Tentando extrair com Groq AI...', 'info');
    tableData = await fetchGroqTable(response);
    if (!tableData) {
      showToast('Não foi possível extrair a tabela. Verifique a resposta ou configure a API do Groq.', 'error');
      return;
    }
    showToast('✅ Tabela extraída com sucesso pelo Groq!', 'success');
  }
  
  startAnalysisTimer();
  
  try {
    const analysisDate = tableData.analysis_date ? parseAnalysisDate(tableData.analysis_date, tableData.analysis_time) : null;
    if (analysisDate) {
      const tfs = ['4h', '1h', '15m', '5m'];
      for (const tf of tfs) { const result = await getChartFromBinance(manualAsset, tf, analysisDate); manualChartKlines[tf] = result.klines; }
    }
    applyVisualTable(tableData, true);
    document.getElementById('manualResultSection').style.display = 'block';
    document.getElementById('manualDateChanger').style.display = 'block';
    
    if (manualAnalyses.length === 0) {
      manualAnalyses.push({ tableData, klines: { ...manualChartKlines }, analysisDate, response, analysisTimestamp: manualAnalysisTimestamp });
      currentManualAnalysisIndex = 0;
      updateFloatingButton();
    }
    
    setTimeout(() => { document.getElementById('manualResultSection').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
  } catch (err) { showToast(`Erro ao processar: ${err.message}`, 'error'); }
  finally { stopAnalysisTimer(); }
}

async function pasteAndProcess() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('manualResponse').value = text;
    showToast('Colado da área de transferência!', 'success');
    startAnalysisTimer();
    setTimeout(() => processManualAnalysis(), 300);
  } catch (err) { showToast('Erro ao colar. Use Ctrl+V manualmente.', 'error'); }
}

function clearManualResponse() { document.getElementById('manualResponse').value = ''; showToast('Caixa de texto limpa!', 'success'); }

function applyManualDateCorrection() {
  const newDate = document.getElementById('manualCorrectDate').value;
  if (!newDate) { showToast('Selecione uma data e hora', 'error'); return; }
  
  manualAnalysisDate = newDate;
  manualAnalysisTimestamp = newDate;
  
  const tfs = ['4h', '1h', '15m', '5m'];
  let loadedCount = 0;
  showToast('Atualizando gráficos...', 'info');
  
  tfs.forEach(async (tf) => {
    try {
      const result = await getChartFromBinance(manualAsset, tf, newDate);
      manualChartKlines[tf] = result.klines;
      loadedCount++;
      if (loadedCount === 4) {
        drawSignalCanvasWithRetry(manualChartKlines['1h'], manualTradeData, '1h', 'manualSignalCanvas', null);
        showToast('✅ Data atualizada com sucesso!', 'success');
      }
    } catch (err) {
      showToast(`Erro ao carregar ${tf}: ${err.message}`, 'error');
    }
  });
  
  if (manualAnalyses[currentManualAnalysisIndex]) {
    manualAnalyses[currentManualAnalysisIndex].analysisDate = newDate;
    manualAnalyses[currentManualAnalysisIndex].analysisTimestamp = newDate;
    manualAnalyses[currentManualAnalysisIndex].klines = { ...manualChartKlines };
  }
}

async function showManualResultChart() {
  if (!manualTradeData) { showToast('Processe uma análise primeiro', 'error'); return; }
  if (!manualAnalysisDate) { showToast('Data da análise não disponível.', 'error'); return; }
  
  showToast('Gerando gráficos de resultado...', 'info');
  
  const modal = document.getElementById('resultModal');
  const title = document.getElementById('resultModalTitle');
  const content = document.getElementById('resultModalContent');
  title.textContent = `📊 Resultado - ${manualAsset}`;
  content.innerHTML = `
    <div class="progress-container"><div class="progress-bar" id="resultProgressBar" style="width: 0%"></div></div>
    <div class="progress-text" id="resultProgressText">Carregando...</div>
  `;
  modal.classList.add('active');
  
  try {
    const analysisDate = new Date(manualAnalysisDate);
    const resultDate = new Date(analysisDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    const tfs = ['4h', '1h', '15m', '5m'];
    const charts = {};
    
    for (let i = 0; i < tfs.length; i++) {
      const tf = tfs[i];
      const result = await getChartFromBinance(manualAsset, tf, resultDate);
      charts[tf] = result.klines;
      const progress = ((i + 1) / tfs.length) * 100;
      const progressBar = document.getElementById('resultProgressBar');
      const progressText = document.getElementById('resultProgressText');
      if (progressBar) progressBar.style.width = progress + '%';
      if (progressText) progressText.textContent = `Carregando ${tf.toUpperCase()}... ${Math.round(progress)}%`;
    }
    
    content.innerHTML = `
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Gráficos gerados 2 dias após a análise (${resultDate.toLocaleString('pt-BR')})</div>
      <div class="chart-view-toggle" style="margin-bottom: 12px;">
        <button class="chart-view-btn" id="manualResultViewTV" onclick="switchManualResultView('tv', '${manualAsset}', '${resultDate.toISOString()}', '${manualAnalysisDate}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target})">TradingView</button>
        <button class="chart-view-btn highlight active" id="manualResultViewCustom" onclick="switchManualResultView('custom', '${manualAsset}', '${resultDate.toISOString()}', '${manualAnalysisDate}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target})">✨ Com Sinais</button>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
        <div class="chart-tf-selector" style="flex: 1; margin-bottom: 0;">
          <button class="chart-tf-btn" data-tf="4h" onclick="switchManualResultTf('4h', '${manualAsset}', '${resultDate.toISOString()}', '${manualAnalysisDate}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target})">4H</button>
          <button class="chart-tf-btn active" data-tf="1h" onclick="switchManualResultTf('1h', '${manualAsset}', '${resultDate.toISOString()}', '${manualAnalysisDate}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target})">1H</button>
          <button class="chart-tf-btn" data-tf="15m" onclick="switchManualResultTf('15m', '${manualAsset}', '${resultDate.toISOString()}', '${manualAnalysisDate}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target})">15M</button>
          <button class="chart-tf-btn" data-tf="5m" onclick="switchManualResultTf('5m', '${manualAsset}', '${resultDate.toISOString()}', '${manualAnalysisDate}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target})">5M</button>
        </div>
        <button class="chart-pnl-btn" onclick="downloadManualResultChart()" title="Baixar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
        <button class="chart-pnl-btn" onclick="toggleManualResultDate('${manualAsset}', '${resultDate.toISOString()}', '${manualAnalysisDate}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target})" title="Alternar data">⬅️</button>
        <button class="chart-pnl-btn" onclick="verifyManualResultChart('${manualAsset}', '${resultDate.toISOString()}', ${manualTradeData.entry}, ${manualTradeData.stop}, ${manualTradeData.target}, '${manualTradeData.direction}')">Win/Loss?</button>
      </div>
      <div class="chart-wrapper" id="manualResultChartWrapper" style="height: 400px;">
        <div id="manualResultTvWidgetContainer" style="width: 100%; height: 100%;"></div>
        <canvas id="manualResultSignalCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none;"></canvas>
      </div>
      <div style="font-size: 11px; color: var(--text-tertiary); text-align: center; margin-top: 12px;">Linhas marcadas: Entrada (azul), Stop Loss (vermelho), Alvo (verde)</div>
    `;
    modal.classList.add('active');
    
    window.manualResultCharts = charts;
    window.manualResultCurrentTf = '1h';
    window.manualResultCurrentView = 'custom';
    window.manualResultSignals = { entry: manualTradeData.entry, stop: manualTradeData.stop, target: manualTradeData.target };
    window.manualResultAsset = manualAsset;
    window.manualResultDateStr = resultDate.toISOString();
    window.manualResultOriginalDate = manualAnalysisDate;
    window.manualResultShowingOriginal = false;
    window.manualResultAnalysisTimestamp = manualAnalysisDate;
    
    setTimeout(() => {
      switchManualResultView('custom', manualAsset, resultDate.toISOString(), manualAnalysisDate, manualTradeData.entry, manualTradeData.stop, manualTradeData.target);
    }, 600);
  } catch (err) { showToast(`Erro ao gerar gráficos: ${err.message}`, 'error'); }
}

window.switchManualResultView = function(view, asset, dateStr, originalDateStr, entry, stop, target) {
  window.manualResultCurrentView = view;
  const tvBtn = document.getElementById('manualResultViewTV'); const customBtn = document.getElementById('manualResultViewCustom');
  if (tvBtn) tvBtn.classList.toggle('active', view === 'tv');
  if (customBtn) customBtn.classList.toggle('active', view === 'custom');
  const tvContainer = document.getElementById('manualResultTvWidgetContainer');
  const signalCanvas = document.getElementById('manualResultSignalCanvas');
  if (view === 'tv') { 
    tvContainer.style.display = 'block'; signalCanvas.style.display = 'none'; 
    loadTradingViewWidget(asset, window.manualResultCurrentTf, 'manualResultTvWidgetContainer'); 
  }
  else { 
    tvContainer.style.display = 'none'; signalCanvas.style.display = 'block'; 
    drawSignalCanvasWithRetry(window.manualResultCharts[window.manualResultCurrentTf], { entry, stop, target }, window.manualResultCurrentTf, 'manualResultSignalCanvas', null);
    setTimeout(() => {
      drawAnalysisLine(window.manualResultCharts[window.manualResultCurrentTf], 'manualResultSignalCanvas', window.manualResultAnalysisTimestamp);
    }, 400);
  }
};

window.switchManualResultTf = function(tf, asset, dateStr, originalDateStr, entry, stop, target) {
  window.manualResultCurrentTf = tf;
  document.querySelectorAll('#resultModal .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  if (window.manualResultCurrentView === 'tv') { loadTradingViewWidget(asset, tf, 'manualResultTvWidgetContainer'); }
  else {
    drawSignalCanvasWithRetry(window.manualResultCharts[tf], { entry, stop, target }, tf, 'manualResultSignalCanvas', null);
    setTimeout(() => {
      drawAnalysisLine(window.manualResultCharts[tf], 'manualResultSignalCanvas', window.manualResultAnalysisTimestamp);
    }, 400);
  }
};

window.toggleManualResultDate = async function(asset, futureDateStr, originalDateStr, entry, stop, target) {
  if (window.manualResultShowingOriginal) {
    window.manualResultShowingOriginal = false;
    try {
      const tfs = ['4h', '1h', '15m', '5m'];
      const charts = {};
      const futureDate = new Date(futureDateStr);
      for (const tf of tfs) {
        const result = await getChartFromBinance(asset, tf, futureDate);
        charts[tf] = result.klines;
      }
      window.manualResultCharts = charts;
      if (window.manualResultCurrentView === 'tv') {
        loadTradingViewWidget(asset, window.manualResultCurrentTf, 'manualResultTvWidgetContainer');
      } else {
        drawSignalCanvasWithRetry(window.manualResultCharts[window.manualResultCurrentTf], { entry, stop, target }, window.manualResultCurrentTf, 'manualResultSignalCanvas', null);
        setTimeout(() => {
          drawAnalysisLine(window.manualResultCharts[window.manualResultCurrentTf], 'manualResultSignalCanvas', window.manualResultAnalysisTimestamp);
        }, 400);
      }
      showToast('Gráfico de +2 dias', 'info');
    } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  } else {
    window.manualResultShowingOriginal = true;
    try {
      const tfs = ['4h', '1h', '15m', '5m'];
      const charts = {};
      const origDate = new Date(originalDateStr);
      for (const tf of tfs) {
        const result = await getChartFromBinance(asset, tf, origDate);
        charts[tf] = result.klines;
      }
      window.manualResultCharts = charts;
      if (window.manualResultCurrentView === 'tv') {
        loadTradingViewWidget(asset, window.manualResultCurrentTf, 'manualResultTvWidgetContainer');
      } else {
        drawSignalCanvasWithRetry(window.manualResultCharts[window.manualResultCurrentTf], { entry, stop, target }, window.manualResultCurrentTf, 'manualResultSignalCanvas', null);
        setTimeout(() => {
          drawAnalysisLine(window.manualResultCharts[window.manualResultCurrentTf], 'manualResultSignalCanvas', window.manualResultAnalysisTimestamp);
        }, 400);
      }
      showToast('Gráfico da análise original', 'info');
    } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  }
};

window.downloadManualResultChart = function() {
  const canvas = document.getElementById('manualResultSignalCanvas');
  if (!canvas) { showToast('Canvas não encontrado', 'error'); return; }
  const link = document.createElement('a');
  link.download = `${window.manualResultAsset}_${window.manualResultCurrentTf}_resultado.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.9);
  link.click();
  showToast('Gráfico baixado!', 'success');
};

window.verifyManualResultChart = async function(asset, dateStr, entry, stop, target, direction) {
  showToast('🔍 Verificando resultado...', 'info');
  try {
    const result = await getChartFromBinance(asset, '15m', dateStr);
    const klines = result.klines;
    
    let startIdx = 0;
    const analysisTime = new Date(window.manualResultOriginalDate).getTime();
    let minDiff = Infinity;
    klines.forEach((c, i) => {
      const diff = Math.abs(c[0] - analysisTime);
      if (diff < minDiff) { minDiff = diff; startIdx = i; }
    });

    let hitTarget = false, hitStop = false, hitTargetIdx = -1, hitStopIdx = -1;
    
    for (let i = startIdx; i < klines.length; i++) {
      const high = parseFloat(klines[i][2]);
      const low = parseFloat(klines[i][3]);
      if (direction === 'LONG') {
        if (high >= target) { hitTarget = true; hitTargetIdx = i; break; }
        if (low <= stop) { hitStop = true; hitStopIdx = i; break; }
      } else {
        if (low <= target) { hitTarget = true; hitTargetIdx = i; break; }
        if (high >= stop) { hitStop = true; hitStopIdx = i; break; }
      }
    }
    
    let resultStatus = 'pending';
    if (hitTarget && !hitStop) resultStatus = 'win';
    else if (hitStop && !hitTarget) resultStatus = 'loss';
    else if (hitTarget && hitStop) {
      resultStatus = (hitTargetIdx < hitStopIdx) ? 'win' : 'loss';
    }
    
    if (resultStatus === 'win') showToast('✅ WIN! Alvo atingido primeiro!', 'success');
    else if (resultStatus === 'loss') showToast('❌ LOSS! Stop atingido primeiro!', 'error');
    else showToast('⏳ Resultado inconclusivo no período analisado', 'info');
  } catch (err) { showToast(`Erro na verificação: ${err.message}`, 'error'); }
};

function checkDailyRequests() {
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const resetHour = 4;
  const today = brasiliaTime.toDateString();
  const lastReset = localStorage.getItem('lastResetDate');
  if (lastReset !== today || (brasiliaTime.getHours() >= resetHour && lastReset !== today)) { dailyRequests = 0; localStorage.setItem('lastResetDate', today); localStorage.setItem('dailyRequests', '0'); }
  else { dailyRequests = parseInt(localStorage.getItem('dailyRequests') || '0'); }
  return dailyRequests < 20;
}

function incrementDailyRequests() { dailyRequests++; localStorage.setItem('dailyRequests', dailyRequests.toString()); updateRequestsCounter(); }

function updateRequestsCounter() {
  const counter = document.getElementById('requestsCounter');
  if (counter) { counter.textContent = `${dailyRequests}/20`; counter.style.color = dailyRequests >= 18 ? 'var(--red)' : dailyRequests >= 15 ? 'var(--orange)' : 'var(--green)'; }
}

function openAddAnalysisPopup() { document.getElementById('addAnalysisPopup').classList.add('active'); }
function closeAddAnalysisPopup() { document.getElementById('addAnalysisPopup').classList.remove('active'); document.getElementById('popupResponse').value = ''; }

async function pasteInPopup() {
  try { const text = await navigator.clipboard.readText(); document.getElementById('popupResponse').value = text; showToast('Colado!', 'success'); }
  catch (err) { showToast('Erro ao colar', 'error'); }
}

async function processPopupAnalysis() {
  const response = document.getElementById('popupResponse').value.trim();
  if (!response) { showToast('Cole a resposta da IA primeiro', 'error'); return; }
  
  let tableData = parseVisualTable(response);
  if (!tableData) {
    showToast('Tabela não encontrada. Tentando extrair com Groq AI...', 'info');
    tableData = await fetchGroqTable(response);
    if (!tableData) {
      showToast('Não foi possível extrair a tabela.', 'error');
      return;
    }
  }
  
  if (manualAnalyses.length >= 10) { showToast('Limite de 10 análises atingido!', 'error'); return; }
  
  startAnalysisTimer();
  
  try {
    const analysisDate = tableData.analysis_date ? parseAnalysisDate(tableData.analysis_date, tableData.analysis_time) : null;
    if (analysisDate) {
      const tfs = ['4h', '1h', '15m', '5m'];
      const newKlines = {};
      for (const tf of tfs) { const result = await getChartFromBinance(manualAsset, tf, analysisDate); newKlines[tf] = result.klines; }
      const analysis = { tableData, klines: newKlines, analysisDate, response, analysisTimestamp: analysisDate };
      manualAnalyses.push(analysis);
      currentManualAnalysisIndex = manualAnalyses.length - 1;
      manualChartKlines = newKlines;
      applyVisualTable(tableData, true);
      document.getElementById('manualResultSection').style.display = 'block';
      updateFloatingButton();
      closeAddAnalysisPopup();
      showToast(`✅ Análise ${manualAnalyses.length} adicionada!`, 'success');
      setTimeout(() => { document.getElementById('manualResultSection').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
    }
  } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  finally { stopAnalysisTimer(); }
}

function updateFloatingButton() {
  const btn = document.getElementById('floatingAnalysisBtn');
  if (manualAnalyses.length > 1) { btn.classList.add('visible'); btn.textContent = currentManualAnalysisIndex + 1; }
  else if (manualAnalyses.length === 1) { btn.classList.add('visible'); btn.textContent = '1'; }
  else { btn.classList.remove('visible'); }
}

function toggleFloatingAnalysis() {
  if (manualAnalyses.length === 0) return;
  currentManualAnalysisIndex = (currentManualAnalysisIndex + 1) % manualAnalyses.length;
  const analysis = manualAnalyses[currentManualAnalysisIndex];
  manualChartKlines = analysis.klines;
  manualTradeData = { entry: parseFloat(analysis.tableData.entry) || null, stop: parseFloat(analysis.tableData.stop_loss) || null, target: parseFloat(analysis.tableData.target) || null, direction: analysis.tableData.direction };
  manualAnalysisDate = analysis.analysisDate;
  manualAnalysisTimestamp = analysis.analysisTimestamp || analysis.analysisDate;
  applyVisualTable(analysis.tableData, true);
  updateFloatingButton();
  showToast(`Análise ${currentManualAnalysisIndex + 1} de ${manualAnalyses.length}`, 'info');
}

function closeAllAnalyses() {
  if (!confirm('Fechar todas as análises e limpar tudo?')) return;
  manualAnalyses = []; currentManualAnalysisIndex = 0;
  manualTradeData = null; manualAnalysisDate = null; manualAnalysisTimestamp = null;
  manualChartKlines = {};
  document.getElementById('manualResponse').value = '';
  document.getElementById('manualResultSection').style.display = 'none';
  document.getElementById('manualDateChanger').style.display = 'none';
  updateFloatingButton();
  showToast('Todas as análises fechadas!', 'success');
}

// NOVO: Juntar Respostas com Win/Loss All
function joinResponses() {
  if (manualAnalyses.length === 0) { showToast('Nenhuma análise para comparar', 'error'); return; }
  
  let tableHtml = '<table class="comparison-table"><tr><th>Análise</th><th>Direção</th><th>Entrada</th><th>Stop</th><th>Alvo</th><th>R:R</th><th>Resultado</th></tr>';
  let longestStop = 0, shortestTarget = Infinity;
  let longestStopIdx = -1, shortestTargetIdx = -1;
  let currentPrice = null;
  
  manualAnalyses.forEach((a, idx) => {
    const entry = parseFloat(a.tableData.entry) || 0; const stop = parseFloat(a.tableData.stop_loss) || 0;
    const target = parseFloat(a.tableData.target) || 0; const direction = a.tableData.direction || '—';
    const risk = Math.abs(entry - stop); const reward = Math.abs(target - entry);
    const rr = risk > 0 ? (reward / risk).toFixed(2) : '—';
    if (risk > longestStop) { longestStop = risk; longestStopIdx = idx; }
    if (reward < shortestTarget && reward > 0) { shortestTarget = reward; shortestTargetIdx = idx; }
    if (!currentPrice && entry > 0) currentPrice = entry;
    
    const resultBadge = a.result === 'win' ? '<span style="color: var(--green);">✅ WIN</span>' : 
                        a.result === 'loss' ? '<span style="color: var(--red);">❌ LOSS</span>' : 
                        '<span style="color: var(--text-tertiary);">—</span>';
    
    tableHtml += `<tr><td>${idx + 1}</td><td>${direction}</td><td>${entry}</td><td>${stop}</td><td>${target}</td><td>1:${rr}</td><td id="joinResult_${idx}">${resultBadge}</td></tr>`;
  });
  tableHtml += '</table>';
  
  let summaryHtml = '<div class="comparison-summary">';
  summaryHtml += `<strong>Stop mais longo:</strong> Análise ${longestStopIdx + 1} (${longestStop.toFixed(2)})<br>`;
  summaryHtml += `<strong>Alvo mais curto:</strong> Análise ${shortestTargetIdx + 1} (${shortestTarget.toFixed(2)})<br>`;
  if (currentPrice && longestStop > 0 && shortestTarget > 0) {
    const rr = (shortestTarget / longestStop).toFixed(2);
    summaryHtml += `<br><strong>R:R conservador (entrada imediata):</strong> 1:${rr}<br>`;
    summaryHtml += `<strong>Entrada imediata:</strong> ${currentPrice}<br>`;
    summaryHtml += `<strong>Stop (mais longo):</strong> ${currentPrice - longestStop}<br>`;
    summaryHtml += `<strong>Alvo (mais curto):</strong> ${currentPrice + shortestTarget}`;
  }
  summaryHtml += '</div>';
  
  // NOVO: Botão Win/Loss? All
  const winLossBtn = `<button class="btn-primary" onclick="verifyAllJoinResponses()" style="margin-top: 12px; background: var(--blue); color: white;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3v18h18"></path><path d="M7 12l4-4 4 4 5-5"></path></svg>
    Win/Loss? All
  </button>`;
  
  document.getElementById('joinResponsesContent').innerHTML = tableHtml + summaryHtml + winLossBtn;
  document.getElementById('joinResponsesModal').classList.add('active');
}

// NOVO: Verificar todas as análises do Join Responses
async function verifyAllJoinResponses() {
  const spinner = document.getElementById('joinResponsesSpinner');
  const spinnerText = document.getElementById('joinResponsesSpinnerText');
  spinner.classList.add('active');
  
  for (let i = 0; i < manualAnalyses.length; i++) {
    const a = manualAnalyses[i];
    const entry = parseFloat(a.tableData.entry);
    const stop = parseFloat(a.tableData.stop_loss);
    const target = parseFloat(a.tableData.target);
    const direction = a.tableData.direction;
    const analysisDate = a.analysisDate;
    
    if (!entry || !stop || !target || !direction || !analysisDate) continue;
    
    spinnerText.textContent = `Verificando análise ${i + 1}/${manualAnalyses.length}...`;
    
    try {
      const resultDate = new Date(new Date(analysisDate).getTime() + 2 * 24 * 60 * 60 * 1000);
      const result = await getChartFromBinance(manualAsset, '15m', resultDate);
      const klines = result.klines;
      
      let startIdx = 0;
      const analysisTime = new Date(analysisDate).getTime();
      let minDiff = Infinity;
      klines.forEach((c, idx) => {
        const diff = Math.abs(c[0] - analysisTime);
        if (diff < minDiff) { minDiff = diff; startIdx = idx; }
      });

      let hitTarget = false, hitStop = false;
      for (let idx = startIdx; idx < klines.length; idx++) {
        const high = parseFloat(klines[idx][2]);
        const low = parseFloat(klines[idx][3]);
        if (direction === 'LONG') {
          if (high >= target) { hitTarget = true; break; }
          if (low <= stop) { hitStop = true; break; }
        } else {
          if (low <= target) { hitTarget = true; break; }
          if (high >= stop) { hitStop = true; break; }
        }
      }
      
      let resultStatus = 'pending';
      if (hitTarget && !hitStop) resultStatus = 'win';
      else if (hitStop && !hitTarget) resultStatus = 'loss';
      else if (hitTarget && hitStop) resultStatus = 'loss';
      
      manualAnalyses[i].result = resultStatus;
      
      const cell = document.getElementById(`joinResult_${i}`);
      if (cell) {
        if (resultStatus === 'win') cell.innerHTML = '<span style="color: var(--green);">✅ WIN</span>';
        else if (resultStatus === 'loss') cell.innerHTML = '<span style="color: var(--red);">❌ LOSS</span>';
        else cell.innerHTML = '<span style="color: var(--text-tertiary);">⏳</span>';
      }
      
      await sleep(200);
    } catch (err) {
      console.error(`Erro ao verificar análise ${i + 1}:`, err);
    }
  }
  
  spinner.classList.remove('active');
  showToast('✅ Verificação concluída!', 'success');
}

function closeJoinResponses() { 
  document.getElementById('joinResponsesModal').classList.remove('active');
  document.getElementById('joinResponsesSpinner').classList.remove('active');
}

// ============================================================
// SINAL MANUAL
// ============================================================
function setSignalDirection(dir) {
  document.getElementById('signalDirLong').style.background = dir === 'LONG' ? 'rgba(48, 209, 88, 0.2)' : 'transparent';
  document.getElementById('signalDirLong').style.borderColor = dir === 'LONG' ? 'var(--green)' : 'var(--card-border)';
  document.getElementById('signalDirShort').style.background = dir === 'SHORT' ? 'rgba(255, 69, 58, 0.2)' : 'transparent';
  document.getElementById('signalDirShort').style.borderColor = dir === 'SHORT' ? 'var(--red)' : 'var(--card-border)';
  window.currentSignalDirection = dir;
}

async function generateManualSignal() {
  const date = document.getElementById('signalDate').value;
  const entry = parseFloat(document.getElementById('signalEntry').value);
  const stop = parseFloat(document.getElementById('signalStop').value);
  const target = parseFloat(document.getElementById('signalTarget').value);
  const direction = window.currentSignalDirection;
  
  if (!date || !entry || !stop || !target || !direction) {
    showToast('Preencha todos os campos (Data, Direção, Entrada, Stop e Alvo)', 'error');
    return;
  }
  
  showToast('Gerando gráficos com sinais...', 'info');
  const loading = document.getElementById('chartLoading');
  const loadingText = document.getElementById('chartLoadingText');
  loading.classList.add('active');
  
  try {
    const tfs = ['4h', '1h', '15m', '5m'];
    const charts = {};
    for (let i = 0; i < tfs.length; i++) {
      const tf = tfs[i];
      loadingText.textContent = `Gerando ${tf.toUpperCase()}...`;
      const result = await getChartFromBinance(signalAsset, tf, date);
      charts[tf] = result.klines;
    }
    
    signalCharts = charts;
    signalTradeData = { entry, stop, target, direction };
    signalAnalysisDate = date;
    signalCurrentTf = '1h';
    signalShowingOriginal = true;
    
    document.getElementById('signalTradeEntry').textContent = entry;
    document.getElementById('signalTradeStop').textContent = stop;
    document.getElementById('signalTradeTarget').textContent = target;
    
    document.getElementById('signalResultSection').style.display = 'block';
    switchSignalView('custom');
    
    signalAnalyses.push({
      id: Date.now().toString(),
      asset: signalAsset,
      date: date,
      direction, entry, stop, target,
      source: 'signal'
    });
    currentSignalAnalysisIndex = signalAnalyses.length - 1;
    updateFloatingSignalButton();
    
    loading.classList.remove('active');
    showToast('✅ Sinal gerado com sucesso!', 'success');
  } catch (err) {
    loading.classList.remove('active');
    showToast(`Erro: ${err.message}`, 'error');
  }
}

function switchSignalView(view) {
  signalCurrentView = view;
  document.getElementById('signalViewTV').classList.toggle('active', view === 'tv');
  document.getElementById('signalViewCustom').classList.toggle('active', view === 'custom');
  const tvContainer = document.getElementById('signalTvWidgetContainer');
  const signalCanvas = document.getElementById('signalManualCanvas');
  
  if (view === 'tv') {
    tvContainer.style.display = 'block'; signalCanvas.style.display = 'none';
    loadTradingViewWidget(signalAsset, signalCurrentTf, 'signalTvWidgetContainer');
  } else {
    tvContainer.style.display = 'none'; signalCanvas.style.display = 'block';
    drawSignalCanvasWithRetry(signalCharts[signalCurrentTf], signalTradeData, signalCurrentTf, 'signalManualCanvas', null);
  }
}

function switchSignalTfResult(tf) {
  signalCurrentTf = tf;
  document.querySelectorAll('#signalChartWrapper .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  document.getElementById('signalTfLabelResult').textContent = `Timeframe: ${tf.toUpperCase()}`;
  
  if (signalCurrentView === 'tv') {
    loadTradingViewWidget(signalAsset, tf, 'signalTvWidgetContainer');
  } else {
    drawSignalCanvasWithRetry(signalCharts[tf], signalTradeData, tf, 'signalManualCanvas', null);
  }
}

async function showSignalResultChart() {
  if (!signalTradeData || !signalAnalysisDate) return;
  showToast('Gerando gráfico de resultado (+2 dias)...', 'info');
  
  try {
    const analysisDate = new Date(signalAnalysisDate);
    const resultDate = new Date(analysisDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    const tfs = ['4h', '1h', '15m', '5m'];
    for (const tf of tfs) {
      const result = await getChartFromBinance(signalAsset, tf, resultDate);
      signalCharts[tf] = result.klines;
    }
    
    signalShowingOriginal = false;
    switchSignalView('custom');
    showToast('✅ Gráfico de +2 dias carregado!', 'success');
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  }
}

async function saveManualSignal() {
  if (!signalTradeData) return;
  const analysisData = { 
    id: Date.now().toString(), 
    asset: signalAsset, 
    date: new Date().toISOString(), 
    chartDate: signalAnalysisDate, 
    direction: signalTradeData.direction, 
    entry: signalTradeData.entry, 
    stop: signalTradeData.stop, 
    target: signalTradeData.target, 
    result: 'pending', 
    source: 'signal' 
  };
  
  try { 
    await FirebaseService.saveAnalysis(analysisData); 
    loadSavedAnalyses(); 
    showToast('✅ Sinal Manual salvo com sucesso!', 'success'); 
  } catch (err) { 
    showToast(`Erro ao salvar: ${err.message}`, 'error'); 
  }
}

function addManualSignal() { 
  document.getElementById('addSignalPopup').classList.add('active'); 
  document.getElementById('popupSignalDate').value = signalAnalysisDate || '';
}
function closeAddSignalPopup() { document.getElementById('addSignalPopup').classList.remove('active'); }

function setPopupSignalDirection(dir) {
  document.getElementById('popupSignalLong').style.borderColor = dir === 'LONG' ? 'var(--green)' : 'var(--card-border)';
  document.getElementById('popupSignalLong').style.color = dir === 'LONG' ? 'var(--green)' : 'var(--text-primary)';
  document.getElementById('popupSignalShort').style.borderColor = dir === 'SHORT' ? 'var(--red)' : 'var(--card-border)';
  document.getElementById('popupSignalShort').style.color = dir === 'SHORT' ? 'var(--red)' : 'var(--text-primary)';
  window.popupSignalDirection = dir;
}

async function processPopupSignal() {
  const date = document.getElementById('popupSignalDate').value;
  const entry = parseFloat(document.getElementById('popupSignalEntry').value);
  const stop = parseFloat(document.getElementById('popupSignalStop').value);
  const target = parseFloat(document.getElementById('popupSignalTarget').value);
  const direction = window.popupSignalDirection;
  
  if (!date || !entry || !stop || !target || !direction) {
    showToast('Preencha todos os campos', 'error');
    return;
  }
  
  signalAnalyses.push({
    id: Date.now().toString(),
    asset: signalAsset,
    date: date,
    direction, entry, stop, target,
    source: 'signal'
  });
  
  signalAnalysisDate = date;
  signalTradeData = { entry, stop, target, direction };
  
  const tfs = ['4h', '1h', '15m', '5m'];
  for (const tf of tfs) {
    const result = await getChartFromBinance(signalAsset, tf, date);
    signalCharts[tf] = result.klines;
  }
  
  currentSignalAnalysisIndex = signalAnalyses.length - 1;
  updateFloatingSignalButton();
  switchSignalView('custom');
  closeAddSignalPopup();
  showToast('✅ Novo sinal adicionado!', 'success');
}

function updateFloatingSignalButton() {
  const btn = document.getElementById('floatingSignalBtn');
  if (signalAnalyses.length > 1) { 
    btn.classList.add('visible'); 
    btn.textContent = currentSignalAnalysisIndex + 1; 
  } else if (signalAnalyses.length === 1) { 
    btn.classList.add('visible'); 
    btn.textContent = '1'; 
  } else { 
    btn.classList.remove('visible'); 
  }
}

function toggleFloatingSignal() {
  if (signalAnalyses.length === 0) return;
  currentSignalAnalysisIndex = (currentSignalAnalysisIndex + 1) % signalAnalyses.length;
  const analysis = signalAnalyses[currentSignalAnalysisIndex];
  
  signalAnalysisDate = analysis.date;
  signalTradeData = { entry: analysis.entry, stop: analysis.stop, target: analysis.target, direction: analysis.direction };
  
  document.getElementById('signalDate').value = analysis.date;
  document.getElementById('signalEntry').value = analysis.entry;
  document.getElementById('signalStop').value = analysis.stop;
  document.getElementById('signalTarget').value = analysis.target;
  setSignalDirection(analysis.direction);
  
  const tfs = ['4h', '1h', '15m', '5m'];
  tfs.forEach(async (tf) => {
    const result = await getChartFromBinance(signalAsset, tf, analysis.date);
    signalCharts[tf] = result.klines;
  });
  
  updateFloatingSignalButton();
  switchSignalView('custom');
  showToast(`Sinal ${currentSignalAnalysisIndex + 1} de ${signalAnalyses.length}`, 'info');
}

function closeAllSignalAnalyses() {
  if (!confirm('Fechar todos os sinais manuais?')) return;
  signalAnalyses = [];
  currentSignalAnalysisIndex = 0;
  signalTradeData = null;
  signalAnalysisDate = null;
  signalCharts = {};
  document.getElementById('signalResultSection').style.display = 'none';
  document.getElementById('signalDate').value = '';
  document.getElementById('signalEntry').value = '';
  document.getElementById('signalStop').value = '';
  document.getElementById('signalTarget').value = '';
  updateFloatingSignalButton();
  showToast('Sinais fechados!', 'success');
}

function copyComparisonPrompt() {
  navigator.clipboard.writeText(COMPARISON_PROMPT).then(() => {
    showToast('Prompt de comparação copiado! Cole no ChatGPT junto com as respostas.', 'success');
  });
}

// NOVO: Colar Tabela de Comparação e processar automaticamente
async function pasteComparisonTable() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('comparisonResponse').value = text;
    showToast('Tabela colada! Processando...', 'success');
    setTimeout(() => processComparison(), 300);
  } catch (err) {
    showToast('Erro ao colar. Use Ctrl+V manualmente.', 'error');
  }
}

// CORREÇÃO: Processar Comparação agora carrega gráficos e mostra botão flutuante
async function processComparison() {
  const response = document.getElementById('comparisonResponse').value.trim();
  if (!response) { showToast('Cole a resposta da IA primeiro', 'error'); return; }
  
  showToast('Processando comparação...', 'info');
  const loading = document.getElementById('chartLoading');
  const loadingText = document.getElementById('chartLoadingText');
  loading.classList.add('active');
  
  try {
    const match = response.match(/\[COMPARISON_TABLE\]([\s\S]*?)\[\/COMPARISON_TABLE\]/);
    let data = [];
    if (match) {
      data = JSON.parse(match[1].trim());
    } else {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      else throw new Error('Formato de tabela não encontrado');
    }
    
    if (data.length === 0) throw new Error('Nenhuma análise encontrada na tabela');
    
    // Limpa análises anteriores de sinal
    signalAnalyses = [];
    
    // Converte para o formato de signalAnalyses
    const today = new Date().toISOString().slice(0, 16);
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      signalAnalyses.push({
        id: Date.now().toString() + i,
        asset: signalAsset,
        date: today,
        direction: item.direction,
        entry: parseFloat(item.entry),
        stop: parseFloat(item.stop),
        target: parseFloat(item.target),
        source: 'signal'
      });
    }
    
    // Carrega a primeira análise
    currentSignalAnalysisIndex = 0;
    const first = signalAnalyses[0];
    signalAnalysisDate = first.date;
    signalTradeData = { entry: first.entry, stop: first.stop, target: first.target, direction: first.direction };
    
    // CORREÇÃO: Carrega os gráficos para TODAS as análises
    loadingText.textContent = `Carregando gráficos... 0/${data.length}`;
    
    for (let i = 0; i < signalAnalyses.length; i++) {
      const analysis = signalAnalyses[i];
      loadingText.textContent = `Carregando gráficos... ${i + 1}/${data.length}`;
      
      const tfs = ['4h', '1h', '15m', '5m'];
      const charts = {};
      for (const tf of tfs) {
        const result = await getChartFromBinance(signalAsset, tf, analysis.date);
        charts[tf] = result.klines;
      }
      analysis.klines = charts;
      
      await sleep(100);
    }
    
    // Carrega os gráficos da análise atual no signalCharts
    signalCharts = signalAnalyses[0].klines;
    
    document.getElementById('signalResultSection').style.display = 'block';
    document.getElementById('signalDate').value = signalAnalysisDate;
    document.getElementById('signalEntry').value = signalTradeData.entry;
    document.getElementById('signalStop').value = signalTradeData.stop;
    document.getElementById('signalTarget').value = signalTradeData.target;
    setSignalDirection(signalTradeData.direction);
    
    updateFloatingSignalButton();
    switchSignalView('custom');
    
    loading.classList.remove('active');
    showToast(`✅ ${data.length} análises importadas com sucesso!`, 'success');
  } catch (err) {
    loading.classList.remove('active');
    showToast(`Erro ao processar: ${err.message}`, 'error');
  }
}

// CORREÇÃO: toggleFloatingSignal agora usa os klines já carregados
function toggleFloatingSignal() {
  if (signalAnalyses.length === 0) return;
  currentSignalAnalysisIndex = (currentSignalAnalysisIndex + 1) % signalAnalyses.length;
  const analysis = signalAnalyses[currentSignalAnalysisIndex];
  
  signalAnalysisDate = analysis.date;
  signalTradeData = { entry: analysis.entry, stop: analysis.stop, target: analysis.target, direction: analysis.direction };
  
  document.getElementById('signalDate').value = analysis.date;
  document.getElementById('signalEntry').value = analysis.entry;
  document.getElementById('signalStop').value = analysis.stop;
  document.getElementById('signalTarget').value = analysis.target;
  setSignalDirection(analysis.direction);
  
  // Usa os klines já carregados
  if (analysis.klines) {
    signalCharts = analysis.klines;
  }
  
  updateFloatingSignalButton();
  switchSignalView('custom');
  showToast(`Sinal ${currentSignalAnalysisIndex + 1} de ${signalAnalyses.length}`, 'info');
}

// NOVO: Juntar Análises (Sinal Manual) com Win/Loss All
function joinSignalAnalyses() {
  if (signalAnalyses.length === 0) { showToast('Nenhuma análise para comparar', 'error'); return; }
  
  let tableHtml = '<table class="comparison-table"><tr><th>Análise</th><th>Direção</th><th>Entrada</th><th>Stop</th><th>Alvo</th><th>R:R</th><th>Resultado</th></tr>';
  let longestStop = 0, shortestTarget = Infinity;
  let longestStopIdx = -1, shortestTargetIdx = -1;
  let currentPrice = null;
  
  signalAnalyses.forEach((a, idx) => {
    const entry = a.entry || 0; const stop = a.stop || 0;
    const target = a.target || 0; const direction = a.direction || '—';
    const risk = Math.abs(entry - stop); const reward = Math.abs(target - entry);
    const rr = risk > 0 ? (reward / risk).toFixed(2) : '—';
    if (risk > longestStop) { longestStop = risk; longestStopIdx = idx; }
    if (reward < shortestTarget && reward > 0) { shortestTarget = reward; shortestTargetIdx = idx; }
    if (!currentPrice && entry > 0) currentPrice = entry;
    
    const resultBadge = a.result === 'win' ? '<span style="color: var(--green);">✅ WIN</span>' : 
                        a.result === 'loss' ? '<span style="color: var(--red);">❌ LOSS</span>' : 
                        '<span style="color: var(--text-tertiary);">—</span>';
    
    tableHtml += `<tr><td>${idx + 1}</td><td>${direction}</td><td>${entry}</td><td>${stop}</td><td>${target}</td><td>1:${rr}</td><td id="signalJoinResult_${idx}">${resultBadge}</td></tr>`;
  });
  tableHtml += '</table>';
  
  let summaryHtml = '<div class="comparison-summary">';
  summaryHtml += `<strong>Stop mais longo:</strong> Análise ${longestStopIdx + 1} (${longestStop.toFixed(2)})<br>`;
  summaryHtml += `<strong>Alvo mais curto:</strong> Análise ${shortestTargetIdx + 1} (${shortestTarget.toFixed(2)})<br>`;
  if (currentPrice && longestStop > 0 && shortestTarget > 0) {
    const rr = (shortestTarget / longestStop).toFixed(2);
    summaryHtml += `<br><strong>R:R conservador (entrada imediata):</strong> 1:${rr}<br>`;
    summaryHtml += `<strong>Entrada imediata:</strong> ${currentPrice}<br>`;
    summaryHtml += `<strong>Stop (mais longo):</strong> ${currentPrice - longestStop}<br>`;
    summaryHtml += `<strong>Alvo (mais curto):</strong> ${currentPrice + shortestTarget}`;
  }
  summaryHtml += '</div>';
  
  const winLossBtn = `<button class="btn-primary" onclick="verifyAllSignalJoinAnalyses()" style="margin-top: 12px; background: var(--blue); color: white;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3v18h18"></path><path d="M7 12l4-4 4 4 5-5"></path></svg>
    Win/Loss? All
  </button>`;
  
  document.getElementById('joinResponsesContent').innerHTML = tableHtml + summaryHtml + winLossBtn;
  document.getElementById('joinResponsesModal').classList.add('active');
}

// NOVO: Verificar todas as análises do Join Signal Analyses
async function verifyAllSignalJoinAnalyses() {
  const spinner = document.getElementById('joinResponsesSpinner');
  const spinnerText = document.getElementById('joinResponsesSpinnerText');
  spinner.classList.add('active');
  
  for (let i = 0; i < signalAnalyses.length; i++) {
    const a = signalAnalyses[i];
    const entry = a.entry;
    const stop = a.stop;
    const target = a.target;
    const direction = a.direction;
    const analysisDate = a.date;
    
    if (!entry || !stop || !target || !direction || !analysisDate) continue;
    
    spinnerText.textContent = `Verificando análise ${i + 1}/${signalAnalyses.length}...`;
    
    try {
      const resultDate = new Date(new Date(analysisDate).getTime() + 2 * 24 * 60 * 60 * 1000);
      const result = await getChartFromBinance(signalAsset, '15m', resultDate);
      const klines = result.klines;
      
      let startIdx = 0;
      const analysisTime = new Date(analysisDate).getTime();
      let minDiff = Infinity;
      klines.forEach((c, idx) => {
        const diff = Math.abs(c[0] - analysisTime);
        if (diff < minDiff) { minDiff = diff; startIdx = idx; }
      });

      let hitTarget = false, hitStop = false;
      for (let idx = startIdx; idx < klines.length; idx++) {
        const high = parseFloat(klines[idx][2]);
        const low = parseFloat(klines[idx][3]);
        if (direction === 'LONG') {
          if (high >= target) { hitTarget = true; break; }
          if (low <= stop) { hitStop = true; break; }
        } else {
          if (low <= target) { hitTarget = true; break; }
          if (high >= stop) { hitStop = true; break; }
        }
      }
      
      let resultStatus = 'pending';
      if (hitTarget && !hitStop) resultStatus = 'win';
      else if (hitStop && !hitTarget) resultStatus = 'loss';
      else if (hitTarget && hitStop) resultStatus = 'loss';
      
      signalAnalyses[i].result = resultStatus;
      
      const cell = document.getElementById(`signalJoinResult_${i}`);
      if (cell) {
        if (resultStatus === 'win') cell.innerHTML = '<span style="color: var(--green);">✅ WIN</span>';
        else if (resultStatus === 'loss') cell.innerHTML = '<span style="color: var(--red);">❌ LOSS</span>';
        else cell.innerHTML = '<span style="color: var(--text-tertiary);">⏳</span>';
      }
      
      await sleep(200);
    } catch (err) {
      console.error(`Erro ao verificar análise ${i + 1}:`, err);
    }
  }
  
  spinner.classList.remove('active');
  showToast('✅ Verificação concluída!', 'success');
}

// ============================================================
// OTIMIZADOR DE PROMPT
// ============================================================
async function startOptimizerGeneration() {
  if (optimizerIsGenerating) return;
  const startDate = document.getElementById('optStartDate').value;
  const endDate = document.getElementById('optEndDate').value;
  if (!startDate || !endDate) { showToast('Selecione data de início e fim', 'error'); return; }
  
  optimizerIsGenerating = true;
  optimizerCharts = [];
  optimizerItems = [];
  document.getElementById('optGenerateBtn').disabled = true;
  document.getElementById('optProgressContainer').style.display = 'block';
  document.getElementById('optDownloadBtn').style.display = 'none';
  document.getElementById('optPromptSection').style.display = 'none';
  
  const loading = document.getElementById('chartLoading');
  const loadingText = document.getElementById('chartLoadingText');
  loading.classList.add('active');
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59);
  
  const times = [6, 12, 21];
  const totalTasks = [];
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      for (const hour of times) {
        totalTasks.push({ date: new Date(current), hour });
      }
    }
    current.setDate(current.getDate() + 1);
  }
  
  const total = totalTasks.length;
  let completed = 0;
  
  for (const task of totalTasks) {
    const dateStr = `${String(task.date.getDate()).padStart(2, '0')}/${task.hour}h`;
    const label = `${String(task.date.getDate()).padStart(2, '0')}/${task.hour}`;
    
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 400; labelCanvas.height = 400;
    const lctx = labelCanvas.getContext('2d');
    lctx.fillStyle = '#000000';
    lctx.fillRect(0, 0, 400, 400);
    lctx.fillStyle = '#ffffff';
    lctx.font = 'bold 80px Inter, sans-serif';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    lctx.fillText(label, 200, 200);
    const labelImage = labelCanvas.toDataURL('image/jpeg', 0.9);
    optimizerCharts.push({ type: 'label', label: dateStr, data: labelImage, date: task.date, hour: task.hour });
    completed++;
    updateOptimizerProgress(completed, total * 5);
    loadingText.textContent = `Gerando gráficos... ${Math.round((completed / (total * 5)) * 100)}%`;
    
    const brasiliaTime = new Date(task.date);
    brasiliaTime.setHours(task.hour, 0, 0, 0);
    
    const tfs = ['4h', '1h', '15m', '5m'];
    for (const tf of tfs) {
      try {
        const result = await getChartFromBinance(optAsset, tf, brasiliaTime);
        optimizerCharts.push({ type: 'chart', label: `${dateStr} ${tf.toUpperCase()}`, data: result.chart, date: task.date, hour: task.hour, tf });
      } catch (err) { console.error(`Erro ao gerar ${tf} para ${dateStr}:`, err); }
      completed++;
      updateOptimizerProgress(completed, total * 5);
      loadingText.textContent = `Gerando gráficos... ${Math.round((completed / (total * 5)) * 100)}%`;
      await sleep(50);
    }
  }
  
  for (const task of totalTasks) {
    const dateStr = `${String(task.date.getDate()).padStart(2, '0')}/${task.hour}h`;
    optimizerItems.push({ label: dateStr, date: task.date, hour: task.hour, response: '', processed: false, result: null });
  }
  
  optimizerIsGenerating = false;
  document.getElementById('optGenerateBtn').disabled = false;
  document.getElementById('optDownloadBtn').style.display = 'flex';
  document.getElementById('optPromptSection').style.display = 'block';
  renderOptimizerList();
  loadingText.textContent = 'Concluído!';
  setTimeout(() => loading.classList.remove('active'), 500);
  showToast(`✅ Geração concluída! ${total} conjuntos gerados.`, 'success');
}

function updateOptimizerProgress(completed, total) {
  const pct = Math.min(100, Math.round((completed / total) * 100));
  const progressBar = document.getElementById('optProgressBar');
  const progressText = document.getElementById('optProgressText');
  if (progressBar) progressBar.style.width = pct + '%';
  if (progressText) progressText.textContent = `${pct}% - Gerando gráficos...`;
}

async function downloadOptimizerCharts() {
  showToast('📥 Baixando gráficos em ordem...', 'info');
  for (let i = 0; i < optimizerCharts.length; i++) {
    const chart = optimizerCharts[i];
    const link = document.createElement('a');
    const ext = chart.type === 'label' ? 'jpg' : 'jpg';
    link.download = `${optAsset}_${chart.label.replace('/', '-')}.${ext}`;
    link.href = chart.data;
    link.click();
    await sleep(300);
  }
  showToast('✅ Todos os gráficos baixados!', 'success');
}

function renderOptimizerList() {
  const container = document.getElementById('optimizerList');
  if (optimizerItems.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = optimizerItems.map((item, idx) => `
    <div class="optimizer-item">
      <div class="optimizer-item-header">
        <div class="optimizer-item-title">${item.label}</div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${item.result ? `<span class="optimizer-item-status ${item.result}">${item.result === 'win' ? '✅ WIN' : '❌ LOSS'}</span>` : ''}
          <span class="optimizer-item-status ${item.processed ? 'done' : 'pending'}">${item.processed ? '✅ Concluída' : '⏳ Pendente'}</span>
        </div>
      </div>
      <textarea class="optimizer-item-textarea" id="optResponse_${idx}" placeholder="Cole a resposta da IA para ${item.label}...">${item.response || ''}</textarea>
      <div class="optimizer-item-actions">
        <button class="optimizer-item-btn" onclick="copyOptimizerItemPrompt(${idx})">📋 Copiar</button>
        <button class="optimizer-item-btn" onclick="pasteOptimizerResponse(${idx})">📋 Colar</button>
        <button class="optimizer-item-btn" onclick="processOptimizerItem(${idx})">⚡ Processar</button>
        <button class="optimizer-item-btn" onclick="verifyOptimizerItem(${idx})">Win/Loss?</button>
        <button class="optimizer-item-btn" onclick="showOptimizerResult(${idx})">📊 Resultado</button>
      </div>
    </div>
  `).join('');
  
  const allProcessed = optimizerItems.every(i => i.processed);
  document.getElementById('optWinRateBtn').style.display = allProcessed ? 'flex' : 'none';
  document.getElementById('optWinRateAllBtn').style.display = optimizerItems.length > 0 ? 'flex' : 'none';
}

function copyOptimizerItemPrompt(idx) {
  let prompt = globalCustomPrompt.trim() || buildPrompt(optAsset);
  if (visualTableEnabled) prompt = prompt + VISUAL_TABLE_PROMPT;
  navigator.clipboard.writeText(prompt).then(() => { showToast('📋 Prompt copiado!', 'success'); }).catch(() => showToast('Erro ao copiar', 'error'));
}

async function pasteOptimizerResponse(idx) {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById(`optResponse_${idx}`).value = text;
    showToast('📋 Colado!', 'success');
  } catch (err) { showToast('Erro ao colar', 'error'); }
}

async function processOptimizerItem(idx) {
  const response = document.getElementById(`optResponse_${idx}`).value.trim();
  if (!response) { showToast('Cole a resposta primeiro', 'error'); return; }
  
  let tableData = parseVisualTable(response);
  if (!tableData) {
    showToast('Tabela não encontrada. Tentando Groq...', 'info');
    tableData = await fetchGroqTable(response);
    if (!tableData) { showToast('Falha ao extrair tabela.', 'error'); return; }
  }
  
  optimizerItems[idx].response = response;
  optimizerItems[idx].processed = true;
  optimizerItems[idx].tableData = tableData;
  
  renderOptimizerList();
  showToast(`✅ ${optimizerItems[idx].label} processada!`, 'success');
}

async function verifyOptimizerItem(idx) {
  const item = optimizerItems[idx];
  if (!item.tableData) { showToast('Processe a análise primeiro', 'error'); return; }
  
  const entry = parseFloat(item.tableData.entry);
  const stop = parseFloat(item.tableData.stop_loss);
  const target = parseFloat(item.tableData.target);
  const direction = item.tableData.direction;
  
  if (!entry || !stop || !target) { showToast('Dados incompletos', 'error'); return; }
  
  showToast(`🔍 Verificando ${item.label}...`, 'info');
  
  try {
    const analysisDate = new Date(item.date);
    analysisDate.setHours(item.hour, 0, 0, 0);
    const resultDate = new Date(analysisDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    const result = await getChartFromBinance(optAsset, '15m', resultDate);
    const klines = result.klines;
    
    let startIdx = 0;
    const analysisTime = analysisDate.getTime();
    let minDiff = Infinity;
    klines.forEach((c, i) => {
      const diff = Math.abs(c[0] - analysisTime);
      if (diff < minDiff) { minDiff = diff; startIdx = i; }
    });

    let hitTarget = false, hitStop = false;
    for (let i = startIdx; i < klines.length; i++) {
      const high = parseFloat(klines[i][2]);
      const low = parseFloat(klines[i][3]);
      if (direction === 'LONG') {
        if (high >= target) { hitTarget = true; break; }
        if (low <= stop) { hitStop = true; break; }
      } else {
        if (low <= target) { hitTarget = true; break; }
        if (high >= stop) { hitStop = true; break; }
      }
    }
    
    let resultStatus = 'pending';
    if (hitTarget && !hitStop) resultStatus = 'win';
    else if (hitStop && !hitTarget) resultStatus = 'loss';
    else if (hitTarget && hitStop) resultStatus = 'loss';
    
    optimizerItems[idx].result = resultStatus;
    renderOptimizerList();
    
    if (resultStatus === 'win') showToast(`✅ ${item.label}: WIN!`, 'success');
    else if (resultStatus === 'loss') showToast(`❌ ${item.label}: LOSS`, 'error');
    else showToast(`⏳ ${item.label}: Inconclusivo`, 'info');
  } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
}

async function analyzeAllWinLoss() {
  const unverified = optimizerItems.filter(i => i.processed && !i.result);
  if (unverified.length === 0) { showToast('Todas as análises já foram verificadas', 'info'); return; }
  
  document.getElementById('optWinRateAllProgress').style.display = 'block';
  document.getElementById('optWinRateAllBtn').disabled = true;
  
  let completed = 0;
  const total = unverified.length;
  
  for (const item of unverified) {
    const idx = optimizerItems.indexOf(item);
    await verifyOptimizerItem(idx);
    completed++;
    const pct = Math.round((completed / total) * 100);
    const progressBar = document.getElementById('optWinRateProgressBar');
    const progressText = document.getElementById('optWinRateProgressText');
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = `Verificando ${item.label}... ${pct}%`;
    await sleep(200);
  }
  
  document.getElementById('optWinRateAllProgress').style.display = 'none';
  document.getElementById('optWinRateAllBtn').disabled = false;
  showToast(`✅ Verificação concluída! ${total} análises verificadas.`, 'success');
}

async function showOptimizerResult(idx) {
  const item = optimizerItems[idx];
  if (!item.tableData) { showToast('Processe a análise primeiro', 'error'); return; }
  
  const entry = parseFloat(item.tableData.entry);
  const stop = parseFloat(item.tableData.stop_loss);
  const target = parseFloat(item.tableData.target);
  const direction = item.tableData.direction;
  
  if (!entry || !stop || !target) { showToast('Dados incompletos', 'error'); return; }
  
  showToast('📊 Gerando resultado...', 'info');
  
  const modal = document.getElementById('resultModal');
  const title = document.getElementById('resultModalTitle');
  const content = document.getElementById('resultModalContent');
  title.textContent = `📊 Resultado - ${item.label}`;
  content.innerHTML = `
    <div class="progress-container"><div class="progress-bar" id="optResultProgressBar" style="width: 0%"></div></div>
    <div class="progress-text" id="optResultProgressText">Carregando...</div>
  `;
  modal.classList.add('active');
  
  try {
    const analysisDate = new Date(item.date);
    analysisDate.setHours(item.hour, 0, 0, 0);
    const resultDate = new Date(analysisDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    const tfs = ['4h', '1h', '15m', '5m'];
    const charts = {};
    
    for (let i = 0; i < tfs.length; i++) {
      const tf = tfs[i];
      const result = await getChartFromBinance(optAsset, tf, resultDate);
      charts[tf] = result.klines;
      const progress = ((i + 1) / tfs.length) * 100;
      const progressBar = document.getElementById('optResultProgressBar');
      const progressText = document.getElementById('optResultProgressText');
      if (progressBar) progressBar.style.width = progress + '%';
      if (progressText) progressText.textContent = `Carregando ${tf.toUpperCase()}... ${Math.round(progress)}%`;
    }
    
    content.innerHTML = `
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Gráficos gerados 2 dias após ${item.label} (${resultDate.toLocaleString('pt-BR')})</div>
      <div class="chart-view-toggle" style="margin-bottom: 12px;">
        <button class="chart-view-btn" id="optResultViewTV" onclick="switchOptResultView('tv', '${optAsset}', '${resultDate.toISOString()}', '${item.date.toISOString()}', ${entry}, ${stop}, ${target})">TradingView</button>
        <button class="chart-view-btn highlight active" id="optResultViewCustom" onclick="switchOptResultView('custom', '${optAsset}', '${resultDate.toISOString()}', '${item.date.toISOString()}', ${entry}, ${stop}, ${target})">✨ Com Sinais</button>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
        <div class="chart-tf-selector" style="flex: 1; margin-bottom: 0;">
          <button class="chart-tf-btn" data-tf="4h" onclick="switchOptResultTf('4h', '${optAsset}', '${resultDate.toISOString()}', '${item.date.toISOString()}', ${entry}, ${stop}, ${target})">4H</button>
          <button class="chart-tf-btn active" data-tf="1h" onclick="switchOptResultTf('1h', '${optAsset}', '${resultDate.toISOString()}', '${item.date.toISOString()}', ${entry}, ${stop}, ${target})">1H</button>
          <button class="chart-tf-btn" data-tf="15m" onclick="switchOptResultTf('15m', '${optAsset}', '${resultDate.toISOString()}', '${item.date.toISOString()}', ${entry}, ${stop}, ${target})">15M</button>
          <button class="chart-tf-btn" data-tf="5m" onclick="switchOptResultTf('5m', '${optAsset}', '${resultDate.toISOString()}', '${item.date.toISOString()}', ${entry}, ${stop}, ${target})">5M</button>
        </div>
        <button class="chart-pnl-btn" onclick="downloadOptResultChart()" title="Baixar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
        <button class="chart-pnl-btn" onclick="verifyOptResultChart('${optAsset}', '${resultDate.toISOString()}', ${entry}, ${stop}, ${target}, '${direction}', ${idx})">Win/Loss?</button>
      </div>
      <div class="chart-wrapper" id="optResultChartWrapper" style="height: 400px;">
        <div id="optResultTvWidgetContainer" style="width: 100%; height: 100%;"></div>
        <canvas id="optResultSignalCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none;"></canvas>
      </div>
    `;
    modal.classList.add('active');
    
    window.optResultCharts = charts;
    window.optResultCurrentTf = '1h';
    window.optResultCurrentView = 'custom';
    window.optResultSignals = { entry, stop, target };
    window.optResultAsset = optAsset;
    window.optResultDateStr = resultDate.toISOString();
    window.optResultIdx = idx;
    window.optResultAnalysisTimestamp = item.date.toISOString();
    
    setTimeout(() => {
      switchOptResultView('custom', optAsset, resultDate.toISOString(), item.date.toISOString(), entry, stop, target);
    }, 600);
  } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
}

window.switchOptResultView = function(view, asset, dateStr, originalDateStr, entry, stop, target) {
  window.optResultCurrentView = view;
  const tvBtn = document.getElementById('optResultViewTV'); const customBtn = document.getElementById('optResultViewCustom');
  if (tvBtn) tvBtn.classList.toggle('active', view === 'tv');
  if (customBtn) customBtn.classList.toggle('active', view === 'custom');
  const tvContainer = document.getElementById('optResultTvWidgetContainer');
  const signalCanvas = document.getElementById('optResultSignalCanvas');
  if (view === 'tv') { tvContainer.style.display = 'block'; signalCanvas.style.display = 'none'; loadTradingViewWidget(asset, window.optResultCurrentTf, 'optResultTvWidgetContainer'); }
  else { 
    tvContainer.style.display = 'none'; signalCanvas.style.display = 'block'; 
    drawSignalCanvasWithRetry(window.optResultCharts[window.optResultCurrentTf], { entry, stop, target }, window.optResultCurrentTf, 'optResultSignalCanvas', null);
    setTimeout(() => {
      drawAnalysisLine(window.optResultCharts[window.optResultCurrentTf], 'optResultSignalCanvas', window.optResultAnalysisTimestamp);
    }, 400);
  }
};

window.switchOptResultTf = function(tf, asset, dateStr, originalDateStr, entry, stop, target) {
  window.optResultCurrentTf = tf;
  document.querySelectorAll('#resultModal .chart-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  if (window.optResultCurrentView === 'tv') { loadTradingViewWidget(asset, tf, 'optResultTvWidgetContainer'); }
  else {
    drawSignalCanvasWithRetry(window.optResultCharts[tf], { entry, stop, target }, tf, 'optResultSignalCanvas', null);
    setTimeout(() => {
      drawAnalysisLine(window.optResultCharts[tf], 'optResultSignalCanvas', window.optResultAnalysisTimestamp);
    }, 400);
  }
};

window.downloadOptResultChart = function() {
  const canvas = document.getElementById('optResultSignalCanvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `${window.optResultAsset}_${window.optResultCurrentTf}_resultado.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.9);
  link.click();
  showToast('Gráfico baixado!', 'success');
};

window.verifyOptResultChart = async function(asset, dateStr, entry, stop, target, direction, idx) {
  showToast('🔍 Verificando...', 'info');
  try {
    const result = await getChartFromBinance(asset, '15m', dateStr);
    const klines = result.klines;
    
    let startIdx = 0;
    const analysisTime = new Date(window.optResultAnalysisTimestamp).getTime();
    let minDiff = Infinity;
    klines.forEach((c, i) => {
      const diff = Math.abs(c[0] - analysisTime);
      if (diff < minDiff) { minDiff = diff; startIdx = i; }
    });

    let hitTarget = false, hitStop = false;
    for (let i = startIdx; i < klines.length; i++) {
      const high = parseFloat(klines[i][2]); const low = parseFloat(klines[i][3]);
      if (direction === 'LONG') { 
        if (high >= target) { hitTarget = true; break; } 
        if (low <= stop) { hitStop = true; break; } 
      } else { 
        if (low <= target) { hitTarget = true; break; } 
        if (high >= stop) { hitStop = true; break; } 
      }
    }
    
    let resultStatus = 'pending';
    if (hitTarget && !hitStop) resultStatus = 'win';
    else if (hitStop && !hitTarget) resultStatus = 'loss';
    else if (hitTarget && hitStop) resultStatus = 'loss';
    
    if (optimizerItems[idx]) { optimizerItems[idx].result = resultStatus; renderOptimizerList(); }
    
    if (resultStatus === 'win') showToast('✅ WIN!', 'success');
    else if (resultStatus === 'loss') showToast('❌ LOSS!', 'error');
    else showToast('⏳ Inconclusivo', 'info');
  } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
};

function copyOptimizerPrompt() {
  let prompt = globalCustomPrompt.trim() || buildPrompt(optAsset);
  if (visualTableEnabled) prompt = prompt + VISUAL_TABLE_PROMPT;
  navigator.clipboard.writeText(prompt).then(() => { showToast('📋 Prompt copiado!', 'success'); }).catch(() => showToast('Erro ao copiar', 'error'));
}

async function analyzeWinRate() {
  const processed = optimizerItems.filter(i => i.processed);
  if (processed.length === 0) { showToast('Nenhuma análise processada', 'error'); return; }
  
  const wins = processed.filter(i => i.result === 'win').length;
  const losses = processed.filter(i => i.result === 'loss').length;
  const pending = processed.filter(i => !i.result).length;
  const total = processed.length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
  
  const capitalPerTrade = 12;
  const makerFee = 0.001;
  const takerFee = 0.001;
  let totalPnL = 0;
  
  processed.forEach(item => {
    if (!item.tableData || !item.result) return;
    const entry = parseFloat(item.tableData.entry);
    const stop = parseFloat(item.tableData.stop_loss);
    const target = parseFloat(item.tableData.target);
    const direction = item.tableData.direction;
    if (!entry || !stop || !target) return;
    
    const riskAmount = capitalPerTrade * 0.02;
    const stopDistance = Math.abs(entry - stop);
    const stopDistancePercent = stopDistance / entry;
    const positionSize = riskAmount / stopDistancePercent;
    const entryFee = positionSize * makerFee;
    
    if (item.result === 'win') {
      const profit = direction === 'LONG' ? (target - entry) : (entry - target);
      const profitAmount = (profit / entry) * positionSize;
      const exitFee = positionSize * (target / entry) * takerFee;
      totalPnL += profitAmount - entryFee - exitFee;
    } else if (item.result === 'loss') {
      const loss = direction === 'LONG' ? (entry - stop) : (stop - entry);
      const lossAmount = (loss / entry) * positionSize;
      const exitFee = positionSize * (stop / entry) * takerFee;
      totalPnL -= lossAmount + entryFee + exitFee;
    }
  });
  
  const initialCapital = total * capitalPerTrade;
  const finalBalance = initialCapital + totalPnL;
  
  let promptUsed = globalCustomPrompt.trim() || buildPrompt(optAsset);
  if (visualTableEnabled) promptUsed = promptUsed + VISUAL_TABLE_PROMPT;
  
  const resultText = `📊 RESULTADO OTIMIZADOR DE PROMPT\n\n` +
    `💰 Ativo: ${optAsset}\n` +
    `📅 Período: ${document.getElementById('optStartDate').value} a ${document.getElementById('optEndDate').value}\n` +
    `📈 Total de análises: ${total}\n` +
    `✅ Wins: ${wins}\n` +
    `❌ Losses: ${losses}\n` +
    `⏳ Pendentes: ${pending}\n` +
    `🎯 Taxa de Acerto: ${winRate}%\n\n` +
    `💵 Capital por trade: $${capitalPerTrade}\n` +
    `💰 Capital total investido: $${initialCapital}\n` +
    `📊 PnL total: $${totalPnL.toFixed(2)}\n` +
    `💳 Saldo final: $${finalBalance.toFixed(2)}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n📋 PROMPT USADO:\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${promptUsed}`;
  
  optimizerWinRateResult = resultText;
  document.getElementById('optWinRateText').textContent = resultText;
  document.getElementById('optWinRateResult').style.display = 'block';
  showToast('✅ Win Rate analisado!', 'success');
}

function copyWinRateResult() {
  if (!optimizerWinRateResult) { showToast('Nenhum resultado para copiar', 'error'); return; }
  navigator.clipboard.writeText(optimizerWinRateResult).then(() => { showToast('Copiado!', 'success'); }).catch(() => showToast('Erro ao copiar', 'error'));
}

async function saveOptimizerSet() {
  const processed = optimizerItems.filter(i => i.processed);
  if (processed.length === 0) { showToast('Nenhuma análise para salvar', 'error'); return; }
  
  const set = {
    id: Date.now().toString(),
    date: new Date().toLocaleString('pt-BR'),
    asset: optAsset,
    analyses: processed.map(i => ({ ...i }))
  };
  
  try {
    await FirebaseService.saveSet(set);
    loadSavedSets();
    showToast('✅ Conjunto salvo em Análises Salvas!', 'success');
  } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
}

function clearOptimizerPage() {
  if (!confirm('Limpar toda a página do Otimizador? Isso apagará todas as análises da lista.')) return;
  optimizerCharts = [];
  optimizerItems = [];
  optimizerWinRateResult = '';
  document.getElementById('optStartDate').value = '';
  document.getElementById('optEndDate').value = '';
  document.getElementById('optProgressContainer').style.display = 'none';
  document.getElementById('optDownloadBtn').style.display = 'none';
  document.getElementById('optPromptSection').style.display = 'none';
  document.getElementById('optWinRateResult').style.display = 'none';
  document.getElementById('optimizerList').innerHTML = '';
  document.getElementById('optWinRateBtn').style.display = 'none';
  document.getElementById('optWinRateAllBtn').style.display = 'none';
  showToast('🗑️ Página limpa!', 'success');
}