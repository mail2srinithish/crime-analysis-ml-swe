require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejsMate = require('ejs-mate');
const path = require('path');
const _ = require('lodash');
const session = require('express-session');
const flash = require('connect-flash');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const cookieParser = require('cookie-parser');
const axios = require('axios');
const userController = require('./controllers/userController');
const complaintController = require('./controllers/complaintController');
const { Op } = require('sequelize');
const { auth, isLogedIn } = require('./middlewares/auth');
const Crime = require('./models/complaint');
const IPCData = require('./public/data/ipc');
const SLLData = require('./public/data/sll');
const DISTRICT_COORDS = require('./public/data/districtCoords');
const { fetchAllNews } = require('./services/newsService');

const sequelize = require('./db');
const secret = process.env.JWT_SECRET || 'EDI@50';
const FLASK_SERVER = process.env.FLASK_SERVER || 'http://localhost:5001';

const app = express();

// ========= SESSION STORE =========
const store = new SequelizeStore({
  db: sequelize,
  checkExpirationInterval: 15 * 60 * 1000, 
  expiration: 24 * 60 * 60 * 1000 
});

// ========= VIEW ENGINE =========
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========= MIDDLEWARE =========
const sessionConfig = {
  store,
  name: 'CrimeAnalysisSession',
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + (1000 * 60 * 60 * 24 * 7),
    maxAge: (1000 * 60 * 60 * 24 * 7)
  }
};
app.use(session(sessionConfig));
app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// ========= DATABASE =========
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ SQLite Database connected and synchronized.');
  })
  .catch(err => {
    console.log('❌ SQLite Database sync failed:', err.message);
  });

// ========= FLASH MIDDLEWARE =========
app.use((req, res, next) => {
  res.locals.currentUser = isLogedIn(req);
  res.locals.success = req.flash('success');
  res.locals.warning = req.flash('warning');
  res.locals.error = req.flash('error');
  res.locals.stateTable = stateTable;
  res.locals.stateList = stateList;
  next();
});

// ========= STATE TABLE =========
const stateTable = {
  'ap': 'Andhra Pradesh', 'ar': 'Arunachal Pradesh', 'as': 'Assam',
  'br': 'Bihar', 'cg': 'Chhattisgarh', 'ga': 'Goa', 'gj': 'Gujarat',
  'hr': 'Haryana', 'hp': 'Himachal Pradesh', 'jk': 'Jammu and Kashmir',
  'jh': 'Jharkhand', 'ka': 'Karnataka', 'kl': 'Kerala',
  'mp': 'Madhya Pradesh', 'mh': 'Maharashtra', 'mn': 'Manipur',
  'ml': 'Meghalaya', 'mz': 'Mizoram', 'nl': 'Nagaland', 'od': 'Odisha',
  'pb': 'Punjab', 'rj': 'Rajasthan', 'sk': 'Sikkim', 'tn': 'Tamil Nadu',
  'tr': 'Tripura', 'up': 'Uttar Pradesh', 'uk': 'Uttarakhand',
  'wb': 'West Bengal', 'ts': 'Telangana', 'an': 'Andaman & Nicobar Islands',
  'ch': 'Chandigarh', 'dn': 'Dadra and Nagar Haveli', 'dd': 'Daman and Diu',
  'ld': 'Lakshadweep', 'dl': 'Delhi', 'py': 'Puducherry'
};
const stateList = Object.entries(stateTable).map(([code, name]) => ({ code, name }));

// ========= HELPER: Flask ML Proxy =========
async function flaskGet(endpoint) {
  try {
    const res = await axios.get(`${FLASK_SERVER}${endpoint}`, { timeout: 10000 });
    return res.data;
  } catch (err) {
    console.log(`⚠️ Flask ML (${endpoint}):`, err.message);
    return null;
  }
}

