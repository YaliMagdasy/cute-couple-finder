"""Cute Couple Finder - Flask Application.

Serves the landing page, handles model training, generates shareable URLs,
and runs the matching engine. Models auto-expire after 24 hours.
"""

import io
import os
import pickle
import random
import time
import uuid
import requests

import numpy as np
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from PIL import Image
from apscheduler.schedulers.background import BackgroundScheduler

from config import (
    MODELS_DIR,
    DEFAULTS_DIR,
    FRONTEND_DIR,
    MODEL_EXPIRY_HOURS,
    CLASSES,
    DATA_DIR,
    CELEBRITIES_DIR
)
from ml.embeddings import (
    extract_partner_embedding,
    extract_candidate_embedding,
    get_random_embeddings,
)
from ml.trainer import train_model
from utils.cleanup import purge_expired_models
from constants import CELEBRITIES

# ─── App setup ────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# In-memory model cache: uid -> classifier
model_cache: dict = {}


# ─── Scheduled cleanup ───────────────────────────────────────────────
scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(
    lambda: purge_expired_models(model_cache),
    "interval",
    hours=1,
    id="purge_expired_models",
)
scheduler.start()


# ─── Helpers ──────────────────────────────────────────────────────────

def image_to_base64(img: Image.Image) -> str:
    """Convert a PIL Image to a base64-encoded JPEG string."""
    import base64

    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def get_model_expiry(uid: str) -> float | None:
    """Return the expiry timestamp for a model, or None if not found."""
    model_path = os.path.join(MODELS_DIR, f"{uid}.pkl")
    if not os.path.exists(model_path):
        return None
    created = os.path.getmtime(model_path)
    return created + (MODEL_EXPIRY_HOURS * 3600)


def is_model_valid(uid: str) -> bool:
    """Check if a model exists and has not expired."""
    expiry = get_model_expiry(uid)
    return expiry is not None and time.time() < expiry


def load_model(uid: str):
    """Load a model from cache or disk. Returns None if expired/missing."""
    # Demo model never expires
    if uid == "demo":
        return load_demo_model()

    if not is_model_valid(uid):
        model_cache.pop(uid, None)
        return None

    if uid in model_cache:
        return model_cache[uid]

    model_path = os.path.join(MODELS_DIR, f"{uid}.pkl")
    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            clf = pickle.load(f)
        model_cache[uid] = clf
        return clf
    return None


def load_demo_model():
    """Load the pre-trained demo model (Brad Pitt & Scarlett Johansson)."""
    if "demo" in model_cache:
        return model_cache["demo"]

    demo_path = os.path.join(MODELS_DIR, "demo.pkl")
    if os.path.exists(demo_path):
        with open(demo_path, "rb") as f:
            clf = pickle.load(f)
        model_cache["demo"] = clf
        return clf
    return None


# ─── Page Routes ──────────────────────────────────────────────────────

@app.route("/")
def landing_page():
    """Serve the landing page."""
    return send_file(os.path.join(FRONTEND_DIR, "index.html"))


@app.route("/demo")
def demo_page():
    """Serve the demo/simulation page."""
    return send_file(os.path.join(FRONTEND_DIR, "demo.html"))


@app.route("/create")
def create_page():
    """Serve the link creation page."""
    return send_file(os.path.join(FRONTEND_DIR, "create.html"))


@app.route("/<uid>")
def match_page(uid):
    """Serve the matcher page for a given session UID."""
    try:
        uuid.UUID(uid)
    except ValueError:
        return send_file(os.path.join(FRONTEND_DIR, "index.html")), 404
    return send_file(os.path.join(FRONTEND_DIR, "match.html"))


# ─── Static file serving ─────────────────────────────────────────────

@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "css"), filename)


@app.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "js"), filename)

@app.route("/celebrity-img/<path:filename>")
def serve_celebrity(filename):
    """Serve a celebrity image."""
    return send_from_directory(CELEBRITIES_DIR, filename)


