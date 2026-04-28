import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# ========= PATHS =========
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# ========= 1. SYNTHETIC NLP DATASET =========
print("📝 Generating synthetic citizen complaint dataset for NLP Training...")
mock_data = [
    # --- CRITICAL (Immediate physical danger, active crimes) ---
    ("There is a man with a knife attacking people outside the bakery, please hurry!", "Assault", "CRITICAL"),
    ("My neighbor is being beaten violently, I can hear screaming and breaking glass.", "Assault", "CRITICAL"),
    ("Armed robbers just broke into the bank and are holding hostages.", "Theft", "CRITICAL"),
    ("A child was just dragged into a black van by two men, license plate XYZ-123.", "Kidnapping", "CRITICAL"),
    ("I just heard multiple gunshots in the alleyway and someone is bleeding.", "Murder", "CRITICAL"),
    ("Someone is trying to break down my front door with an axe!", "Assault", "CRITICAL"),
    ("There is a massive riot starting in the town square, they are burning vehicles.", "Public Disturbance", "CRITICAL"),
    ("A woman was just stabbed on the subway, suspect fled towards the exit.", "Assault", "CRITICAL"),
    ("We are trapped in the building and an armed shooter is walking the halls.", "Murder", "CRITICAL"),
    ("Active kidnapping in progress, my daughter was snatched away from the playground.", "Kidnapping", "CRITICAL"),
    
    # --- HIGH (Recent severe crimes, high monetary loss, potential escalation) ---
    ("My house was completely cleaned out and robbed while we were on vacation.", "Theft", "HIGH"),
    ("A group of men are acting very suspiciously outside the jewelry store.", "Theft", "HIGH"),
    ("Someone stole my car from the driveway ten minutes ago, it's a red Honda.", "Theft", "HIGH"),
    ("I was mugged at gunpoint on my way home from work.", "Theft", "HIGH"),
    ("My coworker physically attacked me and gave me a black eye.", "Assault", "HIGH"),
    ("A massive fight broke out at the bar, multiple people throwing bottles.", "Public Disturbance", "HIGH"),
    ("A cyber gang just locked the entire hospital IT network with ransomware.", "Cybercrime", "HIGH"),
    ("My husband is missing for 48 hours and his phone is disconnected.", "Kidnapping", "HIGH"),
    ("Someone hit my car and drove away extremely fast, possibly drunk.", "Assault", "HIGH"),
    ("My son is being cyber-bullied and they are threatening to come to our home.", "Cybercrime", "HIGH"),
    
    # --- MEDIUM (Financial loss, non-active, moderate damage) ---
    ("I accidentally gave my social security number to a scam caller and they stole $500.", "Fraud", "MEDIUM"),
    ("Someone broke my car window overnight and stole my laptop from the backseat.", "Theft", "MEDIUM"),
    ("A sketchy website charged my credit card $2000 without my permission.", "Cybercrime", "MEDIUM"),
    ("Kids threw rocks at my house and shattered the front living room window.", "Vandalism", "MEDIUM"),
    ("I transferred money for an online marketplace item and the seller disappeared.", "Fraud", "MEDIUM"),
    ("My identity was stolen and someone opened three credit cards in my name.", "Fraud", "MEDIUM"),
    ("People are repeatedly dumping toxic waste in the empty lot behind my business.", "Vandalism", "MEDIUM"),
    ("Someone spray painted graffiti all over my newly painted storefront.", "Vandalism", "MEDIUM"),
    ("My neighbor is playing music incredibly loud and refuses to turn it down.", "Public Disturbance", "MEDIUM"),
    ("There are a group of teenagers loitering and smoking illegal substances in the park.", "Public Disturbance", "MEDIUM"),

    # --- LOW (Minor incidents, non-emergencies) ---
    ("Someone stole a package off my front porch yesterday afternoon.", "Theft", "LOW"),
    ("My bicycle was taken from outside the library, I had it chained up.", "Theft", "LOW"),
    ("I got a phishing email trying to get my bank password, I just deleted it.", "Cybercrime", "LOW"),
    ("Someone keeps kicking my garbage cans over every single night.", "Vandalism", "LOW"),
    ("A homeless man is sleeping on the bench in the park.", "Public Disturbance", "LOW"),
    ("My neighbor's dog barks constantly all day and it's annoying.", "Public Disturbance", "LOW"),
    ("I lost my wallet at the mall, I think it might have been pickpocketed.", "Theft", "LOW"),
    ("A scammer called me claiming to be the IRS but I hung up quickly.", "Fraud", "LOW"),
    ("Some plants were uprooted from my flower garden last night.", "Vandalism", "LOW"),
    ("Someone scratched my car door in the parking lot grocery store.", "Vandalism", "LOW")
]

# We artificially duplicate and augment the dataset heavily to give the ML enough corpus to train TF-IDF weights on words like "gun", "stole", "screaming"
augmented_data = []
for _ in range(15):  # multiply dataset size
    augmented_data.extend(mock_data)

df = pd.DataFrame(augmented_data, columns=['text', 'category', 'priority'])
X = df['text']
y_cat = df['category']
y_pri = df['priority']

# ========= 2. TRAIN NLP MODELS =========
print("\n🧠 Training Machine Learning NLP Engines (TF-IDF + Naive Bayes)...")

# Train Category Predictor
cat_pipeline = make_pipeline(TfidfVectorizer(stop_words='english', ngram_range=(1, 2)), MultinomialNB(alpha=0.1))
cat_pipeline.fit(X, y_cat)

# Train Priority Predictor
pri_pipeline = make_pipeline(TfidfVectorizer(stop_words='english', ngram_range=(1, 2)), MultinomialNB(alpha=0.1))
pri_pipeline.fit(X, y_pri)

# Model Testing printout
X_sample = ["A man with a gun is breaking into the store!", "Someone stole my Amazon package.", "Drunk guys fighting outside."]
print("\n🧪 Testing NLP Triage inference on unseen texts:")
for text in X_sample:
    pred_cat = cat_pipeline.predict([text])[0]
    pred_pri = pri_pipeline.predict([text])[0]
    print(f"  Text: '{text}'")
    print(f"  AI Triaged ➔ [Category: {pred_cat}] | [Priority: {pred_pri}]\n")

# ========= 3. SAVE MODELS =========
joblib.dump(cat_pipeline, os.path.join(MODEL_DIR, 'nlp_category_model.pkl'))
joblib.dump(pri_pipeline, os.path.join(MODEL_DIR, 'nlp_priority_model.pkl'))

print("✅ NLP Dispatch Classifier pipelines successfully trained and saved!")
