"""
train_models.py — Crime Analysis ML Model Training Script
==========================================================
Trains the following ML models on Indian IPC/SLL crime data:
1. Random Forest Regressor — for crime count prediction per state
2. K-Means Clustering — for crime hotspot classification
3. Safety Score — composite crime index per state

Models are saved to analysis/models/ via joblib for loading by Flask.
"""
import json
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import joblib

# ========= PATHS =========
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'shared')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# ========= LOAD DATA =========
def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), 'r') as f:
        return json.load(f)

ipc_data = load_json('ipc.json')
sll_data = load_json('sll.json')

YEARS = list(range(2003, 2027))  # 24 years

print("=" * 60)
print("  CRIME ANALYSIS ML — MODEL TRAINING")
print("=" * 60)

# ========= 1. BUILD DATAFRAME =========
print("\n📊 Building dataset...")

rows = []
for state_ipc in ipc_data:
    state_name = state_ipc['State']
    state_sll = next((s for s in sll_data if s['State'] == state_name), None)
    sll_reports = state_sll['reports'] if state_sll else [0] * len(YEARS)
    
    for i, year in enumerate(YEARS):
        if i < len(state_ipc['reports']):
            ipc_val = state_ipc['reports'][i]
            sll_val = sll_reports[i] if i < len(sll_reports) else 0
            
            # Feature engineering
            growth_rate = 0
            if i > 0 and state_ipc['reports'][i-1] > 0:
                growth_rate = (ipc_val - state_ipc['reports'][i-1]) / state_ipc['reports'][i-1]
            
            avg_3yr = ipc_val
            if i >= 2:
                avg_3yr = np.mean(state_ipc['reports'][max(0,i-2):i+1])
            
            rows.append({
                'state': state_name,
                'year': year,
                'year_index': i,
                'ipc_crimes': ipc_val,
                'sll_crimes': sll_val,
                'total_crimes': ipc_val + sll_val,
                'growth_rate': growth_rate,
                'avg_3yr_ipc': avg_3yr,
                'ipc_sll_ratio': ipc_val / max(sll_val, 1),
            })

df = pd.DataFrame(rows)
print(f"   Dataset: {len(df)} rows × {len(df.columns)} columns")
print(f"   States: {df['state'].nunique()}")
print(f"   Years: {df['year'].min()} – {df['year'].max()}")

# ========= 2. RANDOM FOREST REGRESSOR (IPC Prediction) =========
print("\n🌲 Training Random Forest Regressor for IPC prediction...")

# Features: year_index, growth_rate, avg_3yr_ipc, sll_crimes, ipc_sll_ratio
feature_cols = ['year_index', 'growth_rate', 'avg_3yr_ipc', 'sll_crimes', 'ipc_sll_ratio']

# Train a model per state for better accuracy
state_models = {}
for state_name in df['state'].unique():
    state_df = df[df['state'] == state_name].copy()
    
    if len(state_df) < 5:
        continue
    
    X = state_df[feature_cols].values
    y = state_df['ipc_crimes'].values
    
    rf = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=6)
    rf.fit(X, y)
    state_models[state_name] = rf

# Save all state models
joblib.dump(state_models, os.path.join(MODEL_DIR, 'rf_state_models.pkl'))
print(f"   ✅ Trained {len(state_models)} state-level Random Forest models")
print(f"   Saved to: models/rf_state_models.pkl")

# Also train a global model
X_global = df[feature_cols].values
y_global = df['ipc_crimes'].values
rf_global = RandomForestRegressor(n_estimators=150, random_state=42, max_depth=8)
rf_global.fit(X_global, y_global)
joblib.dump(rf_global, os.path.join(MODEL_DIR, 'rf_global.pkl'))
print(f"   ✅ Global Random Forest model trained and saved")

# ========= 3. K-MEANS CLUSTERING (Crime Hotspots) =========
print("\n📍 Training K-Means Clustering for hotspot analysis...")

# Aggregate latest year data per state
latest_year = df['year'].max()
latest_df = df[df['year'] == latest_year].copy()

cluster_features = ['ipc_crimes', 'sll_crimes', 'total_crimes', 'growth_rate', 'ipc_sll_ratio']
X_cluster = latest_df[cluster_features].values

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_cluster)

# K-Means with 5 clusters (Very Low → Very High crime)
kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
kmeans.fit(X_scaled)
latest_df = latest_df.copy()
latest_df['cluster'] = kmeans.labels_

# Sort clusters by total crimes (ascending) so label 0 = safest
cluster_order = latest_df.groupby('cluster')['total_crimes'].mean().sort_values().index.tolist()
cluster_map = {old: new for new, old in enumerate(cluster_order)}
latest_df['risk_level'] = latest_df['cluster'].map(cluster_map)