@app.route("/demo-img/<name>")
def serve_demo_thumb(name):
    """Serve celebrity thumbnail images for the demo banner."""
    if name == "brad":
        return send_from_directory(CELEBRITIES_DIR, "brad_pitt.jpg")
    elif name == "scarlett":
        return send_from_directory(CELEBRITIES_DIR, "scarlett_johansson.jpg")
    return "", 404


# ─── API Routes ───────────────────────────────────────────────────────


@app.route("/api/setup", methods=["POST"])
def api_setup():
    """Train a model from uploaded P1 & P2 photos.

    Photos are processed in memory - never saved to disk.
    Returns: { uid, expires_at }
    """
    p1_files = request.files.getlist("p1")
    p2_files = request.files.getlist("p2")

    if not p1_files or not p2_files:
        return jsonify({"error": "Missing photos for Person 1 or Person 2"}), 400

    # Extract embeddings from uploaded photos (in memory only)
    p1_embeddings = []
    for f in p1_files:
        try:
            img = Image.open(f.stream).convert("RGB")
            emb = extract_candidate_embedding(img)
            if emb is not None:
                p1_embeddings.append(emb)
        except Exception:
            continue

    p2_embeddings = []
    for f in p2_files:
        try:
            img = Image.open(f.stream).convert("RGB")
            emb = extract_candidate_embedding(img)
            if emb is not None:
                p2_embeddings.append(emb)
        except Exception:
            continue

    if not p1_embeddings or not p2_embeddings:
        return jsonify({
            "error": "Could not detect faces in uploaded photos. Please use clear face photos."
        }), 400

    # Get background embeddings
    random_embeddings = get_random_embeddings(DATA_DIR)

    # Train model
    clf = train_model(p1_embeddings, p2_embeddings, random_embeddings)

    # Save model
    uid = str(uuid.uuid4())
    model_path = os.path.join(MODELS_DIR, f"{uid}.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)

    model_cache[uid] = clf

    expires_at = os.path.getmtime(model_path) + (MODEL_EXPIRY_HOURS * 3600)

    return jsonify({"uid": uid, "expires_at": expires_at})


@app.route("/api/status/<uid>", methods=["GET"])
def api_status(uid):
    """Check if a model UID is still valid and return time remaining."""
    expiry = get_model_expiry(uid)

    if expiry is None:
        return jsonify({"valid": False, "message": "Model not found."})

    remaining = expiry - time.time()
    if remaining <= 0:
        return jsonify({"valid": False, "message": "This link has expired."})

    return jsonify({
        "valid": True,
        "expires_at": expiry,
        "remaining_seconds": remaining,
    })


@app.route("/api/candidates", methods=["GET"])
def list_candidates():
    """Return a JSON list of all default candidate image filenames."""
    try:
        celebrities_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "celebrities")
        if not os.path.isdir(celebrities_dir):
            return jsonify({"candidates": []})
        files = sorted([
            f for f in os.listdir(celebrities_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
        ])
        return jsonify({"candidates": files})
    except Exception as e:
        return jsonify({"candidates": [], "error": str(e)})

@app.route("/api/random_celebrities", methods=["GET"])
def get_random_celebrities():
    """Return 5 random celebrities with their local image URLs."""
    count = int(request.args.get("count", 5))
    exclude = request.args.getlist("exclude[]")
    
    available = [c for c in CELEBRITIES if c not in exclude]
    if not available:
        return jsonify({"candidates": []})
        
    random.shuffle(available)
    celebrities_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "celebrities")
    
    results = []
    for name in available:
        if len(results) >= count:
            break
            
        filename = name.lower().replace(" ", "_").replace(".", "") + ".jpg"
        if os.path.exists(os.path.join(celebrities_dir, filename)):
            img_url = f"/celebrity-img/{filename}"
            results.append({"name": name, "url": img_url})
            
    return jsonify({"candidates": results})


