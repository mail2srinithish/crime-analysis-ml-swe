# 📊 Module-Wise Data Flow Diagrams (DFD)

This document contains specialized Level 1/Level 2 Data Flow Diagrams representing the isolated data processing architecture for every individual module within the Crime Analysis ML System.

> **Update:** Aligned the structural geometry perfectly to match the sample diagrams (Horizontal and Vertical tree branching with top-down flow). Implemented bulletproof Wikipedia & Devicon raw SVGs for all database, UI, and user entities to guarantee they render securely in all markdown viewers. Custom color themes (Orange Actors, Blue Processes, Green Databases) have been added to match the visual standard.

---

## 1. Authentication & User Management Module
This module handles secure access, distinguishing between public citizens and police administrators.

```mermaid
flowchart TD
    classDef sys fill:#ffe0b2,stroke:#f57c00,stroke-width:2px,color:#000;
    classDef db fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#000;
    classDef process fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000;

    U["<img src='https://upload.wikimedia.org/wikipedia/commons/e/e0/Userinfo.svg' width='40' /><br/><b>User / Admin</b>"]:::sys
    
    P1(("<b>1.1</b><br/>Receive Registration")):::process
    P2(("<b>1.2</b><br/>Verify Credentials")):::process
    P3(("<b>1.3</b><br/>Hash & Validate")):::process
    P4(("<b>1.4</b><br/>Generate Tokens")):::process
    
    DB[("<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg' width='40' /><br/><b>Users Collection</b><br/>(MongoDB)")]:::db

    U -- "Sign-up details" --> P1
    U -- "Login Request" --> P2
    
    P1 --> P3
    P3 -- "Save Encrypted Profile" --> DB
    
    P2 -- "Query DB" --> DB
    DB -- "Account Details Hash" --> P2
    
    P2 --> P4
    P4 -. "Returns JWT Access Token" .-> U
```

---

## 2. Complaint Reporting & Triage Module
This module is responsible for capturing public crime reports and predicting priority using NLP.

```mermaid
flowchart TD
    classDef sys fill:#ffe0b2,stroke:#f57c00,stroke-width:2px,color:#000;
    classDef db fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#000;
    classDef process fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000;

    U["<img src='https://upload.wikimedia.org/wikipedia/commons/e/e0/Userinfo.svg' width='40' /><br/><b>Public Citizen</b>"]:::sys
    A["<img src='https://upload.wikimedia.org/wikipedia/commons/5/5e/Police_badge_icon.svg' width='40' /><br/><b>Law Enforcement</b>"]:::sys

    P1(("<b>2.1</b><br/>Capture Complaint Info")):::process
    P2(("<b>2.3</b><br/>Retrieve Cases")):::process
    
    P3(("<b>2.2</b><br/>NLP Risk Triage")):::process
    P4(("<b>2.4</b><br/>Dashboard Rendering")):::process

    DB[("<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg' width='40' /><br/><b>Complaints DB</b><br/>(MongoDB)")]:::db

    U -- "Submit Crime Evidence" --> P1
    A -- "Request Case Queue" --> P2

    P1 -- "Raw Text Data" --> P3
    P3 -- "Save Structured Report" --> DB

    P2 -- "Fetch High-Risk" --> DB
    DB -- "Pending Cases" --> P2
    
    P2 --> P4
    P4 -. "Dashboard View" .-> A
```

---

## 3. Dashboard & Data Visualization Module
This module aggregates large JSON/CSV datasets and returns visual summaries for geographic plotting.

```mermaid
flowchart TD
    classDef sys fill:#ffe0b2,stroke:#f57c00,stroke-width:2px,color:#000;
    classDef db fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#000;
    classDef process fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000;

    U["<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg' width='40' /><br/><b>User Interface</b><br/>(EJS/React)"]:::sys

    P1(("<b>3.1</b><br/>Request State Trends")):::process
    P2(("<b>3.2</b><br/>Aggregate Data")):::process
    P3(("<b>3.3</b><br/>Database Query")):::process
    P4(("<b>3.4</b><br/>Format Geo-JSON")):::process

    DB[("<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/pandas/pandas-original.svg' width='40' /><br/><b>Historical Crime Data</b><br/>(CSV Datasets)")]:::db

    U -- "API Request" --> P1
    P1 --> P3
    P3 -- "Fetch IPC/SLL" --> DB
    
    DB -- "Decades of Records" --> P2
    P2 --> P4
    P4 -. "Map Chart Coordinates" .-> U
```

---

## 4. Machine Learning Engine Module
The core Python-based process using Scikit-Learn to forecast future trends based on existing statistical models.

```mermaid
flowchart TD
    classDef sys fill:#ffe0b2,stroke:#f57c00,stroke-width:2px,color:#000;
    classDef db fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#000;
    classDef process fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000;

    N["<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg' width='40' /><br/><b>Node.js Express Server</b>"]:::sys
    
    P1(("<b>4.1</b><br/>Receive Prediction Req")):::process
    P2(("<b>4.2</b><br/>Execute Random Forest")):::process
    P3(("<b>4.3</b><br/>Process K-Means")):::process
    P4(("<b>4.4</b><br/>Load ML Models")):::process
    
    DB1[("<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/pandas/pandas-original.svg' width='40' /><br/><b>Historical Dataset</b><br/>(Dataframe)")]:::db
    DB2[("<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg' width='40' /><br/><b>Trained Models</b><br/>(.pkl Files)")]:::db

    N -- "HTTP Request (Port 5001)" --> P1
    
    P1 --> P4
    P4 -- "Read Model Files" --> DB2
    
    P1 --> P2
    P1 --> P3
    
    DB1 -- "Baseline Params" --> P2
    DB1 -- "Geo-State Coordinates" --> P3
    
    P2 -. "Predicted Crime Growth Array" .-> N
    P3 -. "Risk Hotspot IDs (0-5)" .-> N
```

---

## 5. Live News Aggregation Module
This module handles fetching external live feeds seamlessly and combining them into a unified list.

```mermaid
flowchart TD
    classDef sys fill:#ffe0b2,stroke:#f57c00,stroke-width:2px,color:#000;
    classDef db fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#000;
    classDef process fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000;

    U["<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg' width='40' /><br/><b>User Dashboard</b>"]:::sys

    P1(("<b>5.1</b><br/>Receive News Request")):::process
    P2(("<b>5.2</b><br/>Filter Relevant Tags")):::process
    P3(("<b>5.3</b><br/>Dispatch Parallel Calls")):::process
    P4(("<b>5.4</b><br/>Normalize JSONs")):::process

    API[("<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg' width='40' /><br/><b>External APIs</b><br/>(GNews, BBC)")]:::db

    U -- "Click 'View Live News'" --> P1
    
    P1 --> P3
    P3 -- "HTTP Headers / Secret Keys" --> API
    
    API -- "Raw JSON Feed" --> P2
    P2 --> P4
    
    P4 -. "Standardized Articles Array" .-> U
```
