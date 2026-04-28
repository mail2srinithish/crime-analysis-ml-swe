# 🏛️ Crime Analysis & Intelligence System - Architecture & Design

This document covers the complete system architecture, hardware/software requirements, feasibility study, modules, and UML design diagrams for the Indian Crime Intelligence & ML Prediction platform.

## 🛠️ Hardware & Software Requirements

### Hardware Requirements
- **Processor:** Intel Core i3 (or equivalent) and above
- **Memory (RAM):** 8 GB Minimum (16 GB Recommended for training Machine Learning models)
- **Storage:** 20 GB free disk space
- **Display:** Minimum 1024 × 768 resolution (Color display)
- **Network:** Active internet connection (Required for live News APIs and map tiles)

### Software Requirements
- **Operating System:** Windows 10/11, macOS, or Linux
- **Backend Environment:** Node.js (v18+) and Python 3.9+
- **Database:** MongoDB Community Server (Local) or MongoDB Atlas
- **Web Browser:** Google Chrome, Edge, or Mozilla Firefox (latest versions)
- **Frameworks & Libs:** Express.js, Flask, Scikit-learn, Mongoose, EJS, Leaflet.js, Chart.js

---

## 🧩 Modules Description

1. **Dashboard & Data Visualization Module**
   - Renders interactive maps (using Leaflet.js) to display crime density across India.
   - Provides graphical charts (pie, bar) of state-wise and national IPC/SLL crimes over the past decades.
2. **Machine Learning & Prediction Module (Flask Engine)**
   - Utilizes Random Forest and Linear Regression to forecast future crime rates based on historical data.
   - Includes a K-Means clustering algorithm to categorize states into 5 safety/risk levels (hotspots).
3. **Complaint Reporting & Triage Module**
   - Allows citizens and authenticated users to file complaints securely.
   - Employs Natural Language Processing (NLP) to triage and prioritize high-risk emergency cases.
4. **Live News Aggregation Module**
   - Connects with multiple external feeds (GNews, NewsData, NewsAPI, BBC).
   - Aggregates and filters live crime-related news specifically tailored to Indian locations.
5. **Authentication & User Management**
   - Controls access using secure JWT (JSON Web Tokens) verification.
   - Differentiates roles and visibility between normal public users and administrative law enforcement personnel.

---

## ⚖️ Feasibility Study

- **Technical Feasibility:**
  The system utilizes well-established, open-source technology frameworks. Integrating Python for machine learning calculations and Node.js for asynchronous web request handling allows the platform to be highly decoupled, scalable, and responsive. 
- **Economic Feasibility:**
  Since the core technologies (Node.js, Express, Flask, MongoDB) and frontend libraries are entirely open source and free to use, the initial software expenditure is virtually zero. The external API endpoints used have free tiers accommodating academic/standard requirements.
- **Operational Feasibility:**
  The solution automates the major pain points in crime analysis (data crunching & prediction visualization). Its User Interface is designed to be accessible and modern (incorporating "Glassmorphism" design patterns), ensuring that complex data is easily digestible for both law enforcement administrators and the general public.

---

## 🏗️ 1. System Architecture Diagram

```mermaid
graph TD
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000;
    classDef client fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000;
    classDef server fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000;
    classDef ml fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000;
    classDef db fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000;

    User["<img src='https://cdn-icons-png.flaticon.com/512/330/330433.png' width='45' /><br/><b>End User / Admin</b>"]:::client
    Browser["<img src='https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' width='45' /><br/><b>Web Interface</b><br/>(EJS, Leaflet, Chart.js)"]:::client
    
    NodeServer["<img src='https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' width='45' /><br/><b>Node.js + Express API</b><br/>(Backend logic, Port 5005)"]:::server
    
    FlaskML["<img src='https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' width='45' /><br/><b>Flask ML Engine</b><br/>(scikit-learn, Port 5001)"]:::ml
    
    Mongo["<img src='https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg' width='45' /><br/><b>MongoDB</b><br/>(Users & Complaints)"]:::db
    
    NewsAPI["<img src='https://cdn-icons-png.flaticon.com/512/2965/2965306.png' width='45' /><br/><b>External Live News APIs</b>"]:::default

    User -->|Interacts via| Browser
    Browser <-->|HTTP Requests (REST API)| NodeServer
    NodeServer <-->|Fetch JSON Feed| NewsAPI
    NodeServer <-->|CRUD Operations| Mongo
    NodeServer <-->|Request ML Predictions| FlaskML
```