// ========= HELPER: Safety Score Computation — NCRB crimes-per-lakh method =========
// Population estimates (in lakhs, 2024) aligned with NCRB reporting units
const STATE_POPULATION_LAKH = {
  'Andhra Pradesh': 530, 'Arunachal Pradesh': 16, 'Assam': 362, 'Bihar': 1250,
  'Chhattisgarh': 315, 'Goa': 16, 'Gujarat': 695, 'Haryana': 296,
  'Himachal Pradesh': 75, 'Jammu and Kashmir': 145, 'Jharkhand': 405,
  'Karnataka': 710, 'Kerala': 362, 'Madhya Pradesh': 915, 'Maharashtra': 1380,
  'Manipur': 34, 'Meghalaya': 38, 'Mizoram': 13, 'Nagaland': 24, 'Odisha': 488,
  'Punjab': 315, 'Rajasthan': 850, 'Sikkim': 7, 'Tamil Nadu': 795,
  'Telangana': 408, 'Tripura': 43, 'Uttar Pradesh': 2350, 'Uttarakhand': 118,
  'West Bengal': 1030, 'Delhi': 210, 'Chandigarh': 12,
  'Andaman & Nicobar Islands': 4, 'Andaman and Nicobar Islands': 4,
  'Dadra and Nagar Haveli': 5, 'Dadra and Nagar Haveli and Daman and Diu': 6,
  'Daman and Diu': 3, 'Lakshadweep': 1, 'Puducherry': 17, 'Ladakh': 3
};

