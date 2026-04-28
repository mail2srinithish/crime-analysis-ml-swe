"""
Crime Analysis ML Platform — Architecture Diagram
Uses the `diagrams` Python library (https://diagrams.mingrammer.com)

Install dependencies first:
    pip install diagrams
    pip install graphviz   (also install Graphviz binary from https://graphviz.org/download/)

Run:
    python generate_diagram.py

Output: crime_analysis_architecture.png (auto-saved in the same folder)
"""

from diagrams import Cluster, Diagram, Edge
from diagrams.onprem.client import User, Users
from diagrams.onprem.compute import Server
from diagrams.onprem.database import Mongodb
from diagrams.onprem.network import Gunicorn, Nginx
from diagrams.onprem.security import Vault
from diagrams.onprem.analytics import Spark
from diagrams.onprem.aggregator import Fluentd
from diagrams.programming.language import Python, NodeJS
from diagrams.generic.storage import Storage
from diagrams.generic.network import Firewall
from diagrams.saas.social import Facebook  # placeholder for News APIs

graph_attr = {
    "fontsize": "20",
    "bgcolor": "white",
    "pad": "0.5",
    "rankdir": "LR",
    "splines": "ortho",
}

with Diagram(
    name="Crime Analysis & Intelligence Platform",
    show=True,
    filename="crime_analysis_architecture",
    direction="LR",
    graph_attr=graph_attr,
):

    # ── Entry Point ──────────────────────────────────────────────────────
    citizen  = User("Public Citizen")
    admin    = Users("Admin /\nLaw Enforcement")

    # ── Frontend Layer ────────────────────────────────────────────────────
    with Cluster("Frontend Layer"):
        ui = Server("EJS + Leaflet.js\nChart.js UI")

    # ── Node.js Backend ── Port 5005 ──────────────────────────────────────
    with Cluster("Node.js / Express  —  Port 5005"):
        jwt    = Vault("JWT Auth\nMiddleware")
        routes = NodeJS("Express Routes\n(API Handlers)")
        news   = Fluentd("News Aggregator\nService")

    # ── Flask ML Engine ── Port 5001 ──────────────────────────────────────
    with Cluster("Python / Flask ML Engine  —  Port 5001"):
        flask  = Gunicorn("Flask REST API\n(app.py)")
        with Cluster("ML Models"):
            rf     = Python("Random Forest\nRegressor")
            kmeans = Python("K-Means\nClustering")
            safety = Python("Safety Score\nIndex")

    # ── Data Layer ────────────────────────────────────────────────────────
    with Cluster("Data Layer"):
        mongo   = Mongodb("MongoDB\n(Users & Complaints)")
        pkl     = Storage("Trained Models\n(.pkl Files)")
        dataset = Storage("Historical Datasets\n(IPC / SLL JSON)")

    # ── External News APIs ────────────────────────────────────────────────
    with Cluster("External Live News APIs"):
        gnews    = Firewall("GNews.io")
        newsdata = Firewall("NewsData.io")
        newsapi  = Firewall("NewsAPI.org")
        bbc      = Firewall("BBC News API")

    # ── CONNECTIONS ───────────────────────────────────────────────────────

    # Users → UI
    citizen >> Edge(color="steelblue", label="browse") >> ui
    admin   >> Edge(color="steelblue", label="browse") >> ui

    # UI → Node.js Routes
    ui >> Edge(color="darkgreen", label="HTTP Request") >> routes

    # Routes → JWT Auth → MongoDB
    routes >> Edge(color="firebrick", style="dashed") >> jwt
    jwt    >> Edge(color="firebrick", style="dashed", label="verify") >> mongo

    # Routes → Flask ML Proxy
    routes >> Edge(color="darkorange", label="proxy /api/ml") >> flask

    # Flask → ML Models
    flask >> Edge(color="orange") >> [rf, kmeans, safety]

    # ML Models → Storage
    rf     >> Edge(color="brown", style="dotted", label="load") >> pkl
    kmeans >> Edge(color="brown", style="dotted", label="load") >> pkl
    rf     - Edge(color="gray",  style="dashed") - dataset
    kmeans - Edge(color="gray",  style="dashed") - dataset
    safety - Edge(color="gray",  style="dashed") - dataset

    # Routes → MongoDB CRUD
    routes >> Edge(color="purple", label="CRUD") >> mongo

    # Routes → News Aggregator → External APIs
    routes  >> Edge(color="deeppink") >> news
    news    >> Edge(color="deeppink", label="fetch JSON") >> [gnews, newsdata, newsapi, bbc]
