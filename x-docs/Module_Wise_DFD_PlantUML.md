# 🌱 Module-Wise Data Flow Diagrams (PlantUML)

This document contains specialized Level 1 / Level 2 Data Flow Diagrams representing the internal data processing architecture for every module.

> **Update**: These models have been configured with `skinparam linetype ortho` paired with precise directional flow (`-up->`, `-down->`, etc.) to enforce strict horizontal and vertical (orthographic) lines. This prevents messy diagonal crossovers. Additionally, high-quality native PlantUML SVG vectors (`<&icon>`) have been embedded into all structural entities for easy visualization.

---

## 1. Authentication & User Management Module

```plantuml
@startuml
skinparam linetype ortho
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam ArrowColor #03a9f4

actor "<size:24><&person></size>\nUser / Admin" as User
database "<size:24><&hard-drive></size>\nUsers DB (MongoDB)" as UsersDB

rectangle "<b>1.1</b> Receive\nRegistration Data" as P1
rectangle "<b>1.2</b> Hash Password\n& Validate" as P2
rectangle "<b>1.3</b> Verify Login\nCredentials" as P3
rectangle "<b>1.4</b> Generate JWT\nAuth Token" as P4

User -right-> P1 : Sign-up data
P1 -down-> P2
P2 -right-> UsersDB : Encrypted Profile

User -down-> P3 : Login Request
P3 -right-> UsersDB : Query DB
UsersDB -down-> P3 : Account Hash
P3 -down-> P4 : Valid Match
P4 -left-> User : Returns JWT Token
@enduml
```

---

## 2. Complaint Reporting & Triage Module

```plantuml
@startuml
skinparam linetype ortho
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam ArrowColor #03a9f4

actor "<size:24><&person></size>\nPublic Citizen" as Citizen
actor "<size:24><&shield></size>\nLaw Enforcement" as Law
database "<size:24><&hard-drive></size>\nComplaints DB" as CompDB

rectangle "<b>2.1</b> Capture\nComplaint Form" as P1
rectangle "<b>2.2</b> NLP Triage &\nRisk Assessment" as P2
rectangle "<b>2.3</b> Format\nCase File" as P3
rectangle "<b>2.4</b> Retrieve Cases\nfor Review" as P4

Citizen -right-> P1 : Crime details
P1 -down-> P2 : Raw Text
P2 -down-> P3 : Risk Level
P3 -right-> CompDB : Structured Report

Law -right-> P4 : Request Queue
CompDB -down-> P4 : Pending Cases
P4 -up-> Law : Dashboard View
@enduml
```

---

## 3. Dashboard & Data Visualization Module

```plantuml
@startuml
skinparam linetype ortho
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam ArrowColor #03a9f4

node "<size:24><&monitor></size>\nUser Interface (UI)" as UI
database "<size:24><&spreadsheet></size>\nHistorical Crime Data" as Dataset

rectangle "<b>3.1</b> Request National\nState Trends" as P1
rectangle "<b>3.2</b> Fetch Raw\nIPC/SLL Records" as P2
rectangle "<b>3.3</b> Aggregate &\nCompute Totals" as P3
rectangle "<b>3.4</b> Format Map\n& Chart Data" as P4

UI -right-> P1 : API Request
P1 -down-> P2
P2 -right-> Dataset : Query
Dataset -down-> P3 : Decades of Records
P3 -left-> P4 : Grouped Arrays
P4 -up-> UI : Geo-JSON Coordinates
@enduml
```

---

## 4. Machine Learning Engine Module

```plantuml
@startuml
skinparam linetype ortho
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam ArrowColor #03a9f4

node "<size:24><&cog></size>\nNode.js Express API" as NodeServer
database "<size:24><&spreadsheet></size>\nHistorical Dataframe" as HistDB
file "<size:24><&pie-chart></size>\nTrained Models (.pkl)" as Models

rectangle "<b>4.1</b> Receive State\nPrediction Req" as P1
rectangle "<b>4.2</b> Load Saved\nML Models" as P2
rectangle "<b>4.3</b> Execute\nRandom Forest" as P3
rectangle "<b>4.4</b> Process\nK-Means Clusters" as P4

NodeServer -right-> P1 : HTTP Port 5001
P1 -down-> P2
Models -right-> P2 : RF/K-Means Objects

P2 -down-> P3
HistDB -right-> P3 : Baseline Params
P2 -left-> P4
HistDB -left-> P4 : State Coordinates

P3 -up-> NodeServer : Predicted Crime Data
P4 -up-> NodeServer : Risk Hotspot IDs
@enduml
```

---

## 5. Live News Aggregation Module

```plantuml
@startuml
skinparam linetype ortho
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam ArrowColor #03a9f4

node "<size:24><&browser></size>\nUser Dashboard" as Dashboard
cloud "<size:24><&cloud></size>\nExternal News APIs" as NewsAPIs

rectangle "<b>5.1</b> Receive News\nRefresh Request" as P1
rectangle "<b>5.2</b> Dispatch Parallel\nAPI Calls" as P2
rectangle "<b>5.3</b> Filter relevant\n'Crime India' tags" as P3
rectangle "<b>5.4</b> Normalize &\nMerge JSONs" as P4

Dashboard -right-> P1 : Click 'Live News'
P1 -down-> P2
P2 -right-> NewsAPIs : API Headers / Keys
NewsAPIs -down-> P3 : Raw JSON Feeds
P3 -left-> P4 : Filtered Items
P4 -up-> Dashboard : Standardized Articles
@enduml
```