---

## 🔄 2. Data Flow Diagram (DFD)

### Level 0 DFD (Context Diagram)

```mermaid
flowchart LR
    classDef ext fill:#eceff1,stroke:#607d8b,stroke-width:2px,color:#000;
    classDef sys fill:#bbdefb,stroke:#1976d2,stroke-width:2px,color:#000;

    U["<img src='https://cdn-icons-png.flaticon.com/512/330/330433.png' width='35' /><br/>User/Public"]:::ext
    S((("<b>Crime Analysis &<br/>Intelligence Platform</b>"))):::sys
    A["<img src='https://cdn-icons-png.flaticon.com/512/2965/2965306.png' width='35' /><br/>Global News APIs"]:::ext

    U -- "User Data, Search Query,<br/>Crime Complaints" --> S
    S -- "ML Predictions, Auth Token,<br/>Interactive Dashboards" --> U
    A -- "Live Headlines JSON" --> S
```

### Level 1 DFD

```mermaid
flowchart TD
    classDef default fill:#fff,stroke:#333,stroke-width:2px;

    User["Public / Admin"] -->|Login / Register Details| P1((1. Auth<br/>Process))
    P1 -->|Verify & Store Credentials| DB1[(User Credentials DB)]
    
    User -->|Submit Complaint Form| P2((2. Reporting<br/>Process))
    P2 -->|Save & Triage Report| DB2[(Complaint Records DB)]
    
    User -->|Request Real-time Analytics| P3((3. Visualization<br/>Process))
    DB3[(Historical Crime CSVs)] -->|Retrieve Past Data| P3
    P3 -->|Render Data on Map & Charts| User
    
    P3 -->|Trigger Forecast Models| P4((4. ML Prediction<br/>Engine))
    P4 -->|Return Random Forest & K-Means output| P3
    
    NewsAPI["External News Sources"] -->|Raw JSON Feed| P5((5. News<br/>Aggregator))
    P5 -->|Parsed & Filtered Feed| User
```

---

## 🏗️ 3. UML Diagrams

### Use Case Diagram (System Interactions)

```mermaid
flowchart LR
    subgraph System Boundary: Crime Analysis ML
        UC1([View Dashboard & Statistics])
        UC2([Compare State Crime Data])
        UC3([File New Crime Complaint])
        UC4([View Live Crime News])
        UC5([Execute ML Forecast/Prediction])
        UC6([NLP Triage & Prioritize Emergency])
    end
    
    Actor1["👤 Public Citizen"] 
    Actor2["👮 Admin / Law Enforcement"]
    Actor3["🤖 ML Background Process"]

    Actor1 --> UC1
    Actor1 --> UC2
    Actor1 --> UC3
    Actor1 --> UC4
    
    Actor2 --> UC1
    Actor2 --> UC2
    Actor2 --> UC4
    Actor2 --> UC5
    Actor2 --> UC6
    
    Actor3 -.->|Updates Models| UC5
    Actor3 -.->|Handles NLP Routing| UC6
```

### Sequence Diagram (Prediction Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Browser)
    participant Node as Node.js / Express Server
    participant Flask as Python / Flask Server
    participant DB as CSV Datasets / DB
    
    User->>Node: HTTP GET /api/ml/predict/:state
    activate Node
    Node->>Flask: Proxy HTTP GET /api/predict?state=X
    activate Flask
    Flask->>DB: Load Dataset & Historical Params
    activate DB
    DB-->>Flask: IPC/SLL Data points
    deactivate DB
    Flask->>Flask: Load latest .pkl Model & Exec Random Forest
    Flask-->>Node: Return Prediction Array (JSON)
    deactivate Flask
    Node-->>User: Plot Graphical Diagram & Return View
    deactivate Node
    User->>User: Visualize Predicted Growth Rate
```