# ─── Demo API Routes ─────────────────────────────────────────────────

@app.route("/api/demo/status", methods=["GET"])
def demo_status():
    """Check if the demo model is ready."""
    demo_path = os.path.join(MODELS_DIR, "demo.pkl")
    ready = os.path.exists(demo_path)
    return jsonify({"ready": ready})


@app.route("/api/demo/candidates", methods=["GET"])
def demo_candidates():
    """Return labeled candidate list for the demo page.

    Each candidate has: filename, name, type ('brad'|'scarlett'|'random').
    """
    candidates = []
    
    # Add Brad Pitt
    candidates.append({"filename": "brad_pitt.jpg", "name": "Brad Pitt", "type": "brad"})
    # Add Scarlett Johansson
    candidates.append({"filename": "scarlett_johansson.jpg", "name": "Scarlett Johansson", "type": "scarlett"})
    
    # Add all random
    available = [c for c in CELEBRITIES if c not in ["Brad Pitt", "Scarlett Johansson"]]
    random.shuffle(available)
    celebrities_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "celebrities")
    
    for name in available:
        filename = name.lower().replace(" ", "_").replace(".", "") + ".jpg"
        if os.path.exists(os.path.join(celebrities_dir, filename)):
            candidates.append({"filename": filename, "name": name, "type": "random"})
        
    return jsonify({"candidates": candidates})


@app.route("/api/match/<uid>", methods=["POST"])
def match(uid):
    """Run the matching engine for a given session."""
    clf = load_model(uid)
    if clf is None:
        return jsonify({
            "case": 0,
            "message": "This link has expired or the model was not found.",
        })

    if "partner" not in request.files:
        return jsonify({"case": 0, "message": "No partner picture uploaded."})

    partner_file = request.files["partner"]
    candidate_files = request.files.getlist("candidates")
    candidate_urls = request.form.getlist("candidate_urls")
    candidate_names = request.form.getlist("candidate_names")

    try:
        partner_img = Image.open(partner_file.stream).convert("RGB")
    except Exception:
        return jsonify({
            "case": 0,
            "message": "Invalid image. Please upload a valid photo.",
        })

    partner_embedding = extract_partner_embedding(partner_img)
    if partner_embedding is None:
        return jsonify({
            "case": 0,
            "message": "Could not detect exactly one face in the partner picture.",
        })

    # Partner classification
    p_pred_idx = clf.predict([partner_embedding])[0]
    p_class = CLASSES[p_pred_idx]

    # Process candidates
    candidate_data = []
    
    # Process files
    for c_file in candidate_files:
        try:
            c_img = Image.open(c_file.stream).convert("RGB")
            c_emb = extract_candidate_embedding(c_img)
            if c_emb is not None:
                c_pred_idx = clf.predict([c_emb])[0]
                c_class = CLASSES[c_pred_idx]
                c_conf = clf.predict_proba([c_emb])[0].max()
                dist = np.linalg.norm(partner_embedding - c_emb)
                candidate_data.append({
                    "img": c_img,
                    "class": c_class,
                    "conf": float(c_conf),
                    "dist": float(dist),
                })
        except Exception:
            continue
            
    # Process URLs
    for url, name in zip(candidate_urls, candidate_names):
        try:
            r = requests.get(url, timeout=5)
            c_img = Image.open(io.BytesIO(r.content)).convert("RGB")
            c_emb = extract_candidate_embedding(c_img)
            if c_emb is not None:
                c_pred_idx = clf.predict([c_emb])[0]
                c_class = CLASSES[c_pred_idx]
                c_conf = clf.predict_proba([c_emb])[0].max()
                dist = np.linalg.norm(partner_embedding - c_emb)
                candidate_data.append({
                    "img": c_img,
                    "class": c_class,
                    "conf": float(c_conf),
                    "dist": float(dist),
                })
        except Exception:
            continue

    partner_b64 = f"data:image/jpeg;base64,{image_to_base64(partner_img)}"

    if p_class == "p1":
        valid = [c for c in candidate_data if c["class"] == "p2"]
        if not valid:
            return jsonify({
                "case": 1,
                "message": "No suitable partner found.",
                "partner_class": "p1",
                "above_level": True,
            })
        valid.sort(key=lambda x: (-x["conf"], x["dist"]))
        best = valid[0]
        return jsonify({
            "case": 2,
            "message": "Best Match Found.",
            "partner_class": "p1",
            "cute_couple": True,
            "image": f"data:image/jpeg;base64,{image_to_base64(best['img'])}",
            "partner_image": partner_b64,
        })

    elif p_class == "p2":
        valid = [c for c in candidate_data if c["class"] == "p1"]
        if not valid:
            return jsonify({
                "case": 1,
                "message": "No suitable partner found.",
                "partner_class": "p2",
                "above_level": True,
            })
        valid.sort(key=lambda x: (-x["conf"], x["dist"]))
        best = valid[0]
        return jsonify({
            "case": 2,
            "message": "Best Match Found.",
            "partner_class": "p2",
            "cute_couple": True,
            "image": f"data:image/jpeg;base64,{image_to_base64(best['img'])}",
            "partner_image": partner_b64,
        })

    elif p_class == "random":
        valid = [c for c in candidate_data if c["class"] == "random"]
        if not valid:
            return jsonify({
                "case": 1,
                "message": "No partner was found.",
                "partner_class": "random",
                "above_level": False,
            })
        best = random.choice(valid)
        return jsonify({
            "case": 2,
            "message": "Match Processing Complete.",
            "partner_class": "random",
            "cute_couple": False,
            "image": f"data:image/jpeg;base64,{image_to_base64(best['img'])}",
            "partner_image": partner_b64,
        })


