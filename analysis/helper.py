"""
helper.py — ML-powered Crime Analysis Functions
=================================================
Uses trained scikit-learn models for:
- Random Forest prediction (per-state + global)
- K-Means hotspot clustering
- Safety score computation
"""
import json
import os
import numpy as np
import joblib

# ========= PATHS =========
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'shared')
MODEL_DIR = os.path.join(BASE_DIR, 'models')

# ========= LOAD DATA =========
def load_data(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'r') as f:
        return json.load(f)

def get_ipc_data():
    return load_data('ipc.json')

def get_sll_data():
    return load_data('sll.json')

# ========= LOAD ML MODELS =========
_models_cache = {}

def _load_model(name):
    if name not in _models_cache:
        path = os.path.join(MODEL_DIR, name)
        if os.path.exists(path):
            _models_cache[name] = joblib.load(path)
        else:
            _models_cache[name] = None
    return _models_cache[name]

def get_state_models():
    return _load_model('rf_state_models.pkl')

def get_global_model():
    return _load_model('rf_global.pkl')

def get_kmeans_model():
    return _load_model('kmeans_hotspot.pkl')

def get_kmeans_scaler():
    return _load_model('kmeans_scaler.pkl')

def get_cluster_map():
    return _load_model('cluster_map.pkl')

def get_safety_scores():
    return _load_model('safety_scores.pkl')

# ========= NLP MODELS =========
def get_nlp_category_model():
    return _load_model('nlp_category_model.pkl')

def get_nlp_priority_model():
    return _load_model('nlp_priority_model.pkl')

def get_district_hotspots():
    return _load_model('district_hotspots.pkl')

def classify_complaint_text(text):
    cat_model = get_nlp_category_model()
    pri_model = get_nlp_priority_model()
    
    if not cat_model or not pri_model:
        return {"category": "Unknown", "priority": "MEDIUM", "error": "NLP models not trained"}
        
    try:
        predicted_cat = cat_model.predict([text])[0]
        predicted_pri = pri_model.predict([text])[0]
        return {
            "category": predicted_cat,
            "priority": predicted_pri
        }
    except Exception as e:
        return {"category": "Unknown", "priority": "MEDIUM", "error": str(e)}

# ========= NATIONAL TRENDS =========
def get_national_trends():
    ipc = get_ipc_data()
    sll = get_sll_data()
    years = [str(y) for y in range(2003, 2021)]
    national_ipc = [0] * len(years)
    national_sll = [0] * len(years)
    for state in ipc:
        for i, count in enumerate(state['reports']):
            if i < len(national_ipc):
                national_ipc[i] += count
    for state in sll:
        for i, count in enumerate(state['reports']):
            if i < len(national_sll):
                national_sll[i] += count
    return {"years": years, "ipc": national_ipc, "sll": national_sll}

# ========= STATE ANALYSIS =========
def get_state_analysis(state_name):
    ipc = get_ipc_data()
    sll = get_sll_data()
    state_ipc = next((s for s in ipc if s['State'].lower() == state_name.lower()), None)
    state_sll = next((s for s in sll if s['State'].lower() == state_name.lower()), None)
    if not state_ipc:
        return {"error": "State not found"}
    years = [str(y) for y in range(2003, 2021)]
    return {
        "state": state_ipc['State'],
        "years": years,
        "ipc": state_ipc['reports'],
        "sll": state_sll['reports'] if state_sll else [0] * len(years)
    }

# ========= RANDOM FOREST PREDICTION =========
def predict_rf(state_name, crime_type='ipc', forecast_years=5):
    """Use Random Forest model for crime prediction."""
    data = get_ipc_data() if crime_type == 'ipc' else get_sll_data()
    state_data = next((s for s in data if s['State'].lower() == state_name.lower()), None)
    if not state_data:
        return {"error": "State not found"}
    
    reports = state_data['reports']
    state_models = get_state_models()
    
    # Try state-specific model first, fall back to global
    model = None
    if state_models and state_data['State'] in state_models:
        model = state_models[state_data['State']]
    else:
        model = get_global_model()
    
    if model is None:
        return {"error": "ML models not trained. Run train_models.py first."}
    
    predictions = []
    pred_years = []
    
    # Build features for future years
    for i in range(forecast_years):
        year_idx = len(reports) + i
        
        # Use last known values for feature engineering
        last_val = reports[-1] if i == 0 else predictions[-1]
        prev_val = reports[-2] if i == 0 else (reports[-1] if i == 1 else predictions[-2])
        growth = (last_val - prev_val) / max(prev_val, 1)
        
        if i == 0:
            avg_3yr = np.mean(reports[-3:])
        elif i == 1:
            avg_3yr = np.mean([reports[-2], reports[-1], predictions[0]])
        else:
            avg_3yr = np.mean(predictions[max(0, i-3):i])
        
        sll_data_list = get_sll_data() if crime_type == 'ipc' else get_ipc_data()
        sll_state = next((s for s in sll_data_list if s['State'].lower() == state_name.lower()), None)
        sll_val = sll_state['reports'][-1] if sll_state else 0
        ratio = last_val / max(sll_val, 1)
        
        features = np.array([[year_idx, growth, avg_3yr, sll_val, ratio]])
        pred = max(0, int(model.predict(features)[0]))
        predictions.append(pred)
        pred_years.append(str(2003 + year_idx))
    
    return {
        "state": state_data['State'],
        "model": "Random Forest Regressor",
        "historical_years": [str(y) for y in range(2003, 2003 + len(reports))],
        "historical_counts": reports,
        "future_years": pred_years,
        "predictions": predictions,
        "confidence": "High (state-specific model)" if state_data['State'] in (state_models or {}) else "Medium (global model)"
    }

