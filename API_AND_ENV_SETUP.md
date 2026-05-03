# API & Environment Setup Guide

If you cloned this repository on a new system and noticed that the **Live Feed** or **Interactive Maps** were missing or broken, here is exactly why and how to fix it:

## 1. Why the Interactive Map was Missing (Fixed)
The interactive Leaflet maps use open-source map tiles from **CARTO** (`cartocdn.com`) which **do not require an API key**. 

However, the map on the `State Analysis` page was likely blank because a critical data file (`districtCoords.js`) that plots the colored circles over the cities was not pushed to GitHub initially. 
**Fix:** This has now been pushed! Just run `git pull origin main` on the other system and the maps will start working automatically (as long as the system has an active internet connection to load the map tiles).

## 2. Why the Live Feed was Empty
The Live News Ticker and Live Feed page aggregate real-time crime intelligence from global news sources. Because API keys are secret, they are stored in a hidden `.env` file. 

**By default, Git ignores the `.env` file (via `.gitignore`) so your secret keys are not exposed to the public on GitHub.**

When you cloned the project on the new system, the `.env` file did not come with it, so the server had no keys to fetch the news.

### The APIs Used for Live Feed:
1. **GNews API** (`gnews.io`): Fetches general Indian crime news.
2. **NewsData API** (`newsdata.io`): Fetches latest regional reports.
3. **NewsAPI** (`newsapi.org`): Pulls comprehensive global coverage.
4. **BBC News API** (Unofficial Vercel App): Scrapes BBC for major incidents.

### How to Fix It (Update the Other System):
To make the Live Feed work on the other computer, you must manually create a file named exactly `.env` inside the `server/` directory on that computer, and paste the following keys into it:

```env
# Database & Secrets
JWT_SECRET=d97673db7645c96e5d500dbbd93f5186e24bfba28ff52ede66a1af834928cb46
PORT=5005
FLASK_SERVER=http://localhost:5001

# Live News APIs
GNEWS_API_KEY=9c7230ea0432cf761808bde4ee184383
NEWSDATA_API_KEY=pub_5617ee393cf540c394122f786c9b67ef
NEWSAPI_KEY=0e79436006f9468aa1bf70ae812eaad4
BBC_NEWS_API=https://bbc-news-api.vercel.app
```

Once you create that `.env` file in the `server/` folder and restart the Node.js server (`npm start`), the Live Feed will instantly start pulling news again!