// Detects and corrects anomalous ML projections using a linear trend baseline.
// Tamil Nadu and Gujarat have known data spikes post-2017 that inflate projections.
function getRepresentativeCount(reports) {
  const n = reports.length;
  if (n < 4) return reports[n - 1] || 0;
  // Fit linear trend on first 12 historical data points (pre-projection period)
  const histN = Math.min(12, n);
  const xs = Array.from({ length: histN }, (_, i) => i);
  const ys = reports.slice(0, histN);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = histN * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (histN * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / histN;
  // Extrapolate trend to current year
  const trendVal = Math.max(slope * (n - 1) + intercept, ys[0]);
  const actual = reports[n - 1] || 0;
  // If actual > 3× trend (anomaly detected), cap at 1.5× trend for fair scoring
  return (trendVal > 0 && actual > trendVal * 3) ? Math.round(trendVal * 1.5) : actual;
}

function computeSafetyScores() {
  const rateData = IPCData.map(s => {
    const pop = STATE_POPULATION_LAKH[s.State] || 50;
    // Use anomaly-corrected crime counts for fair comparison
    const ipcVal = getRepresentativeCount(s.reports);
    const stateSLL = SLLData.find(x => x.State === s.State);
    const sllVal = stateSLL ? getRepresentativeCount(stateSLL.reports) : 0;
    // NCRB crime rate = IPC crimes per lakh population; SLL has lower weight
    const crimeRate = (ipcVal + sllVal * 0.25) / pop;
    return { State: s.State, crimeRate, ipcVal: s.reports[s.reports.length - 1] || 0, sllVal: sllVal };
  });

  // Absolute NCRB-calibrated scale: Delhi ≈ 1500/lakh is "0 safety", 0/lakh is "100"
  // This matches real NCRB 2022 ranges (national avg ~422, Delhi ~1450, low states ~150)
  const RATE_MAX = 1500;
  return rateData.map(({ State, crimeRate, ipcVal, sllVal }) => {
    const safetyScore = parseFloat(
      Math.max(0, Math.min(100, (1 - crimeRate / RATE_MAX) * 100)).toFixed(1)
    );
    let riskLabel;
    if (safetyScore >= 75) riskLabel = 'Very Low';
    else if (safetyScore >= 55) riskLabel = 'Low';
    else if (safetyScore >= 35) riskLabel = 'Medium';
    else if (safetyScore >= 15) riskLabel = 'High';
    else riskLabel = 'Very High';
    return { state: State, safety_score: safetyScore, risk_label: riskLabel, ipc_crimes: ipcVal, sll_crimes: sllVal };
  }).sort((a, b) => b.safety_score - a.safety_score);
}

// ========= HELPER: Linear regression fallback =========
function linearPredict(reports, forecastYears = 5) {
  const n = reports.length;
  const years = reports.map((_, i) => 2003 + i);
  const sumX = years.reduce((a, b) => a + b, 0);
  const sumY = reports.reduce((a, b) => a + b, 0);
  const sumXY = years.reduce((acc, x, i) => acc + x * reports[i], 0);
  const sumX2 = years.reduce((acc, x) => acc + x * x, 0);
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const c = (sumY - m * sumX) / n;
  const predictions = [];
  const predYears = [];
  for (let i = 0; i < forecastYears; i++) {
    const year = 2003 + n + i;
    predYears.push(String(year));
    predictions.push(Math.max(0, Math.round(m * year + c)));
  }
  return { predictedYears: predYears, predictedValues: predictions };
}

// ============================================
//                 ROUTES
// ============================================

// Home
app.get('/', (req, res) => {
  res.render('home');
});

// Dashboard
app.get('/dashboard', auth, async (req, res) => {
  // Try to get safety scores and clusters from Flask ML
  let safetyScores = await flaskGet('/api/ml/safety-scores');
  let clusters = await flaskGet('/api/ml/clusters');

  // Complaint stats for dashboard panel
  let complaintStats = { total: 0, critical: 0, pending: 0, today: 0 };
  try {
    const allComplaints = await Crime.findAll();
    const todayStr = new Date().toDateString();
    complaintStats = {
      total: allComplaints.length,
      critical: allComplaints.filter(c => c.aiPriority === 'CRITICAL').length,
      pending: allComplaints.filter(c => c.status === 'Pending').length,
      today: allComplaints.filter(c => new Date(c.createdAt).toDateString() === todayStr).length
    };
  } catch (e) { /* ignore if DB not ready */ }

  // Fetch a few live news headlines for the ticker
  let liveNews = [];
  try {
    const newsData = await fetchAllNews();
    liveNews = newsData.articles.slice(0, 5);
  } catch (e) { /* ignore */ }

  // ═══ AI FEATURE HIDDEN: OSINT Actionable Risk Alerts ═══
  // let osintAlerts = [];
  // IPCData.forEach(stateObj => {
  //     const reports = stateObj.reports;
  //     if (reports.length >= 2) {
  //         const currentCrimes = reports[reports.length - 1];
  //         const prevCrimes = reports[reports.length - 2];
  //         const predictedNext = currentCrimes + (currentCrimes - prevCrimes);
  //         const growth = ((predictedNext - currentCrimes) / Math.max(currentCrimes, 1)) * 100;
  //         if (growth > 10.0 && currentCrimes > 1000) {
  //             osintAlerts.push({
  //                 state: stateObj.State,
  //                 growth: growth.toFixed(1),
  //                 urgency: growth > 20 ? 'CRITICAL' : 'HIGH'
  //             });
  //         }
  //     }
  // });
  let osintAlerts = [];

  // Use computed safety scores — Flask pkl data is broken (returns 0 for most states)
  safetyScores = computeSafetyScores();

  res.render('dashboard', {
    ipcData: IPCData,
    sllData: SLLData,
    safetyScores: safetyScores,
    osintAlerts: osintAlerts,
    clusters: clusters || [],
    liveNews,
    complaintStats
  });
});

// Auth
app.get('/login', (req, res) => res.render('login'));
app.post('/login', userController.login);
app.get('/signup', (req, res) => res.render('signup'));
app.post('/signup', userController.signup);
app.get('/logout', userController.logout);

// Complaint
app.get('/complaint', auth, (req, res) => res.render('complaint'));
app.post('/complaint', auth, complaintController.createComplaint);

// View Crime Reports
app.get('/crime', auth, async (req, res) => {
  try {
    const details = await Crime.findAll({ order: [['createdAt', 'DESC']] });
    res.render('crime', { listTitle: 'Crime Reports', item: details });
  } catch (err) {
    console.log(err);
    req.flash('error', 'Could not load reports');
    res.redirect('/');
  }
});

// Admin Triage Center
app.get('/triage', auth, async (req, res) => {
  try {
    const { priority, status, state, type } = req.query;
    const where = {};
    if (priority && priority !== 'all') where.aiPriority = priority;
    if (status && status !== 'all') where.status = status;
    if (state && state !== 'all') where.state = state;
    if (type && type !== 'all') where.complaintType = type;

    const complaints = await Crime.findAll({ where, order: [['createdAt', 'DESC']] });
    const priorityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4, 'Unclassified': 5 };
    complaints.sort((a, b) => priorityOrder[a.aiPriority] - priorityOrder[b.aiPriority]);

    // Stats for summary cards
    const allComplaints = await Crime.findAll();
    const stats = {
      total: allComplaints.length,
      critical: allComplaints.filter(c => c.aiPriority === 'CRITICAL').length,
      pending: allComplaints.filter(c => c.status === 'Pending').length,
      resolved: allComplaints.filter(c => c.status === 'Resolved').length,
      today: allComplaints.filter(c => {
        const d = new Date(c.createdAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length
    };

    res.render('triage', { complaints, stats, stateList, filters: req.query });
  } catch (err) {
    console.log(err);
    req.flash('error', 'Could not load triage center');
    res.redirect('/dashboard');
  }
});

// Status update API for triage
app.post('/triage/:id/status', auth, complaintController.updateStatus);

// Delete complaint from triage
app.delete('/triage/:id', auth, async (req, res) => {
  try {
    await Crime.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ML Prediction Page
app.get('/predict', auth, async (req, res) => {
  try {
    const selectedType = req.query.crimetype || 'i';
    const selectedState = req.query.state || 'ap';
    const stateName = stateTable[selectedState] || 'Andhra Pradesh';
    const crimeType = selectedType === 'i' ? 'ipc' : 'sll';

    const data = selectedType === 'i' ? IPCData : SLLData;
    const stateObj = data.find(s => s.State === stateName);
    const reports = stateObj ? stateObj.reports : new Array(18).fill(0);
    const labels = reports.map((_, i) => String(2003 + i));

    // Try Random Forest from Flask first
    let rfResult = await flaskGet(`/api/ml/predict/${encodeURIComponent(stateName)}?type=${crimeType}&model=rf`);
    let lrResult = await flaskGet(`/api/ml/predict/${encodeURIComponent(stateName)}?type=${crimeType}&model=linear`);

    let predictedYears, predictedValues, modelName, confidence;
    let lrPredictedValues;

    if (rfResult && !rfResult.error) {
      predictedYears = rfResult.future_years;
      predictedValues = rfResult.predictions;
      modelName = rfResult.model;
      confidence = rfResult.confidence;
      lrPredictedValues = lrResult ? lrResult.predictions : linearPredict(reports, 5).predictedValues;
    } else {
      // Fallback to inline linear regression
      const lr = linearPredict(reports, 5);
      predictedYears = lr.predictedYears;
      predictedValues = lr.predictedValues;
      lrPredictedValues = lr.predictedValues;
      modelName = 'Linear Regression (Fallback)';
      confidence = 'Low';
    }

    res.render('predict', {
      labels, staticData: reports,
      predictedYears, predictedValues, lrPredictedValues,
      selectedType, selectedState, stateName, stateList,
      modelName, confidence
    });
  } catch (err) {
    console.log(err);
    req.flash('error', 'Prediction failed');
    res.redirect('/');
  }
});

// Live News Feed
app.get('/livefeed', auth, async (req, res) => {
  try {
    const newsData = await fetchAllNews();
    res.render('livefeed', { newsData });
  } catch (err) {
    console.log(err);
    res.render('livefeed', { 
      newsData: { articles: [], totalResults: 0, sources: {}, lastUpdated: new Date().toISOString() } 
    });
  }
});

// State Comparison Page
app.get('/compare', auth, async (req, res) => {
  const s1 = req.query.state1 || 'mh';
  const s2 = req.query.state2 || 'up';
  const state1Name = stateTable[s1] || 'Maharashtra';
  const state2Name = stateTable[s2] || 'Uttar Pradesh';

  // Try Flask ML comparison
  let comparison = await flaskGet(`/api/ml/compare?state1=${encodeURIComponent(state1Name)}&state2=${encodeURIComponent(state2Name)}`);

  if (!comparison || comparison.error) {
    // Fallback: build comparison from local data
    const s1ipc = IPCData.find(s => s.State === state1Name);
    const s2ipc = IPCData.find(s => s.State === state2Name);
    const s1sll = SLLData.find(s => s.State === state1Name);
    const s2sll = SLLData.find(s => s.State === state2Name);
    const dataLen = Math.max(s1ipc?.reports?.length || 0, s2ipc?.reports?.length || 0, 18);
    const years = Array.from({length: dataLen}, (_, i) => String(2003 + i));

    // Get computed safety scores for comparison
    const computedScores = computeSafetyScores();
    const s1score = computedScores.find(s => s.state === state1Name);
    const s2score = computedScores.find(s => s.state === state2Name);

    comparison = {
      years,
      state1: { name: state1Name, ipc: s1ipc?.reports || [], sll: s1sll?.reports || [],
                safety_score: s1score?.safety_score ?? 'N/A', risk_label: s1score?.risk_label ?? 'N/A' },
      state2: { name: state2Name, ipc: s2ipc?.reports || [], sll: s2sll?.reports || [],
                safety_score: s2score?.safety_score ?? 'N/A', risk_label: s2score?.risk_label ?? 'N/A' }
    };
  }

  res.render('compare', { comparison, stateList, selectedState1: s1, selectedState2: s2 });
});

// Deep State Analysis
app.get('/statewise', auth, async (req, res) => {
  const sc = req.query.state || 'mh';
  const stateName = stateTable[sc] || 'Maharashtra';
  
  const stateIPC = IPCData.find(s => s.State === stateName);
  const stateSLL = SLLData.find(s => s.State === stateName);
  const dataLen = Math.max(stateIPC?.reports?.length || 0, stateSLL?.reports?.length || 0, 18);
  const years = Array.from({length: dataLen}, (_, i) => String(2003 + i));

  // Always use computed safety scores (Flask pkl returns 0 for most states)
  const safetyScores = computeSafetyScores();
  let stateScore = safetyScores.find(s => s.state === stateName) || null;

  // Get RF prediction from Flask
  let rfPred = await flaskGet(`/api/ml/predict/${encodeURIComponent(stateName)}?type=ipc&model=rf`);
  
  // Get District Hotspots from Flask and enrich with real coordinates
  let districtsData = await flaskGet('/api/ml/districts');
  let districtHotspots = [];
  if (Array.isArray(districtsData)) {
    districtHotspots = districtsData
      .filter(d => d.state === stateName)
      .map(d => {
        const coords = DISTRICT_COORDS[d.district] || DISTRICT_COORDS[d.district.trim()];
        return { ...d, lat: coords ? coords[0] : null, lng: coords ? coords[1] : null };
      });
  }
  
  // Compute growth rates
  const ipcReports = stateIPC?.reports || [];
  const growthRates = ipcReports.map((v, i) => i === 0 ? 0 : (((v - ipcReports[i-1]) / Math.max(ipcReports[i-1], 1)) * 100).toFixed(1));

  res.render('statewise', {
    stateName, stateList, selectedState: sc, years,
    ipcReports: stateIPC?.reports || [],
    sllReports: stateSLL?.reports || [],
    growthRates,
    stateScore: stateScore || computeSafetyScores().find(s => s.state === stateName) || { safety_score: 0, risk_label: 'Very High' },
    rfPrediction: rfPred && !rfPred.error ? rfPred : null,
    districtHotspots
  });
});

// ========= API ENDPOINTS =========

// Live news API (for AJAX polling)
app.get('/api/live-news', async (req, res) => {
  try {
    const data = await fetchAllNews();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// National trends
app.get('/api/national-trends', (req, res) => {
  const years = [];
  for (let y = 2003; y <= 2020; y++) years.push(String(y));
  const nationalIPC = new Array(years.length).fill(0);
  const nationalSLL = new Array(years.length).fill(0);
  IPCData.forEach(s => s.reports.forEach((v, i) => { if (i < years.length) nationalIPC[i] += v; }));
  SLLData.forEach(s => s.reports.forEach((v, i) => { if (i < years.length) nationalSLL[i] += v; }));
  res.json({ years, ipc: nationalIPC, sll: nationalSLL });
});

// State analysis
app.get('/api/state-analysis/:stateName', (req, res) => {
  const stateName = req.params.stateName;
  const ipc = IPCData.find(s => s.State.toLowerCase() === stateName.toLowerCase());
  const sll = SLLData.find(s => s.State.toLowerCase() === stateName.toLowerCase());
  if (!ipc) return res.status(404).json({ error: 'State not found' });
  const years = ipc.reports.map((_, i) => String(2003 + i));
  res.json({ state: ipc.State, years, ipc: ipc.reports, sll: sll ? sll.reports : new Array(years.length).fill(0) });
});

// CSV Export
app.get('/api/export/csv', (req, res) => {
  const stateName = req.query.state;
  let rows = [];
  let filename = 'crime_data_national.csv';

  if (stateName) {
    const ipc = IPCData.find(s => s.State.toLowerCase() === stateName.toLowerCase());
    const sll = SLLData.find(s => s.State.toLowerCase() === stateName.toLowerCase());
    if (!ipc) return res.status(404).send('State not found');
    filename = `crime_data_${stateName.replace(/\s+/g, '_')}.csv`;
    rows.push('Year,IPC Crimes,SLL Crimes,Total');
    ipc.reports.forEach((v, i) => {
      const sv = sll ? sll.reports[i] : 0;
      rows.push(`${2003 + i},${v},${sv},${v + sv}`);
    });
  } else {
    rows.push('State,Year,IPC Crimes,SLL Crimes,Total');
    IPCData.forEach(state => {
      const sll = SLLData.find(s => s.State === state.State);
      state.reports.forEach((v, i) => {
        const sv = sll ? sll.reports[i] : 0;
        rows.push(`${state.State},${2003 + i},${v},${sv},${v + sv}`);
      });
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(rows.join('\n'));
});

// Complaints CSV Export
app.get('/api/export/complaints', auth, async (req, res) => {
  try {
    const complaints = await Crime.findAll({ order: [['createdAt', 'DESC']] });
    const rows = ['Ref#,Date,Name,Email,State,District,Address,Type,Priority,AICategory,Status,Description'];
    complaints.forEach(c => {
      const desc = `"${(c.complaint || '').replace(/"/g, '""')}"`;
      rows.push([
        c.refNumber || '', new Date(c.createdAt).toLocaleDateString('en-IN'),
        c.fullName, c.email, c.state || '', c.district, c.address,
        c.complaintType, c.aiPriority, c.aiCategory, c.status || 'Pending', desc
      ].join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=crime_reports.csv');
    res.send(rows.join('\n'));
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Proxy to Flask ML
app.get('/api/ml/*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/api/ml', '/api/ml');
    const query = new URLSearchParams(req.query).toString();
    const url = `${FLASK_SERVER}${endpoint}${query ? '?' + query : ''}`;
    const response = await axios.get(url, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Flask ML server unavailable', details: err.message });
  }
});

// ========= START SERVER =========
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🔍 Crime Analysis ML — Indian Intelligence');
  console.log('═══════════════════════════════════════════════');
  console.log(`  🌐 Server:  http://localhost:${PORT}`);
  console.log(`  🧠 Flask ML: ${FLASK_SERVER}`);
  console.log(`  📰 News APIs: GNews, NewsData, NewsAPI, BBC`);
  console.log('═══════════════════════════════════════════════');
});