# ========= LINEAR REGRESSION PREDICTION (FALLBACK) =========
def predict_linear(state_name, crime_type='ipc', forecast_years=5):
    """Simple linear regression fallback."""
    data = get_ipc_data() if crime_type == 'ipc' else get_sll_data()
    state_data = next((s for s in data if s['State'].lower() == state_name.lower()), None)
    if not state_data:
        return {"error": "State not found"}
    
    reports = state_data['reports']
    years = np.array(range(2003, 2003 + len(reports)))
    counts = np.array(reports)
    n = len(years)
    m = (n * np.sum(years * counts) - np.sum(years) * np.sum(counts)) / (n * np.sum(years**2) - (np.sum(years))**2)
    c = (np.sum(counts) - m * np.sum(years)) / n
    
    future_years = range(2003 + len(reports), 2003 + len(reports) + forecast_years)
    predictions = [max(0, int(m * year + c)) for year in future_years]
    
    return {
        "state": state_data['State'],
        "model": "Linear Regression",
        "historical_years": [str(y) for y in years],
        "historical_counts": reports,
        "future_years": [str(y) for y in future_years],
        "predictions": predictions,
        "confidence": "Low (linear model)"
    }

# ========= K-MEANS HOTSPOT CLUSTERS =========
def get_crime_clusters():
    """Get K-Means crime hotspot clusters for all states."""
    ipc = get_ipc_data()
    sll = get_sll_data()
    
    safety = get_safety_scores()
    if safety:
        return safety
    
    # Fallback: compute from data
    results = []
    risk_labels = {0: 'Very Low', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High'}
    
    for state_ipc in ipc:
        state_sll = next((s for s in sll if s['State'] == state_ipc['State']), None)
        ipc_val = state_ipc['reports'][-1]
        sll_val = state_sll['reports'][-1] if state_sll else 0
        total = ipc_val + sll_val
        
        # Simple threshold-based clustering
        if total > 500000: level = 4
        elif total > 200000: level = 3
        elif total > 100000: level = 2
        elif total > 50000: level = 1
        else: level = 0
        
        results.append({
            'state': state_ipc['State'],
            'total_crimes': total,
            'ipc_crimes': ipc_val,
            'sll_crimes': sll_val,
            'risk_level': level,
            'risk_label': risk_labels[level]
        })
    
    return sorted(results, key=lambda x: x['total_crimes'], reverse=True)

# ========= STATE COMPARISON =========
def compare_states(state1, state2):
    """Compare two states across all metrics."""
    ipc = get_ipc_data()
    sll = get_sll_data()
    safety = get_safety_scores() or []
    
    s1_ipc = next((s for s in ipc if s['State'].lower() == state1.lower()), None)
    s2_ipc = next((s for s in ipc if s['State'].lower() == state2.lower()), None)
    s1_sll = next((s for s in sll if s['State'].lower() == state1.lower()), None)
    s2_sll = next((s for s in sll if s['State'].lower() == state2.lower()), None)
    
    if not s1_ipc or not s2_ipc:
        return {"error": "One or both states not found"}
    
    s1_safety = next((s for s in safety if s['state'].lower() == state1.lower()), {})
    s2_safety = next((s for s in safety if s['state'].lower() == state2.lower()), {})
    
    years = [str(y) for y in range(2003, 2021)]
    
    return {
        "years": years,
        "state1": {
            "name": s1_ipc['State'],
            "ipc": s1_ipc['reports'],
            "sll": s1_sll['reports'] if s1_sll else [0] * 18,
            "safety_score": s1_safety.get('safety_score', 'N/A'),
            "risk_label": s1_safety.get('risk_label', 'N/A'),
        },
        "state2": {
            "name": s2_ipc['State'],
            "ipc": s2_ipc['reports'],
            "sll": s2_sll['reports'] if s2_sll else [0] * 18,
            "safety_score": s2_safety.get('safety_score', 'N/A'),
            "risk_label": s2_safety.get('risk_label', 'N/A'),
        }
    }