@app.route("/api/compare/<uid>", methods=["POST"])
def compare(uid):
    """Run a direct comparison between two partners for a given session."""
    clf = load_model(uid)
    if clf is None:
        return jsonify({
            "case": 0,
            "message": "This link has expired or the model was not found.",
        })

    if "partner1" not in request.files or "partner2" not in request.files:
        return jsonify({"case": 0, "message": "Both partners must be provided."})

    try:
        img1 = Image.open(request.files["partner1"].stream).convert("RGB")
        img2 = Image.open(request.files["partner2"].stream).convert("RGB")
    except Exception:
        return jsonify({"case": 0, "message": "Invalid image format."})

    emb1 = extract_partner_embedding(img1)
    emb2 = extract_partner_embedding(img2)

    if emb1 is None or emb2 is None:
        return jsonify({"case": 0, "message": "Could not detect exactly one face in both pictures."})

    p1_idx = clf.predict([emb1])[0]
    p1_class = CLASSES[p1_idx]
    
    p2_idx = clf.predict([emb2])[0]
    p2_class = CLASSES[p2_idx]
    
    img1_b64 = f"data:image/jpeg;base64,{image_to_base64(img1)}"
    img2_b64 = f"data:image/jpeg;base64,{image_to_base64(img2)}"

    # Check if they form the trained couple (p1 and p2 in any order)
    classes = {p1_class, p2_class}
    if "p1" in classes and "p2" in classes:
        return jsonify({
            "case": 2,
            "message": "Perfect Match Found.",
            "cute_couple": True,
            "suitability": 100,
            "image": img2_b64,
            "partner_image": img1_b64,
        })
    else:
        # Not the couple, give low percentage
        suitability = random.randint(0, 18)
        return jsonify({
            "case": 2,
            "message": "Comparison Complete.",
            "cute_couple": False,
            "suitability": suitability,
            "image": img2_b64,
            "partner_image": img1_b64,
        })


# ─── Entry point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    print(f"  Models expire after {MODEL_EXPIRY_HOURS} hours.")
    print(f"  Serving frontend from: {FRONTEND_DIR}")
    app.run(debug=True, port=5000, use_reloader=False)
