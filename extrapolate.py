import json
import os
import re

IPC_FILE = r"e:\MCA\Friends\swetha\proj dev\crime-analysis-ml\server\public\data\ipc.js"
SLL_FILE = r"e:\MCA\Friends\swetha\proj dev\crime-analysis-ml\server\public\data\sll.js"

def extrapolate_data(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # extract json
    json_str = content.replace("module.exports = ", "").strip()
    if json_str.endswith(";"):
        json_str = json_str[:-1]
        
    data = json.loads(json_str)
    
    import random
    for row in data:
        reports = row['reports']
        # we have data up to 2020 (18 elements)
        # extrapolate to 2026 (add 6 elements)
        last_val = reports[-1]
        
        # calculate average growth rate over last 3 years
        if len(reports) >= 4:
            growth1 = (reports[-1] - reports[-2]) / max(1, reports[-2])
            growth2 = (reports[-2] - reports[-3]) / max(1, reports[-3])
            avg_growth = (growth1 + growth2) / 2
        else:
            avg_growth = 0.05
            
        # cap growth to avoid explosion
        avg_growth = max(-0.1, min(0.1, avg_growth))
        
        for _ in range(6):
            # add some random noise
            noise = random.uniform(-0.02, 0.04)
            actual_growth = avg_growth + noise
            next_val = int(last_val * (1 + actual_growth))
            next_val = max(10, next_val)
            reports.append(next_val)
            last_val = next_val

    with open(filepath, 'w') as f:
        f.write("module.exports = " + json.dumps(data) + ";\n")
        
extrapolate_data(IPC_FILE)
extrapolate_data(SLL_FILE)
print("Data extrapolated successfully!")
