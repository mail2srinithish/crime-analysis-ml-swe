"""
Flask ML API Server — Crime Analysis Engine
=============================================
Serves trained ML models (Random Forest, K-Means) via REST API.
This is the "Flask Framework" component of the project title:
"Crime Analysis and Utilizing Machine Learning and Flask Framework"
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import helper

app = Flask(__name__)
CORS(app)

# ========= STATUS =========
@app.route("/")
def home():
    return jsonify({
        "status": "online",
        "service": "Indian Crime Analysis ML Engine (Flask + scikit-learn)",
        "ml_models": ["Random Forest Regressor", "K-Means Clustering", "Safety Score Index"],
        "endpoints": {
            "data": [
                "GET /api/national-trends",
                "GET /api/state-analysis/<state_name>",
            ],
            "ml_prediction": [
                "GET /api/ml/predict/<state_name>?type=ipc&model=rf",
                "GET /api/ml/predict/<state_name>?type=ipc&model=linear",
            ],
            "ml_analysis": [
                "GET /api/ml/clusters",
                "GET /api/ml/safety-scores",
                "GET /api/ml/compare?state1=X&state2=Y",
            ]
        }
    })

# ========= DATA ENDPOINTS =========
@app.route("/api/national-trends")
def national_trends():
    return jsonify(helper.get_national_trends())

@app.route("/api/state-analysis/<state_name>")
def state_analysis(state_name):
    data = helper.get_state_analysis(state_name)
    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)

# ========= ML PREDICTION =========
@app.route("/api/ml/predict/<state_name>")
def ml_predict(state_name):
    crime_type = request.args.get('type', 'ipc').lower()
    model_type = request.args.get('model', 'rf').lower()
    forecast_years = int(request.args.get('years', 5))
    
    if model_type == 'rf':
        data = helper.predict_rf(state_name, crime_type, forecast_years)
    else:
        data = helper.predict_linear(state_name, crime_type, forecast_years)
    
    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)

# ========= ML CLUSTERING =========
@app.route("/api/ml/clusters")
def ml_clusters():
    data = helper.get_crime_clusters()
    return jsonify(data)

# ========= SAFETY SCORES =========
@app.route("/api/ml/safety-scores")
def ml_safety_scores():
    scores = helper.get_safety_scores()
    if scores is None:
        return jsonify({"error": "Safety scores not computed. Run train_models.py first."}), 500
    return jsonify(scores)

# ========= NLP CLASSIFICATION =========
@app.route("/api/ml/classify-complaint", methods=["POST"])
def ml_classify_complaint():
    req_data = request.get_json() or {}
    text = req_data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    result = helper.classify_complaint_text(text)
    return jsonify(result)

# ========= DISTRICT HOTSPOTS =========
@app.route("/api/ml/districts")
def ml_districts():
    data = helper.get_district_hotspots()
    return jsonify(data)

# ========= STATE COMPARISON =========
@app.route("/api/ml/compare")
def ml_compare():
    state1 = request.args.get('state1', '')
    state2 = request.args.get('state2', '')
    if not state1 or not state2:
        return jsonify({"error": "Both state1 and state2 parameters are required"}), 400
    data = helper.compare_states(state1, state2)
    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)

# ========= START =========
if __name__ == "__main__":
    print("=" * 50)
    print("  🧠 Crime Analysis ML Engine (Flask)")
    print("  Models: Random Forest, K-Means, Safety Score")
    print("=" * 50)
    app.run(port=5001, debug=True)