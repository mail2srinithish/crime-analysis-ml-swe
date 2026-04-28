import json
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'shared')
MODEL_DIR = os.path.join(BASE_DIR, 'models')

print("=" * 60)
print("  DISTRICT-LEVEL MICRO HOTSPOT TRAINING")
print("=" * 60)

with open(os.path.join(DATA_DIR, 'district_ipc.json'), 'r') as f:
    ipc_data = json.load(f)
with open(os.path.join(DATA_DIR, 'district_sll.json'), 'r') as f:
    sll_data = json.load(f)

YEARS = list(range(2003, 2027))

rows = []
for state_ipc in ipc_data:
    state_name = state_ipc['State']
    dist_name = state_ipc['District']
    state_sll = next((s for s in sll_data if s['District'] == dist_name and s['State'] == state_name), None)
    sll_reports = state_sll['reports'] if state_sll else [0] * len(YEARS)
    
    for i, year in enumerate(YEARS):
        if i < len(state_ipc['reports']):
            ipc_val = state_ipc['reports'][i]
            sll_val = sll_reports[i] if i < len(sll_reports) else 0
            
            rows.append({
                'state': state_name,
                'district': dist_name,
                'year': year,
                'ipc_crimes': ipc_val,
                'sll_crimes': sll_val,
                'total_crimes': ipc_val + sll_val
            })

df = pd.DataFrame(rows)

# ========= 1. DISTRICT K-MEANS HOTSPOTS =========
latest_year = df['year'].max()
latest_df = df[df['year'] == latest_year].copy()
X_cluster = latest_df[['ipc_crimes', 'sll_crimes', 'total_crimes']].values

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_cluster)
kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
kmeans.fit(X_scaled)
latest_df['cluster'] = kmeans.labels_

cluster_order = latest_df.groupby('cluster')['total_crimes'].mean().sort_values().index.tolist()
cluster_map = {old: new for new, old in enumerate(cluster_order)}
latest_df['risk_level'] = latest_df['cluster'].map(cluster_map)

risk_labels = {0: 'Very Low', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High'}
latest_df['risk_label'] = latest_df['risk_level'].map(risk_labels)

joblib.dump(kmeans, os.path.join(MODEL_DIR, 'kmeans_district.pkl'))
joblib.dump(scaler, os.path.join(MODEL_DIR, 'kmeans_district_scaler.pkl'))

# Save the final district heatmap data
district_hotspots = latest_df.to_dict('records')
joblib.dump(district_hotspots, os.path.join(MODEL_DIR, 'district_hotspots.pkl'))
print(f"✅ District Hotplots mapped for {len(district_hotspots)} localized zones.")

print("District Analytics models successful!")
