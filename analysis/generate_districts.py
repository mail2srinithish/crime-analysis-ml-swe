import json
import os
import random

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'shared')

with open(os.path.join(DATA_DIR, 'ipc.json'), 'r') as f:
    ipc_state = json.load(f)

with open(os.path.join(DATA_DIR, 'sll.json'), 'r') as f:
    sll_state = json.load(f)

# Major Indian States and their Top Districts with synthetic crime load percentages
STATE_DISTRICTS = {
    "Maharashtra": [("Mumbai", 0.25), ("Pune", 0.20), ("Thane", 0.15), ("Nagpur", 0.12), ("Nashik", 0.10), ("Aurangabad", 0.08), ("Solapur", 0.05), ("Amravati", 0.05)],
    "Tamil Nadu": [("Chennai", 0.30), ("Coimbatore", 0.15), ("Madurai", 0.12), ("Salem", 0.10), ("Tiruchirappalli", 0.10), ("Vellore", 0.08), ("Erode", 0.08), ("Tirunelveli", 0.07)],
    "Uttar Pradesh": [("Lucknow", 0.18), ("Kanpur", 0.15), ("Ghaziabad", 0.15), ("Agra", 0.12), ("Varanasi", 0.10), ("Meerut", 0.10), ("Prayagraj", 0.10), ("Bareilly", 0.10)],
    "Gujarat": [("Ahmedabad", 0.30), ("Surat", 0.25), ("Vadodara", 0.15), ("Rajkot", 0.12), ("Bhavnagar", 0.08), ("Jamnagar", 0.05), ("Gandhinagar", 0.05)],
    "Karnataka": [("Bengaluru", 0.40), ("Mysuru", 0.15), ("Mangaluru", 0.10), ("Hubballi", 0.10), ("Belagavi", 0.10), ("Kalaburagi", 0.08), ("Davanagere", 0.07)],
    "Kerala": [("Thiruvananthapuram", 0.20), ("Kochi", 0.25), ("Kozhikode", 0.15), ("Thrissur", 0.15), ("Kollam", 0.10), ("Kannur", 0.08), ("Alappuzha", 0.07)],
    "Delhi": [("Central Delhi", 0.25), ("South Delhi", 0.20), ("New Delhi", 0.15), ("North Delhi", 0.15), ("West Delhi", 0.10), ("East Delhi", 0.10), ("Shahdara", 0.05)],
    "Madhya Pradesh": [("Indore", 0.25), ("Bhopal", 0.20), ("Jabalpur", 0.15), ("Gwalior", 0.15), ("Ujjain", 0.10), ("Sagar", 0.08), ("Rewa", 0.07)],
    "Bihar": [("Patna", 0.25), ("Gaya", 0.15), ("Bhagalpur", 0.15), ("Muzaffarpur", 0.12), ("Purnia", 0.10), ("Darbhanga", 0.10), ("Bihar Sharif", 0.08), ("Arrah", 0.05)],
    "Rajasthan": [("Jaipur", 0.25), ("Jodhpur", 0.20), ("Kota", 0.15), ("Bikaner", 0.12), ("Ajmer", 0.10), ("Udaipur", 0.10), ("Bhilwara", 0.08)],
    "Telangana": [("Hyderabad", 0.45), ("Warangal", 0.15), ("Nizamabad", 0.10), ("Karimnagar", 0.10), ("Ramagundam", 0.10), ("Khammam", 0.10)],
    "Andhra Pradesh": [("Visakhapatnam", 0.25), ("Vijayawada", 0.20), ("Guntur", 0.15), ("Nellore", 0.15), ("Kurnool", 0.10), ("Rajamahendravaram", 0.08), ("Tirupati", 0.07)]
}

def generate_district_data(state_data_list):
    district_data = []
    
    for state_record in state_data_list:
        state_name = state_record["State"]
        # If we have district distributions for this state
        if state_name in STATE_DISTRICTS:
            districts = STATE_DISTRICTS[state_name]
            
            for dist_name, dist_ratio in districts:
                # generate historical data matching this ratio with slight uniform noise (+/- 2%)
                dist_reports = []
                for val in state_record["reports"]:
                    noise = random.uniform(-0.02, 0.02)
                    assigned_val = max(0, int(val * (dist_ratio + noise)))
                    dist_reports.append(assigned_val)
                    
                district_data.append({
                    "State": state_name,
                    "District": dist_name,
                    "reports": dist_reports
                })
    return district_data

district_ipc = generate_district_data(ipc_state)
district_sll = generate_district_data(sll_state)

with open(os.path.join(DATA_DIR, 'district_ipc.json'), 'w') as f:
    json.dump(district_ipc, f, indent=2)

with open(os.path.join(DATA_DIR, 'district_sll.json'), 'w') as f:
    json.dump(district_sll, f, indent=2)

print(f"✅ Generated synthetic dataset for {len(district_ipc)} specific Micro-Districts across {len(STATE_DISTRICTS)} major States.")