risk_labels = {0: 'Very Low', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High'}
latest_df['risk_label'] = latest_df['risk_level'].map(risk_labels)

# Save KMeans model + scaler
joblib.dump(kmeans, os.path.join(MODEL_DIR, 'kmeans_hotspot.pkl'))
joblib.dump(scaler, os.path.join(MODEL_DIR, 'kmeans_scaler.pkl'))
joblib.dump(cluster_map, os.path.join(MODEL_DIR, 'cluster_map.pkl'))

print(f"   ✅ K-Means model trained (5 clusters)")
print(f"   Cluster distribution:")
for level in sorted(latest_df['risk_level'].unique()):
    label = risk_labels[level]
    states = latest_df[latest_df['risk_level'] == level]['state'].tolist()
    print(f"     {label}: {', '.join(states[:5])}{'...' if len(states) > 5 else ''}")

# ========= 4. SAFETY SCORE CALCULATION =========
print("\n🛡️  Computing Crime Safety Scores...")

# Approximate populations (million) for normalization
state_populations = {
    'Uttar Pradesh': 240, 'Maharashtra': 130, 'Bihar': 130, 'West Bengal': 100,
    'Madhya Pradesh': 85, 'Tamil Nadu': 80, 'Rajasthan': 80, 'Karnataka': 70,
    'Gujarat': 70, 'Andhra Pradesh': 53, 'Odisha': 47, 'Telangana': 40,
    'Kerala': 36, 'Jharkhand': 40, 'Assam': 36, 'Punjab': 31, 'Chhattisgarh': 30,
    'Haryana': 30, 'Delhi': 20, 'Jammu and Kashmir': 14, 'Uttarakhand': 12,
    'Himachal Pradesh': 7.5, 'Tripura': 4.2, 'Meghalaya': 3.8, 'Manipur': 3.1,
    'Nagaland': 2.3, 'Mizoram': 1.3, 'Arunachal Pradesh': 1.7, 'Goa': 1.6,
    'Sikkim': 0.7, 'Chandigarh': 1.2, 'Puducherry': 1.7,
    'Andaman & Nicobar Islands': 0.4, 'Andaman and Nicobar Islands': 0.4,
    'Dadra and Nagar Haveli': 0.6, 'Daman and Diu': 0.3,
    'Lakshadweep': 0.07, 'Ladakh': 0.3,
    'Dadra and Nagar Haveli and Daman and Diu': 0.9,
}

safety_scores = []
for _, row in latest_df.iterrows():
    pop = state_populations.get(row['state'], 10)  # default 10M
    crimes_per_lakh = (row['total_crimes'] / (pop * 10))  # per lakh population
    
    # Higher crimes_per_lakh = lower safety (invert to 0-100)
    # growth_rate penalty
    growth_penalty = max(0, row['growth_rate'] * 20)
    
    raw_score = max(0, 100 - crimes_per_lakh - growth_penalty)
    safety_scores.append({
        'state': row['state'],
        'safety_score': round(min(100, max(0, raw_score)), 1),
        'crimes_per_lakh': round(crimes_per_lakh, 1),
        'total_crimes': int(row['total_crimes']),
        'risk_level': int(row['risk_level']),
        'risk_label': row['risk_label'],
        'growth_rate': round(row['growth_rate'] * 100, 1),
    })

safety_df = pd.DataFrame(safety_scores).sort_values('safety_score', ascending=False)

# Save safety scores
safety_dict = safety_df.to_dict('records')
joblib.dump(safety_dict, os.path.join(MODEL_DIR, 'safety_scores.pkl'))

print(f"   ✅ Safety scores computed for {len(safety_dict)} states")
print(f"\n   🏆 Top 5 Safest:")
for i, row in enumerate(safety_df.head().itertuples()):
    print(f"     {i+1}. {row.state}: {row.safety_score}/100")
print(f"\n   ⚠️  Top 5 Most Dangerous:")
for i, row in enumerate(safety_df.tail().itertuples()):
    print(f"     {i+1}. {row.state}: {row.safety_score}/100")

# ========= 5. SAVE FULL DATAFRAME =========
df.to_csv(os.path.join(MODEL_DIR, 'crime_dataset.csv'), index=False)
print(f"\n📁 Full dataset saved to: models/crime_dataset.csv")

# ========= DONE =========
print("\n" + "=" * 60)
print("  ✅ ALL MODELS TRAINED SUCCESSFULLY!")
print("=" * 60)
print(f"\n  Files in models/:")
for f in os.listdir(MODEL_DIR):
    size = os.path.getsize(os.path.join(MODEL_DIR, f))
    print(f"    📦 {f} ({size:,} bytes)")
print(f"\n  Run 'py app.py' to start the Flask ML server.")
