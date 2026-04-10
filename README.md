# SG Sentiment Dashboard

This project is a full-stack sentiment analysis dashboard for exploring the PostVault dataset.

- The backend is a Flask API in the project root (`app.py`).
- The frontend is a React + Vite app in [`dashboard/`](/Users/wk/Documents/projects/sentiment-analysis-dashboard/dashboard).
- The frontend calls the backend through a Vite dev proxy from `/api` to `http://127.0.0.1:5000`.

## Project Structure

```text
.
├── app.py                # Flask API server
├── pyproject.toml        # Python project metadata for uv
├── uv.lock               # Locked Python dependencies
├── requirements.txt      # Python dependencies for pip installs
├── data/                 # CSV datasets used by the backend
├── models/               # Saved BM25 and TF-IDF model artifacts
└── dashboard/            # React + Vite frontend
```

## Start The Backend

### With uv

From the project root:

```bash
uv sync
uv run python app.py
```

### With pip

From the project root:

```bash
pip install -r requirements.txt
python app.py
```

The backend starts in Flask debug mode on `http://127.0.0.1:5000`.

## Start The Frontend

Open a second terminal, then run:

```bash
cd dashboard
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.

## Run The App Locally

For local development, keep both servers running:

1. Start the Flask backend from the repository root with `uv run python app.py` or `python app.py`.
2. Start the Vite frontend from `dashboard/`.
3. Open `http://localhost:5173` in your browser.

The frontend will proxy API requests from `/api` to the backend on port `5000`.

## Makefile Commands

You can also use the root `Makefile` for common development tasks:

```bash
make install
make backend
make frontend
make dev
```

These targets use `uv` for the backend and `npm` for the frontend.

Run `make help` to see the full list of available commands.
