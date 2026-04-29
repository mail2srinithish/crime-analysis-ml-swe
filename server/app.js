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
const { auth, isLogedIn } = require('./middlewares/auth');
const Crime = require('./models/complaint');
const IPCData = require('./public/data/ipc');
const SLLData = require('./public/data/sll');
// ═══ AI FEATURE HIDDEN ═══
// const { fetchAllNews } = require('./services/newsService');

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
sequelize.sync()
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
  
  // ═══ AI FEATURE HIDDEN: Live News Ticker ═══
  // let liveNews = [];
  // try {
  //   const newsData = await fetchAllNews();
  //   liveNews = newsData.articles.slice(0, 5);
  // } catch (e) { /* ignore */ }
  let liveNews = [];

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

  res.render('dashboard', {
    ipcData: IPCData,
    sllData: SLLData,
    safetyScores: safetyScores || [],
    osintAlerts: osintAlerts,
    clusters: clusters || [],
    liveNews
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

// ═══ AI FEATURE HIDDEN: Admin Triage UI ═══
// app.get('/triage', auth, async (req, res) => {
//   try {
//     const complaints = await Crime.findAll({ order: [['createdAt', 'DESC']] });
//     const priorityOrder = { "CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4, "Unclassified": 5 };
//     complaints.sort((a,b) => priorityOrder[a.aiPriority] - priorityOrder[b.aiPriority]);
//     res.render('triage', { complaints });
//   } catch (err) {
//     console.log(err);
//     req.flash('error', 'Could not load triage center');
//     res.redirect('/');
//   }
// });

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

// ═══ AI FEATURE HIDDEN: Live News Feed ═══
// app.get('/livefeed', auth, async (req, res) => {
//   try {
//     const newsData = await fetchAllNews();
//     res.render('livefeed', { newsData });
//   } catch (err) {
//     console.log(err);
//     res.render('livefeed', { 
//       newsData: { articles: [], totalResults: 0, sources: {}, lastUpdated: new Date().toISOString() } 
//     });
//   }
// });

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
    const years = Array.from({length: 18}, (_, i) => String(2003 + i));
    comparison = {
      years,
      state1: { name: state1Name, ipc: s1ipc?.reports || [], sll: s1sll?.reports || [], safety_score: 'N/A', risk_label: 'N/A' },
      state2: { name: state2Name, ipc: s2ipc?.reports || [], sll: s2sll?.reports || [], safety_score: 'N/A', risk_label: 'N/A' }
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
  const years = Array.from({length: 18}, (_, i) => String(2003 + i));

  // Get safety scores from Flask
  let safetyScores = await flaskGet('/api/ml/safety-scores');
  let stateScore = null;
  if (Array.isArray(safetyScores)) {
    stateScore = safetyScores.find(s => s.state === stateName);
  }

  // Get RF prediction from Flask
  let rfPred = await flaskGet(`/api/ml/predict/${encodeURIComponent(stateName)}?type=ipc&model=rf`);
  
  // Get District Hotspots from Flask
  let districtsData = await flaskGet('/api/ml/districts');
  let districtHotspots = [];
  if (Array.isArray(districtsData)) {
    districtHotspots = districtsData.filter(d => d.state === stateName);
  }
  
  // Compute growth rates
  const ipcReports = stateIPC?.reports || [];
  const growthRates = ipcReports.map((v, i) => i === 0 ? 0 : (((v - ipcReports[i-1]) / Math.max(ipcReports[i-1], 1)) * 100).toFixed(1));

  res.render('statewise', {
    stateName, stateList, selectedState: sc, years,
    ipcReports: stateIPC?.reports || [],
    sllReports: stateSLL?.reports || [],
    growthRates,
    stateScore: stateScore || { safety_score: 'N/A', risk_label: 'N/A', crimes_per_lakh: 'N/A' },
    rfPrediction: rfPred && !rfPred.error ? rfPred : null,
    districtHotspots
  });
});

// ========= API ENDPOINTS =========

// ═══ AI FEATURE HIDDEN: Live news API ═══
// app.get('/api/live-news', async (req, res) => {
//   try {
//     const data = await fetchAllNews();
//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch news' });
//   }
// });

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
