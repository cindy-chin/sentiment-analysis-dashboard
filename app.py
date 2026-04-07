import csv
import json
import random
import joblib
import numpy as np
import pandas as pd
from collections import Counter, defaultdict
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

# ── Load and process data on startup ──
print("Loading PostVault.csv...")
rows = []
with open('data/PostVault.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

# ── Load BM25 and TF-IDF search models ──
print("Loading search models...")
bm25_fulltext_model = joblib.load('models/bm25_fulltext_model.joblib')
bm25_titles_model = joblib.load('models/bm25_titles_model.joblib')
tfidf_search_vectorizer = joblib.load('models/tfidf_posts_vectorizer.joblib')
# Build TF-IDF search matrix from the saved vectorizer (transform-only, no refit)
tfidf_search_matrix = tfidf_search_vectorizer.transform(
    [r.get('lemmatized_full_text', '') or '' for r in rows]
)
print("Search models loaded.")

# ── Build TF-IDF matrix from lemmatized_full_text text (matches Stage 8 notebook) ──
corpus = [r.get('lemmatized_full_text', '') or '' for r in rows]
cluster_labels = [r['tfidf_cluster'] for r in rows]

tfidf_vectorizer = TfidfVectorizer()
tfidf_matrix = tfidf_vectorizer.fit_transform(corpus)
feature_names = tfidf_vectorizer.get_feature_names_out()

# ── Derive cluster counts from data ──
n_tfidf_clusters = len(set(cluster_labels))


# ── Cluster labels ──
CLUSTER_LABELS = {
    '0': 'GE2025 & National Events',
    '1': 'Daily Life & Culture',
    '2': 'Friendships & Connections',
    '3': 'Moderated & Removed Posts',
    '4': 'Elections & Political Parties',
    '5': 'Surveys & Help Requests',
    '6': 'Jobs & Career Market',
    '7': 'Travel & Relocation',
    '8': 'Citizenship & Expat Life',
    '9': 'News & Current Affairs',
    '10': 'Crime & Justice',
    '11': 'Scams & Fraud Reports',
    '12': 'Recommendations & Reviews',
    '13': 'General Discussion (HDB, Work, Life)',
    '14': 'Pleas for Help & Urgent Requests',
    '15': 'Opinions & Social Commentary',
    '16': 'Schools & Education',
    '17': 'Mischief, Complaints & Rants',
    '18': 'Career & Legal Advice',
    '19': 'Public Transport (MRT & Bus)',
}

TOPIC_COLORS = [
    '#3D9AFF', '#38A169', '#6BB5FF', '#68D391',
    '#2B7DE9', '#2F855A', '#A3D1FF', '#F6AD55',
    '#FC8181', '#B794F4', '#63B3ED', '#F687B3',
    '#4FD1C5', '#FBD38D', '#9AE6B4', '#D53F8C',
    '#ED8936', '#667EEA', '#48BB78', '#E53E3E',
]

# ── Cluster analysis ──
cluster_data = defaultdict(lambda: {
    'scores': [], 'comments': [], 'singlish': [],
    'word_counts': [], 'upvote_ratios': [], 'titles': [],
    'posts': [], 'score_buckets': Counter(), 'days': Counter(),
    'hours': Counter(), 'months': Counter()
})

for r in rows:
    c = r['tfidf_cluster']
    score = float(r['score']) if r['score'] else 0
    comments = float(r['num_comments']) if r['num_comments'] else 0
    singlish = int(float(r['singlish_count'])) if r['singlish_count'] else 0
    wc = int(float(r['word_count'])) if r['word_count'] else 0
    ur = float(r['upvote_ratio']) if r['upvote_ratio'] else 0
    hour = int(float(r['hour'])) if r['hour'] else 0
    month = int(float(r['month'])) if r['month'] else 0

    d = cluster_data[c]
    d['scores'].append(score)
    d['comments'].append(comments)
    d['singlish'].append(singlish)
    d['word_counts'].append(wc)
    d['upvote_ratios'].append(ur)
    d['titles'].append(r['title'])
    d['score_buckets'][r['score_bucket']] += 1
    d['days'][r['day_of_week']] += 1
    d['hours'][hour] += 1
    d['months'][month] += 1
    d['posts'].append({
        'title': r['title'],
        'score': score,
        'comments': comments,
        'upvote_ratio': ur,
        'singlish': singlish,
        'text': r.get('lemmatized_full_text', '')[:200],
        'score_bucket': r['score_bucket'],
        'day': r['day_of_week'],
        'hour': hour,
    })


def get_cluster_keywords(cluster_id, top_n=20):
    cluster_mask = np.array([cl == cluster_id for cl in cluster_labels])
    cluster_docs = tfidf_matrix[cluster_mask]
    word_scores = np.asarray(cluster_docs.sum(axis=0)).flatten()
    top_indices = word_scores.argsort()[::-1][:top_n]
    return [(feature_names[i], round(float(word_scores[i]), 2)) for i in top_indices]


def build_topic(cid, d, label_map, keyword_fn, id_prefix):
    n = len(d['scores'])
    avg_score = sum(d['scores']) / n
    avg_comments = sum(d['comments']) / n
    viral_count = sum(1 for s in d['scores'] if s >= 100)
    singlish_pct = sum(1 for s in d['singlish'] if s > 0) * 100 / n
    avg_ur = sum(d['upvote_ratios']) / n
    avg_wc = sum(d['word_counts']) / n

    keywords = keyword_fn(cid)
    wordcloud = [{'text': w, 'value': c} for w, c in keywords]

    top_posts = sorted(d['posts'], key=lambda p: p['score'], reverse=True)[:8]
    representative_posts = [{
        'id': f'{id_prefix}{int(cid)}_{i}',
        'title': p['title'][:120],
        'text': p['text'][:200],
        'score': int(p['score']),
        'comments': int(p['comments']),
        'upvoteRatio': round(p['upvote_ratio'], 2),
    } for i, p in enumerate(top_posts)]

    controversial = sorted(
        [p for p in d['posts'] if p['comments'] > 10],
        key=lambda p: p['upvote_ratio']
    )[:3]
    controversial_posts = [{
        'title': p['title'][:120],
        'score': int(p['score']),
        'comments': int(p['comments']),
        'upvoteRatio': round(p['upvote_ratio'], 2),
    } for p in controversial]

    return {
        'id': int(cid),
        'label': label_map.get(cid, f'Cluster {cid}'),
        'postCount': n,
        'color': TOPIC_COLORS[int(cid) % len(TOPIC_COLORS)],
        'avgScore': round(avg_score, 1),
        'avgComments': round(avg_comments, 1),
        'viralCount': viral_count,
        'singlishPct': round(singlish_pct, 1),
        'avgUpvoteRatio': round(avg_ur, 2),
        'avgWordCount': round(avg_wc, 0),
        'keywords': [w for w, _ in keywords[:10]],
        'wordcloud': wordcloud,
        'posts': representative_posts,
        'controversialPosts': controversial_posts,
        'scoreBuckets': dict(d['score_buckets']),
    }


# ── Build topics ──
topics = []
for cid in sorted(cluster_data.keys(), key=int):
    topics.append(build_topic(cid, cluster_data[cid], CLUSTER_LABELS, get_cluster_keywords, 'p'))

# ── Activity heatmap ──
day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
heatmap_raw = []
for r in rows:
    hour = int(float(r['hour'])) if r['hour'] else 0
    day = r['day_of_week']
    heatmap_raw.append({'hour': hour, 'day': day})

heatmap_matrix = []
for day_idx, day in enumerate(day_order):
    for hour in range(24):
        count = sum(1 for h in heatmap_raw if h['day'] == day and h['hour'] == hour)
        heatmap_matrix.append({'day': day, 'dayIdx': day_idx, 'hour': hour, 'count': count})

# ── Monthly trends ──
month_names = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
               7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
monthly_data = defaultdict(lambda: {'posts': 0, 'totalScore': 0, 'totalComments': 0, 'viral': 0})
for r in rows:
    year = r.get('year', '')
    month = r.get('month', '')
    if not year or not month:
        continue
    key = f"{month_names.get(int(float(month)), '?')} {int(float(year))}"
    score = float(r['score']) if r['score'] else 0
    comments = float(r['num_comments']) if r['num_comments'] else 0
    monthly_data[key]['posts'] += 1
    monthly_data[key]['totalScore'] += score
    monthly_data[key]['totalComments'] += comments
    if score >= 100:
        monthly_data[key]['viral'] += 1

month_order_list = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
def month_sort_key(key):
    parts = key.split()
    m = month_order_list.index(parts[0]) if parts[0] in month_order_list else 0
    y = int(parts[1]) if len(parts) > 1 else 0
    return (y, m)

monthly_trends = []
for key in sorted(monthly_data.keys(), key=month_sort_key):
    d = monthly_data[key]
    monthly_trends.append({
        'month': key,
        'posts': d['posts'],
        'avgScore': round(d['totalScore'] / d['posts'], 1) if d['posts'] else 0,
        'avgComments': round(d['totalComments'] / d['posts'], 1) if d['posts'] else 0,
        'viralPosts': d['viral'],
    })

# ── Top viral posts ──
all_viral = sorted(rows, key=lambda r: float(r['score']) if r['score'] else 0, reverse=True)[:20]
viral_posts = [{
    'title': r['title'][:120],
    'score': int(float(r['score'])),
    'comments': int(float(r['num_comments'])) if r['num_comments'] else 0,
    'upvoteRatio': round(float(r['upvote_ratio']), 2) if r['upvote_ratio'] else 0,
    'cluster': int(r['tfidf_cluster']),
    'clusterLabel': CLUSTER_LABELS.get(r['tfidf_cluster'], ''),
    'scoreBucket': r['score_bucket'],
    'day': r['day_of_week'],
} for r in all_viral]

# ── Most controversial posts ──
controversial_all = [r for r in rows
                     if r['upvote_ratio'] and float(r['upvote_ratio']) < 0.55
                     and r['num_comments'] and float(r['num_comments']) > 15]
controversial_all.sort(key=lambda r: float(r['upvote_ratio']))
controversial_posts = [{
    'title': r['title'][:120],
    'score': int(float(r['score'])),
    'comments': int(float(r['num_comments'])),
    'upvoteRatio': round(float(r['upvote_ratio']), 2),
    'cluster': int(r['tfidf_cluster']),
    'clusterLabel': CLUSTER_LABELS.get(r['tfidf_cluster'], ''),
} for r in controversial_all[:15]]

# ── Day of week engagement ──
dow_engagement = []
for day in day_order:
    day_posts = [r for r in rows if r['day_of_week'] == day]
    if day_posts:
        scores = [float(r['score']) for r in day_posts if r['score']]
        comments = [float(r['num_comments']) for r in day_posts if r['num_comments']]
        dow_engagement.append({
            'day': day,
            'posts': len(day_posts),
            'avgScore': round(sum(scores) / len(scores), 1),
            'avgComments': round(sum(comments) / len(comments), 1),
            'viralPosts': sum(1 for s in scores if s >= 100),
        })

# ── Hour distribution ──
hour_dist = []
for h in range(24):
    h_posts = [r for r in rows if r['hour'] and int(float(r['hour'])) == h]
    scores = [float(r['score']) for r in h_posts if r['score']]
    hour_dist.append({
        'hour': h,
        'label': f'{(h + 8) % 24:02d}:00 SGT',
        'posts': len(h_posts),
        'avgScore': round(sum(scores) / len(scores), 1) if scores else 0,
    })

# ── Score bucket distribution ──
bucket_dist = []
for bucket in ['viral', 'high', 'medium', 'low', 'negative']:
    count = sum(1 for r in rows if r['score_bucket'] == bucket)
    bucket_dist.append({'bucket': bucket, 'count': count})

# ── Singlish stats by cluster ──
singlish_by_cluster = []
for cid in sorted(cluster_data.keys(), key=int):
    d = cluster_data[cid]
    n = len(d['singlish'])
    with_singlish = sum(1 for s in d['singlish'] if s > 0)
    singlish_by_cluster.append({
        'cluster': int(cid),
        'label': CLUSTER_LABELS.get(cid, f'Cluster {cid}'),
        'total': n,
        'withSinglish': with_singlish,
        'pct': round(with_singlish * 100 / n, 1),
    })

# ── Engagement scatter data ──
random.seed(42)
sampled = random.sample(rows, min(500, len(rows)))
engagement_scatter = [{
    'score': int(float(r['score'])) if r['score'] else 0,
    'comments': int(float(r['num_comments'])) if r['num_comments'] else 0,
    'cluster': int(r['tfidf_cluster']),
    'title': r['title'][:60],
} for r in sampled]

# ── Global stats ──
all_scores = [float(r['score']) for r in rows if r['score']]
all_comments = [float(r['num_comments']) for r in rows if r['num_comments']]
all_wc = [int(float(r['word_count'])) for r in rows if r['word_count']]

month_abbr = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
              7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
date_pairs = [(int(float(r['year'])), int(float(r['month'])))
              for r in rows if r.get('year') and r.get('month')]
min_ym = min(date_pairs)
max_ym = max(date_pairs)
date_range_str = f"{month_abbr[min_ym[1]]} {min_ym[0]} – {month_abbr[max_ym[1]]} {max_ym[0]}"

global_stats = {
    'totalPosts': len(rows),
    'avgScore': round(sum(all_scores) / len(all_scores), 1),
    'maxScore': int(max(all_scores)),
    'medianScore': int(sorted(all_scores)[len(all_scores) // 2]),
    'avgComments': round(sum(all_comments) / len(all_comments), 1),
    'maxComments': int(max(all_comments)),
    'avgWordCount': round(sum(all_wc) / len(all_wc), 0),
    'singlishPct': round(sum(1 for r in rows if r['singlish_count'] and int(float(r['singlish_count'])) > 0) * 100 / len(rows), 1),
    'viralPosts': sum(1 for s in all_scores if s >= 100),
    'dateRange': date_range_str,
    'tfidfClusters': n_tfidf_clusters,
}

# ── Landscape data ──
random.seed(42)
angle_step = 2 * np.pi / n_tfidf_clusters
centroids = [
    (round(30 * np.cos(i * angle_step), 1), round(30 * np.sin(i * angle_step), 1))
    for i in range(n_tfidf_clusters)
]
landscape_points = []
for r in random.sample(rows, min(2000, len(rows))):
    cid = int(r['tfidf_cluster'])
    cx, cy = centroids[cid]
    spread = 15
    landscape_points.append({
        'x': round(cx + (random.random() - 0.5) * spread, 2),
        'y': round(cy + (random.random() - 0.5) * spread, 2),
        'cluster': cid,
        'postTitle': r['title'][:60],
    })

# ── Search results ──
search_results = [
    {
        'id': f'sr{i}',
        'title': r['title'][:100],
        'text': r.get('lemmatized_full_text', '')[:200],
        'score': round(0.95 - i * 0.04, 2),
        'cluster': CLUSTER_LABELS.get(r['tfidf_cluster'], ''),
        'upvotes': int(float(r['score'])) if r['score'] else 0,
    }
    for i, r in enumerate(sorted(rows, key=lambda r: float(r['score']) if r['score'] else 0, reverse=True)[:8])
]

print(f"Data ready: {len(rows)} posts, {len(topics)} TF-IDF topics")

# ══════════════════════════════════════════
# Emotion Analysis Data
# ══════════════════════════════════════════

EMOTION_CSV = "data/stopword_lemmatized_posts_0_labels_w_emot.csv"
EMOTION_COLORS = {
    "anger": "#FC8181",
    "disgust": "#F6AD55",
    "fear": "#B794F4",
    "joy": "#38A169",
    "neutral": "#63B3ED",
    "sadness": "#3D9AFF",
    "surprise": "#4FD1C5",
}
EMOTIONS = list(EMOTION_COLORS.keys())
PROB_COLS = [f"prob_{e}" for e in EMOTIONS]
BUCKET_ORDER = ["negative", "low", "medium", "high", "viral"]
DOW_ORDER = day_order  # reuse existing day_order list

print(f"Loading {EMOTION_CSV}...")
edf = pd.read_csv(EMOTION_CSV)
edf["year_month"] = edf["year"].astype(str) + "-" + edf["month"].astype(str).str.zfill(2)
edf["month_date"] = pd.to_datetime(edf["year_month"] + "-01", errors="coerce")
if "day_of_week" in edf.columns:
    edf["day_of_week"] = pd.Categorical(edf["day_of_week"], categories=DOW_ORDER, ordered=True)
if "score_bucket" in edf.columns:
    edf["score_bucket"] = pd.Categorical(edf["score_bucket"], categories=BUCKET_ORDER, ordered=True)
if "link_flair_text" in edf.columns:
    edf["link_flair_text"] = edf["link_flair_text"].str.strip().replace(
        {"Opinion / Fluff Post": "Opinion/Fluff Post"}
    )

prob_cols_present = [c for c in PROB_COLS if c in edf.columns]
if prob_cols_present:
    edf["max_prob"] = edf[prob_cols_present].max(axis=1)

# ── Emotion KPIs ──
dominant_emotion = edf["predicted_emotion"].value_counts().idxmax()
dominant_pct = round(edf["predicted_emotion"].value_counts(normalize=True).max() * 100, 1)
avg_confidence = round(edf["max_prob"].mean() * 100, 1) if "max_prob" in edf.columns else 0
emotion_stats = {
    "totalPosts": len(edf),
    "dominantEmotion": dominant_emotion,
    "dominantPct": dominant_pct,
    "avgConfidence": avg_confidence,
    "monthsCovered": int(edf["year_month"].nunique()),
    "colors": EMOTION_COLORS,
}

# ── Overall distribution ──
ecounts = edf["predicted_emotion"].value_counts()
emotion_distribution = [
    {"emotion": e, "count": int(ecounts.get(e, 0)),
     "share": round(ecounts.get(e, 0) / ecounts.sum(), 4),
     "color": EMOTION_COLORS.get(e, "#333")}
    for e in EMOTIONS if e in ecounts.index
]

# ── Monthly trends (pivoted: one row per month, one key per emotion) ──
monthly_emo = (
    edf.groupby(["year_month", "predicted_emotion"])
    .size().reset_index(name="count")
)
monthly_emo["share"] = monthly_emo.groupby("year_month")["count"].transform(lambda x: x / x.sum())
_mp = monthly_emo.pivot(index="year_month", columns="predicted_emotion", values="share").fillna(0).sort_index()
emotion_monthly_trends = []
for ym in _mp.index:
    row = {"month": ym}
    for e in EMOTIONS:
        if e in _mp.columns:
            row[e] = round(float(_mp.loc[ym, e]), 4)
    emotion_monthly_trends.append(row)

# ── Emotion share heatmap (month × emotion) ──
emotion_heatmap = emotion_monthly_trends  # same data, rendered differently

# ── DOW breakdown ──
emotion_by_dow = []
if "day_of_week" in edf.columns:
    dow_emo = edf.groupby(["day_of_week", "predicted_emotion"]).size().reset_index(name="count")
    dow_emo["share"] = dow_emo.groupby("day_of_week")["count"].transform(lambda x: x / x.sum())
    dp = dow_emo.pivot(index="day_of_week", columns="predicted_emotion", values="share").fillna(0)
    dp = dp.reindex([d for d in DOW_ORDER if d in dp.index])
    for day in dp.index:
        row = {"day": day}
        for e in EMOTIONS:
            if e in dp.columns:
                row[e] = round(float(dp.loc[day, e]), 4)
        emotion_by_dow.append(row)

# ── Hour breakdown ──
emotion_by_hour = []
if "hour" in edf.columns:
    hr_emo = edf.groupby(["hour", "predicted_emotion"]).size().reset_index(name="count")
    hr_emo["share"] = hr_emo.groupby("hour")["count"].transform(lambda x: x / x.sum())
    hp = hr_emo.pivot(index="hour", columns="predicted_emotion", values="share").fillna(0).sort_index()
    for hr in hp.index:
        row = {"hour": int(hr)}
        for e in EMOTIONS:
            if e in hp.columns:
                row[e] = round(float(hp.loc[hr, e]), 4)
        emotion_by_hour.append(row)

# ── Score bucket breakdown ──
emotion_by_bucket = []
if "score_bucket" in edf.columns:
    bkt = edf.groupby(["score_bucket", "predicted_emotion"]).size().reset_index(name="count")
    bkt["share"] = bkt.groupby("score_bucket")["count"].transform(lambda x: x / x.sum())
    bp = bkt.pivot(index="score_bucket", columns="predicted_emotion", values="share").fillna(0)
    bp = bp.reindex([b for b in BUCKET_ORDER if b in bp.index])
    for b in bp.index:
        row = {"bucket": b}
        for e in EMOTIONS:
            if e in bp.columns:
                row[e] = round(float(bp.loc[b, e]), 4)
        emotion_by_bucket.append(row)

# ── Flair breakdown (top 10) ──
emotion_by_flair = []
if "link_flair_text" in edf.columns:
    top_flairs = edf["link_flair_text"].value_counts().head(10).index.tolist()
    flair_sub = edf[edf["link_flair_text"].isin(top_flairs)]
    fl = flair_sub.groupby(["link_flair_text", "predicted_emotion"]).size().reset_index(name="count")
    fl["share"] = fl.groupby("link_flair_text")["count"].transform(lambda x: x / x.sum())
    fp = fl.pivot(index="link_flair_text", columns="predicted_emotion", values="share").fillna(0)
    for flair in fp.index:
        row = {"flair": flair}
        for e in EMOTIONS:
            if e in fp.columns:
                row[e] = round(float(fp.loc[flair, e]), 4)
        emotion_by_flair.append(row)

# ── Engagement stats per emotion (box-plot-like summaries) ──
emotion_engagement = []
for e in EMOTIONS:
    sub = edf[edf["predicted_emotion"] == e]
    if len(sub) == 0:
        continue
    scores = sub["score"].dropna()
    comments = sub["num_comments"].dropna()
    ur = sub["upvote_ratio"].dropna()
    emotion_engagement.append({
        "emotion": e,
        "color": EMOTION_COLORS[e],
        "count": int(len(sub)),
        "avgScore": round(float(scores.mean()), 1),
        "medianScore": round(float(scores.median()), 1),
        "p05Score": round(float(scores.quantile(0.05)), 1),
        "p25Score": round(float(scores.quantile(0.25)), 1),
        "p75Score": round(float(scores.quantile(0.75)), 1),
        "p95Score": round(float(scores.quantile(0.95)), 1),
        "avgComments": round(float(comments.mean()), 1),
        "medianComments": round(float(comments.median()), 1),
        "p05Comments": round(float(comments.quantile(0.05)), 1),
        "p25Comments": round(float(comments.quantile(0.25)), 1),
        "p75Comments": round(float(comments.quantile(0.75)), 1),
        "p95Comments": round(float(comments.quantile(0.95)), 1),
        "avgUpvoteRatio": round(float(ur.mean()), 3),
        "medianUpvoteRatio": round(float(ur.median()), 3),
    })

# ── Confidence stats per emotion ──
emotion_confidence = []
if "max_prob" in edf.columns:
    for e in EMOTIONS:
        sub = edf[edf["predicted_emotion"] == e]["max_prob"].dropna()
        if len(sub) == 0:
            continue
        pcts = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100]
        emotion_confidence.append({
            "emotion": e,
            "color": EMOTION_COLORS[e],
            "avg": round(float(sub.mean()), 4),
            "median": round(float(sub.median()), 4),
            "p25": round(float(sub.quantile(0.25)), 4),
            "p75": round(float(sub.quantile(0.75)), 4),
            "min": round(float(sub.min()), 4),
            "max": round(float(sub.max()), 4),
            "percentiles": [round(float(sub.quantile(p / 100)), 4) for p in pcts],
        })

# ── Average probability per class ──
emotion_avg_probs = []
if prob_cols_present:
    for col in prob_cols_present:
        e = col.replace("prob_", "")
        emotion_avg_probs.append({
            "emotion": e,
            "avgProb": round(float(edf[col].mean()), 4),
            "color": EMOTION_COLORS.get(e, "#333"),
        })
    emotion_avg_probs.sort(key=lambda x: x["avgProb"], reverse=True)

# ── Probability correlation matrix ──
emotion_prob_corr = {}
if prob_cols_present:
    corr_df = edf[prob_cols_present].rename(columns=lambda c: c.replace("prob_", "")).corr()
    emotion_prob_corr = {
        "emotions": corr_df.columns.tolist(),
        "matrix": [[round(float(v), 3) for v in row] for row in corr_df.values],
    }

# ── Hour × DOW heatmap (dominant emotion per cell) ──
emotion_hour_dow_heatmap = []
if "hour" in edf.columns and "day_of_week" in edf.columns:
    for day in DOW_ORDER:
        for hr in range(24):
            cell = edf[(edf["day_of_week"] == day) & (edf["hour"] == hr)]
            if len(cell) == 0:
                continue
            dominant = cell["predicted_emotion"].value_counts().idxmax()
            emotion_hour_dow_heatmap.append({
                "day": day, "hour": hr,
                "dominant": dominant,
                "count": int(len(cell)),
            })

# ── Sample posts per emotion (top by score, with content) ──
emotion_sample_posts = {}
for e in EMOTIONS:
    sub = edf[edf["predicted_emotion"] == e]
    sub = sub[sub["selftext"].notna() & (sub["selftext"].str.strip() != "")]
    sub = sub.nlargest(8, "score")
    posts = []
    for _, r in sub.iterrows():
        content = str(r["selftext"])
        p = {
            "title": str(r.get("title", ""))[:120],
            "content": content[:300],
            "score": int(r["score"]),
            "comments": int(r["num_comments"]) if pd.notna(r.get("num_comments")) else 0,
            "upvoteRatio": round(float(r["upvote_ratio"]), 2) if pd.notna(r.get("upvote_ratio")) else 0,
            "month": str(r.get("year_month", "")),
        }
        if "max_prob" in edf.columns and pd.notna(r.get("max_prob")):
            p["confidence"] = round(float(r["max_prob"]), 3)
        if "link_flair_text" in edf.columns and pd.notna(r.get("link_flair_text")):
            p["flair"] = str(r["link_flair_text"])
        posts.append(p)
    emotion_sample_posts[e] = posts

# ── Bundle all emotion data ──
emotion_data = {
    "stats": emotion_stats,
    "distribution": emotion_distribution,
    "monthlyTrends": emotion_monthly_trends,
    "heatmap": emotion_heatmap,
    "byDow": emotion_by_dow,
    "byHour": emotion_by_hour,
    "byBucket": emotion_by_bucket,
    "byFlair": emotion_by_flair,
    "engagement": emotion_engagement,
    "confidence": emotion_confidence,
    "avgProbs": emotion_avg_probs,
    "probCorrelation": emotion_prob_corr,
    "hourDowHeatmap": emotion_hour_dow_heatmap,
    "samplePosts": emotion_sample_posts,
}

print(f"Emotion data ready: {len(edf)} posts, {len(EMOTIONS)} emotions")

# ── Timeline: topic volume per month ──
# For each month, count posts per TF-IDF cluster + compute avg score & top post
timeline_month_topic = defaultdict(lambda: defaultdict(lambda: {
    'count': 0, 'totalScore': 0, 'totalComments': 0, 'topPost': None, 'topPostScore': -1
}))
timeline_months_set = set()

for r in rows:
    year = r.get('year', '')
    month = r.get('month', '')
    if not year or not month:
        continue
    ym_key = f"{int(float(year))}-{int(float(month)):02d}"
    cid = r['tfidf_cluster']
    score = float(r['score']) if r['score'] else 0
    comments = float(r['num_comments']) if r['num_comments'] else 0

    timeline_months_set.add(ym_key)
    d = timeline_month_topic[ym_key][cid]
    d['count'] += 1
    d['totalScore'] += score
    d['totalComments'] += comments
    if score > d['topPostScore']:
        d['topPostScore'] = score
        d['topPost'] = r['title'][:100]

sorted_timeline_months = sorted(timeline_months_set)

# Build stacked area chart data: each row is a month with a key per cluster
timeline_stacked = []
for ym in sorted_timeline_months:
    parts = ym.split('-')
    label = f"{month_names[int(parts[1])]} {parts[0]}"
    entry = {'month': label, 'monthKey': ym}
    total = 0
    for cid_str in sorted(CLUSTER_LABELS.keys(), key=int):
        entry[f'cluster_{cid_str}'] = timeline_month_topic[ym][cid_str]['count']
        total += timeline_month_topic[ym][cid_str]['count']
    entry['total'] = total
    timeline_stacked.append(entry)

# Build per-month detail: which topic dominates, engagement stats
timeline_details = []
for ym in sorted_timeline_months:
    parts = ym.split('-')
    label = f"{month_names[int(parts[1])]} {parts[0]}"
    cluster_breakdown = []
    for cid_str in sorted(timeline_month_topic[ym].keys(), key=int):
        d = timeline_month_topic[ym][cid_str]
        cluster_breakdown.append({
            'cluster': int(cid_str),
            'label': CLUSTER_LABELS.get(cid_str, f'Cluster {cid_str}'),
            'color': TOPIC_COLORS[int(cid_str) % len(TOPIC_COLORS)],
            'posts': d['count'],
            'avgScore': round(d['totalScore'] / d['count'], 1) if d['count'] else 0,
            'avgComments': round(d['totalComments'] / d['count'], 1) if d['count'] else 0,
            'topPost': d['topPost'],
        })
    cluster_breakdown.sort(key=lambda x: x['posts'], reverse=True)
    total_posts = sum(c['posts'] for c in cluster_breakdown)
    # Add percentage
    for c in cluster_breakdown:
        c['pct'] = round(c['posts'] * 100 / total_posts, 1) if total_posts else 0
    timeline_details.append({
        'month': label,
        'monthKey': ym,
        'totalPosts': total_posts,
        'dominantTopic': cluster_breakdown[0]['label'] if cluster_breakdown else '',
        'dominantTopicCluster': cluster_breakdown[0]['cluster'] if cluster_breakdown else 0,
        'clusters': cluster_breakdown,
    })

timeline_data = {
    'stacked': timeline_stacked,
    'details': timeline_details,
    'clusterLabels': CLUSTER_LABELS,
    'clusterColors': TOPIC_COLORS,
}


# ══════════════════════════════════════════
# Flask API Routes
# ══════════════════════════════════════════

@app.route('/api/all')
def get_all():
    """Return all data in a single request (used by the dashboard on initial load)."""
    return jsonify({
        'TOPIC_COLORS': TOPIC_COLORS,
        'globalStats': global_stats,
        'topics': topics,
        'landscapeData': landscape_points,
        'heatmapData': heatmap_matrix,
        'monthlyTrends': monthly_trends,
        'viralPosts': viral_posts,
        'controversialPosts': controversial_posts,
        'dowEngagement': dow_engagement,
        'hourDistribution': hour_dist,
        'scoreBuckets': bucket_dist,
        'singlishByCluster': singlish_by_cluster,
        'engagementScatter': engagement_scatter,
        'timelineData': timeline_data,
        'mockSearchResults': search_results,
        'emotionData': emotion_data,
    })


@app.route('/api/global-stats')
def get_global_stats():
    return jsonify(global_stats)


@app.route('/api/topics')
def get_topics():
    return jsonify(topics)


@app.route('/api/topics/<int:topic_id>')
def get_topic(topic_id):
    topic = next((t for t in topics if t['id'] == topic_id), None)
    if topic is None:
        return jsonify({'error': 'Topic not found'}), 404
    return jsonify(topic)


@app.route('/api/landscape')
def get_landscape():
    return jsonify(landscape_points)


@app.route('/api/heatmap')
def get_heatmap():
    return jsonify(heatmap_matrix)


@app.route('/api/monthly-trends')
def get_monthly_trends():
    return jsonify(monthly_trends)


@app.route('/api/viral-posts')
def get_viral_posts():
    return jsonify(viral_posts)


@app.route('/api/controversial-posts')
def get_controversial_posts():
    return jsonify(controversial_posts)


@app.route('/api/dow-engagement')
def get_dow_engagement():
    return jsonify(dow_engagement)


@app.route('/api/hour-distribution')
def get_hour_distribution():
    return jsonify(hour_dist)


@app.route('/api/score-buckets')
def get_score_buckets():
    return jsonify(bucket_dist)


@app.route('/api/singlish-by-cluster')
def get_singlish_by_cluster():
    return jsonify(singlish_by_cluster)


@app.route('/api/engagement-scatter')
def get_engagement_scatter():
    return jsonify(engagement_scatter)


@app.route('/api/search-results')
def get_search_results():
    return jsonify(search_results)


@app.route('/api/search')
def search_documents():
    query = request.args.get('q', '').strip()
    method = request.args.get('method', 'bm25')  # 'bm25' | 'tfidf'
    top_k = min(int(request.args.get('k', 20)), 50)

    if not query:
        return jsonify([])

    if method == 'tfidf':
        query_vec = tfidf_search_vectorizer.transform([query])
        scores = cosine_similarity(query_vec, tfidf_search_matrix).flatten()
        top_indices = scores.argsort()[::-1][:top_k]
        results = []
        for rank, idx in enumerate(top_indices):
            if scores[idx] == 0:
                break
            r = rows[idx]
            results.append({
                'id': f'sr{rank}',
                'title': r['title'][:120],
                'text': r.get('lemmatized_full_text', '')[:300],
                'relevanceScore': round(float(scores[idx]), 4),
                'cluster': int(r['tfidf_cluster']),
                'clusterLabel': CLUSTER_LABELS.get(r['tfidf_cluster'], f"Cluster {r['tfidf_cluster']}"),
                'upvotes': int(float(r['score'])) if r['score'] else 0,
                'comments': int(float(r['num_comments'])) if r['num_comments'] else 0,
            })
    else:
        # BM25 — tokenise query the same way rank_bm25 expects (list of tokens)
        query_tokens = query.lower().split()
        bm25_scores = bm25_fulltext_model.get_scores(query_tokens)
        top_indices = bm25_scores.argsort()[::-1][:top_k]
        max_score = float(bm25_scores[top_indices[0]]) if bm25_scores[top_indices[0]] > 0 else 1.0
        results = []
        for rank, idx in enumerate(top_indices):
            if bm25_scores[idx] == 0:
                break
            r = rows[idx]
            results.append({
                'id': f'sr{rank}',
                'title': r['title'][:120],
                'text': r.get('lemmatized_full_text', '')[:300],
                'relevanceScore': round(float(bm25_scores[idx]) / max_score, 4),
                'cluster': int(r['tfidf_cluster']),
                'clusterLabel': CLUSTER_LABELS.get(r['tfidf_cluster'], f"Cluster {r['tfidf_cluster']}"),
                'upvotes': int(float(r['score'])) if r['score'] else 0,
                'comments': int(float(r['num_comments'])) if r['num_comments'] else 0,
            })

    return jsonify(results)


@app.route('/api/topic-colors')
def get_topic_colors():
    return jsonify(TOPIC_COLORS)


@app.route('/api/timeline')
def get_timeline():
    return jsonify(timeline_data)


@app.route('/api/emotion')
def get_emotion():
    return jsonify(emotion_data)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
