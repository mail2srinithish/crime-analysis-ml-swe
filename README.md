# Crime Analysis and Utilizing Machine Learning and Flask Framework

A comprehensive Indian Crime Intelligence & ML Prediction platform covering 36 States/UTs with IPC and SLL data (2003–2020), powered by scikit-learn models and real-time news feeds.

## 🏗️ Architecture

```
crime-analysis-ml/
├── server/               # Node.js/Express (Port 5005)
│   ├── app.js            # Main application with all routes
│   ├── controllers/      # Auth & complaint controllers
│   ├── middlewares/       # JWT authentication
│   ├── models/            # Mongoose schemas
│   ├── services/          # Live news aggregator
│   ├── views/             # EJS templates (premium UI)
│   └── public/            # Static assets, CSS, data
├── analysis/             # Python/Flask ML Engine (Port 5001)
│   ├── app.py            # Flask REST API
│   ├── helper.py         # ML functions (RF, K-Means, Safety)
│   ├── train_models.py   # Model training script
│   └── models/           # Trained .pkl models
└── shared/               # Indian crime datasets (IPC/SLL JSON)
```

## 🧠 Machine Learning Models

| Model | Algorithm | Purpose |
|-------|-----------|---------|
| Random Forest Regressor | `scikit-learn` | Per-state crime count prediction |
| K-Means Clustering | `scikit-learn` | Crime hotspot classification (5 risk levels) |
| Linear Regression | `numpy` | Baseline prediction / fallback |
| Safety Score Index | Composite | Crime-per-lakh + growth rate scoring (0–100) |

## 📰 Live API Integrations

| Source | API | Usage |
|--------|-----|-------|
| GNews | gnews.io | Crime news search (India) |
| NewsData.io | newsdata.io | Crime category headlines |
| NewsAPI.org | newsapi.org | Global crime news |
| BBC News | bbc-news-api.vercel.app | BBC headline scraping |

## ✨ Features

- **Dashboard**: National trends, interactive India map (Leaflet), top states, pie charts, safety leaderboard
- **ML Prediction**: Random Forest + Linear Regression dual-model forecasting
- **State Comparison**: Side-by-side analysis of any two states
- **Deep State Analysis**: Per-state profile with growth rates and RF predictions
- **Live Crime News Feed**: Real-time aggregated news from 4 sources with auto-refresh
- **Crime Reporting**: Authenticated complaint filing system (MongoDB)
- **Data Export**: Download state/national data as CSV
- **Premium UI**: Glassmorphism dark-mode design with Chart.js 4 and Leaflet

## 🚀 Setup

### Prerequisites
- Node.js v18+
- Python 3.9+
- MongoDB (local or Atlas)

### 1. Train ML Models
```bash
cd analysis
pip install -r requirements.txt
python train_models.py
```

### 2. Start Flask ML Server
```bash
cd analysis
python app.py
# Runs on http://localhost:5001
```

### 3. Start Node.js Server
```bash
cd server
npm install
npm run start
# Runs on http://localhost:5005
```

### 4. Open Browser
```
http://localhost:5005
```

## 📊 API Endpoints

### Data APIs
- `GET /api/national-trends` — National IPC/SLL totals
- `GET /api/state-analysis/:name` — State-wise breakdown
- `GET /api/live-news` — Aggregated crime news (JSON)
- `GET /api/export/csv?state=Maharashtra` — CSV download

### ML APIs (via Flask proxy)
- `GET /api/ml/predict/:state?type=ipc&model=rf` — RF prediction
- `GET /api/ml/clusters` — K-Means hotspot clusters
- `GET /api/ml/safety-scores` — Safety score leaderboard
- `GET /api/ml/compare?state1=X&state2=Y` — State comparison

## 📁 Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/crimeDB
JWT_SECRET=your_secret
PORT=5005
FLASK_SERVER=http://localhost:5001
GNEWS_API_KEY=your_key
NEWSDATA_API_KEY=your_key
NEWSAPI_KEY=your_key
BBC_NEWS_API=https://bbc-news-api.vercel.app
```

## 🛡️ Tech Stack

- **Backend**: Node.js, Express, Mongoose, JWT
- **ML Engine**: Python, Flask, scikit-learn, NumPy, Pandas, joblib
- **Frontend**: EJS, Chart.js 4, Leaflet.js, Bootstrap 5.3, Font Awesome 6
- **Database**: MongoDB
- **APIs**: GNews, NewsData.io, NewsAPI.org, BBC News API

---

© 2026 MCA Project — Crime Analysis and Utilizing Machine Learning and Flask Framework
