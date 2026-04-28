# 🏗️ System Architecture Diagram — Crime Analysis ML Platform

Inspired by the `diagrams` library style — clusters, colored edges, and labeled connections.

---

## Mermaid Version

```mermaid
flowchart LR
    classDef client fill:#dceefb,stroke:#2196f3,stroke-width:2px,color:#0d47a1,font-weight:bold
    classDef server fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#1b5e20,font-weight:bold
    classDef ml fill:#fff8e1,stroke:#ff9800,stroke-width:2px,color:#e65100,font-weight:bold
    classDef db fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#4a148c,font-weight:bold
    classDef api fill:#fce4ec,stroke:#e91e63,stroke-width:2px,color:#880e4f,font-weight:bold
    classDef monitor fill:#e0f2f1,stroke:#009688,stroke-width:3px,color:#004d40,font-weight:bold

    %% ── Entry Point ──
    Browser["🌐 Browser\n(End User / Admin)"]:::client

    %% ── Frontend Rendering ──
    subgraph UI["Frontend Layer"]
        EJS["📄 EJS Templates"]:::client
        Leaflet["🗺️ Leaflet.js\n(India Map)"]:::client
        ChartJS["📊 Chart.js\n(Trend Charts)"]:::client
    end

    %% ── Node.js Backend ──
    subgraph NodeCluster["Node.js / Express Server — Port 5005"]
        Auth["🔐 JWT Auth\nMiddleware"]:::server
        Routes["🔀 Express Routes\n(API Handlers)"]:::server
        NewsAgg["📰 News Aggregator\nService"]:::server
    end

    %% ── Flask ML Engine ──
    subgraph MLCluster["Python / Flask ML Engine — Port 5001"]
        FlaskAPI["🧪 Flask REST API\n(app.py)"]:::ml
        RandomForest["🌲 Random Forest\nRegressor"]:::ml
        KMeans["📍 K-Means\nClustering"]:::ml
        SafetyScore["🛡️ Safety Score\nIndex Engine"]:::ml
    end

    %% ── Databases & Storage ──
    subgraph DataCluster["Data Layer"]
        MongoDB[("🍃 MongoDB\nUsers & Complaints")]:::db
        PKL[("📦 Trained Models\n.pkl Files")]:::db
        Dataset[("📁 Historical Datasets\nIPC / SLL JSON")]:::db
    end

    %% ── External APIs ──
    subgraph NewsCluster["External News APIs"]
        GNews["GNews.io"]:::api
        NewsData["NewsData.io"]:::api
        NewsAPI["NewsAPI.org"]:::api
        BBC["BBC News API"]:::api
    end

    %% ── Connections ──
    Browser -- "HTTP Request" --> Routes
    Routes --> Auth
    Auth -. "Verify Token" .-> MongoDB

    Routes -- renders --> EJS
    EJS --> Leaflet
    EJS --> ChartJS

    Routes -- "proxy /api/ml" --> FlaskAPI

    FlaskAPI --> RandomForest
    FlaskAPI --> KMeans
    FlaskAPI --> SafetyScore

    RandomForest -- "load model" --> PKL
    KMeans -- "load model" --> PKL
    RandomForest -- "read data" --> Dataset
    KMeans -- "read data" --> Dataset
    SafetyScore -- "read data" --> Dataset

    Routes -- "CRUD" --> MongoDB

    NewsAgg -- "fetch JSON" --> GNews
    NewsAgg -- "fetch JSON" --> NewsData
    NewsAgg -- "fetch JSON" --> NewsAPI
    NewsAgg -- "fetch JSON" --> BBC
    Routes --> NewsAgg
```

---

## PlantUML Version

```plantuml
@startuml
!pragma layout smetana

skinparam backgroundColor #fafafa
skinparam defaultFontName Arial
skinparam defaultFontSize 12
skinparam ArrowThickness 1.5
skinparam RectangleBorderThickness 2
skinparam packageStyle rectangle

skinparam node {
    BackgroundColor #dceefb
    BorderColor #2196f3
    FontColor #0d47a1
    FontStyle bold
}

skinparam database {
    BackgroundColor #f3e5f5
    BorderColor #9c27b0
    FontColor #4a148c
    FontStyle bold
}

skinparam component {
    BackgroundColor #fff8e1
    BorderColor #ff9800
    FontColor #e65100
}

' ─────────────────────────── ENTRY POINT
node "🌐 Browser\n(End User / Admin)" as Browser

' ─────────────────────────── FRONTEND LAYER
package "Frontend Layer" #dceefb {
    component "📄 EJS Templates" as EJS
    component "🗺️ Leaflet.js\n(India Map)" as Leaflet
    component "📊 Chart.js\n(Trend Charts)" as ChartJS
}

' ─────────────────────────── NODE.JS BACKEND
package "Node.js / Express Server  —  Port 5005" #e8f5e9 {
    component "🔐 JWT Auth Middleware" as Auth
    component "🔀 Express Routes" as Routes
    component "📰 News Aggregator Service" as NewsAgg
}

' ─────────────────────────── FLASK ML ENGINE
package "Python / Flask ML Engine  —  Port 5001" #fff8e1 {
    component "🧪 Flask REST API (app.py)" as FlaskAPI
    component "🌲 Random Forest Regressor" as RF
    component "📍 K-Means Clustering" as KMeans
    component "🛡️ Safety Score Index" as Safety
}

' ─────────────────────────── DATA LAYER
package "Data Layer" #f3e5f5 {
    database "🍃 MongoDB\nUsers & Complaints" as MongoDB
    database "📦 Trained Models\n(.pkl Files)" as PKL
    database "📁 Historical Datasets\n(IPC / SLL JSON)" as Dataset
}

' ─────────────────────────── EXTERNAL APIS
package "External News APIs" #fce4ec {
    component "GNews.io" as GNews
    component "NewsData.io" as NewsData
    component "NewsAPI.org" as NewsAPI
    component "BBC News API" as BBC
}

' ─────────────────────────── CONNECTIONS
Browser -[#2196f3]-> Routes : HTTP Request

Routes -[#4caf50]-> Auth
Auth -[#9c27b0,dashed]-> MongoDB : Verify Token

Routes -[#2196f3]-> EJS : renders
EJS --> Leaflet
EJS --> ChartJS

Routes -[#ff9800]-> FlaskAPI : proxy /api/ml

FlaskAPI -[#ff9800]-> RF
FlaskAPI -[#ff9800]-> KMeans
FlaskAPI -[#ff9800]-> Safety

RF -[#9c27b0,dashed]-> PKL : load model
KMeans -[#9c27b0,dashed]-> PKL : load model

RF -[#795548]-> Dataset : read data
KMeans -[#795548]-> Dataset : read data
Safety -[#795548]-> Dataset : read data

Routes -[#4caf50]-> MongoDB : CRUD

Routes --> NewsAgg
NewsAgg -[#e91e63]-> GNews : fetch JSON
NewsAgg -[#e91e63]-> NewsData : fetch JSON
NewsAgg -[#e91e63]-> NewsAPI : fetch JSON
NewsAgg -[#e91e63]-> BBC : fetch JSON

@enduml
```
