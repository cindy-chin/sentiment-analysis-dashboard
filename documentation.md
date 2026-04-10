# SG Sentiment Dashboard — Documentation

A full-stack web application for analyzing sentiment, topics, and engagement patterns in Reddit posts from r/Singapore. The dataset contains ~6000+ posts processed through machine learning pipelines (TF-IDF clustering, BM25/TF-IDF search, emotion classification).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Backend](#backend)
- [Frontend](#frontend)
- [Datasets](#datasets)

---

## Architecture Overview

```
PostVault.csv + Emotion CSV
        ↓
  app.py (Flask)
  - Loads data and pre-trained models on startup
  - Computes all aggregations at startup (no per-request processing)
  - Exposes 20 REST endpoints
        ↓
  /api/all (bulk fetch on load)
        ↓
  React (DataProvider context)
        ↓
  Pages consume data via useData() hook
```

The backend performs all heavy computation at startup and returns pre-computed results from memory. The frontend fetches everything in a single `/api/all` call and distributes it via React Context.

---

## Quick Start

```bash
make install    # Install all backend + frontend dependencies
make dev        # Run both backend (port 5000) and frontend (port 5173) concurrently
```

Individual commands:

```bash
make backend    # uv run python app.py        → http://127.0.0.1:5000
make frontend   # cd dashboard && npm run dev  → http://localhost:5173
make build      # Production frontend build
make lint       # ESLint on frontend
```

The Vite dev server proxies all `/api/*` requests to `http://127.0.0.1:5000`, so no CORS configuration is needed during development.

---

## Backend

### Stack

| Dependency | Version | Purpose |
|---|---|---|
| Flask | >=3.0 | HTTP server |
| Flask-CORS | >=4.0 | Cross-origin support |
| Pandas | >=2.2 | Data loading and aggregation |
| NumPy | >=1.26 | Numerical operations |
| scikit-learn | >=1.4 | TF-IDF vectorizer (pre-trained) |
| rank-bm25 | >=0.2.2 | BM25 ranking algorithm |
| joblib | >=1.3 | Model deserialization |
| SciPy | >=1.13 | Cosine similarity |

### Entry Point

`app.py` (892 lines) is the sole backend file. On startup it:

1. Loads `data/PostVault.csv` into a Pandas DataFrame
2. Loads `data/stopword_lemmatized_posts_0_labels_w_emot.csv` for emotion data
3. Deserializes three pre-trained models from `models/`:
   - `bm25_fulltext_model.joblib` — BM25 index over full post text
   - `bm25_titles_model.joblib` — BM25 index over post titles
   - `tfidf_posts_vectorizer.joblib` — TF-IDF vectorizer
4. Computes all aggregations and stores them in module-level variables
5. Starts the Flask development server on port 5000

### Topic Clustering

Posts are pre-clustered into 20 groups via TF-IDF + K-Means (`tfidf_cluster` column). Each cluster is mapped to a human-readable Singapore-relevant label at startup (e.g., cluster 0 → "GE2025 & National Events", cluster 1 → "Daily Life & Culture"). Per-cluster data includes:

- Top keywords (derived from TF-IDF word scores)
- Representative posts (top 8 by score)
- Controversial posts (low upvote ratio + high comment count)
- Engagement statistics

### Emotion Analysis

The emotion dataset provides 7-class predictions (`predicted_emotion`) for each post with per-class probability columns (`prob_anger`, `prob_disgust`, `prob_fear`, `prob_joy`, `prob_neutral`, `prob_sadness`, `prob_surprise`). The backend aggregates:

- Overall distribution and dominant emotion
- Monthly trends (share of each emotion per month)
- Breakdowns by day-of-week, hour, score bucket, and post flair
- Quantile engagement stats (p05, p25, median, p75, p95) per emotion
- Model confidence percentile distributions
- Top 8 sample posts per emotion
- Emotion probability correlation matrix

### Search

Two search methods are implemented and exposed via the same endpoint:

**BM25** — probabilistic term-frequency ranking using pre-trained BM25 models. Query is tokenized to lowercase words, scored against the full-text or titles model, then normalized by the maximum score.

**TF-IDF** — cosine similarity using the pre-trained TF-IDF vectorizer. Query is transformed into the same vector space as the documents and ranked by cosine similarity.

Both methods return up to `k` results (default 20, max 50) with title, text preview, relevance score (0–1), cluster label, and engagement metrics.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/all` | All data in a single response (used by frontend on load) |
| GET | `/api/global-stats` | Total posts, avg/max score, avg comments, Singlish %, viral count, date range |
| GET | `/api/topics` | List of all 20 topics with metadata |
| GET | `/api/topics/<id>` | Single topic: keywords, top posts, controversial posts |
| GET | `/api/landscape` | 2D coordinates for 2000 sampled posts (polar layout per cluster) |
| GET | `/api/heatmap` | Post counts per hour × day-of-week cell (7 × 24) |
| GET | `/api/monthly-trends` | Posts, avg score, avg comments, viral count per month |
| GET | `/api/viral-posts` | Top 20 posts by score |
| GET | `/api/controversial-posts` | Most controversial posts |
| GET | `/api/dow-engagement` | Engagement aggregated by day of week |
| GET | `/api/hour-distribution` | Post activity and engagement by hour (SGT) |
| GET | `/api/score-buckets` | Distribution across viral/high/medium/low/negative |
| GET | `/api/singlish-by-cluster` | Singlish usage percentage per cluster |
| GET | `/api/engagement-scatter` | Sampled posts for score vs comments scatter plot |
| GET | `/api/topic-colors` | Color palette for 20 topics |
| GET | `/api/timeline` | Stacked area data (months × clusters) + monthly details |
| GET | `/api/emotion` | All emotion analysis data |
| GET | `/api/search` | Search: `?q=<query>&method=bm25|tfidf&k=<n>` |
| GET | `/api/search-results` | Pre-computed mock search results |

### Models Directory

```
models/
├── bm25_fulltext_model.joblib    # BM25 index over lemmatized full text
├── bm25_titles_model.joblib      # BM25 index over lemmatized titles
└── tfidf_posts_vectorizer.joblib # Fitted TF-IDF vectorizer (sklearn)
```

---

## Frontend

### Stack

| Dependency | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| Vite | 8.0.1 | Build tool + dev server |
| React Router | 7.13.2 | Client-side routing |
| Chakra UI | 3.34.0 | Component library |
| Emotion | — | CSS-in-JS (Chakra peer dep) |
| Recharts | 3.8.1 | Bar, pie, line, area charts |
| Plotly.js / react-plotly.js | 3.4.0 / 2.6.0 | Interactive plots |
| Framer Motion | 12.38.0 | Animations |
| d3-cloud | 1.2.9 | Word cloud layout |
| react-icons | 5.6.0 | Feather icon set |

### Directory Structure

```
dashboard/src/
├── App.jsx             # Route definitions
├── main.jsx            # React entry point
├── theme.js            # Chakra UI theme (colors, typography)
├── index.css           # Global CSS
├── components/
│   ├── Layout.jsx      # Page wrapper with gradient background + Navbar
│   ├── Navbar.jsx      # Sticky top nav with 4 links
│   └── WordCloud.jsx   # Keyword word cloud (d3-cloud)
├── data/
│   ├── api.jsx         # DataProvider context + useData() hook
│   └── mockData.js     # Fallback data for offline development
└── pages/
    ├── TopicOverview.jsx     # Main dashboard
    ├── TopicDeepDive.jsx     # Single topic deep dive
    ├── Timeline.jsx          # Topic volume over time
    ├── EmotionAnalysis.jsx   # Emotion breakdown (largest page, 962 lines)
    ├── DocumentSearch.jsx    # BM25 / TF-IDF search interface
    ├── DataInsights.jsx      # Activity heatmap, score distribution
    ├── BM25DeepDive.jsx      # BM25 algorithm explanation
    └── MethodComparison.jsx  # BM25 vs TF-IDF comparison
```

### Routing

```
/                   → TopicOverview
/topics/:id         → TopicDeepDive
/timeline           → Timeline
/emotions           → EmotionAnalysis
/search             → DocumentSearch
```

All routes are wrapped in `<Layout>`, which renders the Navbar and a responsive container.

### Data Layer

`DataProvider` (in `data/api.jsx`) fetches `/api/all` once on mount and distributes the result via React Context. Every page calls `useData()` to access:

- `topics` — array of 20 topic objects
- `globalStats` — KPI numbers
- `emotions` — full emotion analysis payload
- `timeline` — monthly stacked data
- `heatmap`, `monthlyTrends`, `landscape`, etc.

The `DocumentSearch` page is the only page that makes additional API calls at runtime (one per search query to `/api/search`).

### Pages

#### TopicOverview
Entry point dashboard. Shows global KPIs (total posts, cluster count, viral posts, avg comments), a topic distribution pie chart, a ranked bar chart, an interactive word cloud, and an engagement scatter plot of score vs comments colored by cluster. Each topic has a card linking to its deep-dive page.

#### TopicDeepDive
Single-topic view accessed via `/topics/:id`. Displays cluster metadata, top representative posts, controversial posts, and a topic-specific word cloud.

#### Timeline
Stacked area chart of post volume per month broken down by topic cluster. Includes a monthly details table showing the dominant topic and per-cluster counts.

#### EmotionAnalysis
The most comprehensive page (962 lines). Covers:
- Emotion KPI cards and overall distribution (pie + bar)
- Monthly emotion trends (stacked area)
- Breakdowns by day-of-week, hour (24h SGT), score bucket, and post flair
- Engagement quantile plots per emotion (box-plot style with p05–p95)
- Model confidence percentile distributions
- Sample posts per emotion
- Hour × day dominant emotion heatmap
- Emotion probability correlation matrix

#### DocumentSearch
Search interface with a text input and method toggle (BM25 / TF-IDF). Results show ranking position, relevance bar, title, text preview, cluster badge, and engagement metrics. Queries are sent to `/api/search` on form submission.

#### DataInsights
Supplementary analytics: hour × day-of-week activity heatmap, score bucket distribution, Singlish usage per cluster, and monthly engagement trends.

#### BM25DeepDive / MethodComparison
Informational pages explaining the BM25 algorithm and comparing it against TF-IDF cosine similarity.

---

## Datasets

### `data/PostVault.csv`

Main dataset (~6000 rows). Key columns:

| Column | Description |
|---|---|
| `title`, `content`, `fulltext` | Original post text |
| `score` | Reddit upvote score |
| `upvote_ratio` | Fraction of upvotes (0–1) |
| `num_comments` | Comment count |
| `created_utc` | Post timestamp (UTC) |
| `year`, `month`, `day_of_week`, `hour` | Temporal breakdowns |
| `score_bucket` | Categorical: viral / high / medium / low / negative |
| `word_count` | Word count of full text |
| `singlish_count` | Count of Singlish terms detected |
| `tfidf_cluster` | Cluster assignment (0–19) from TF-IDF K-Means |
| `lemmatized_full_text` | Preprocessed text used for search models |

Multiple text preprocessing variants are stored per post: `cleaned_*`, `singlish_normalized_*`, `english_converted_*`, `expanded_*`, `demojized_*`, `spellchecked_*`, `lemmatized_*`.

### `data/stopword_lemmatized_posts_0_labels_w_emot.csv`

Extends PostVault with emotion predictions:

| Column | Description |
|---|---|
| `predicted_emotion` | Dominant predicted emotion (7 classes) |
| `prob_anger` | Probability score for anger |
| `prob_disgust` | Probability score for disgust |
| `prob_fear` | Probability score for fear |
| `prob_joy` | Probability score for joy |
| `prob_neutral` | Probability score for neutral |
| `prob_sadness` | Probability score for sadness |
| `prob_surprise` | Probability score for surprise |

Also includes additional Reddit metadata columns (author, flair, archived, etc.) not present in PostVault.
