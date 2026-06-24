"""Generate the demo model for the simulation page.

Trains a model on Brad Pitt (bf) and Scarlett Johansson (gf) training images
and saves it as the demo model. Run this once before using the demo page.

Usage:
    cd backend
    python scripts/setup_demo.py
"""

import os
import sys
import pickle
import numpy as np
from PIL import Image

# Ensure backend is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DATA_DIR, MODELS_DIR
from ml.embeddings import extract_candidate_embedding, get_random_embeddings
from ml.trainer import train_model

PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
BF_DIR = os.path.join(PROCESSED_DIR, "bf")
GF_DIR = os.path.join(PROCESSED_DIR, "gf")
DEMO_MODEL_PATH = os.path.join(MODELS_DIR, "demo.pkl")


def extract_embeddings_from_dir(directory, label):
    """Extract face embeddings from all images in a directory."""
    embeddings = []
    files = sorted([
        f for f in os.listdir(directory)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
    ])
    
    for fname in files:
        fpath = os.path.join(directory, fname)
        try:
            img = Image.open(fpath).convert('RGB')
            emb = extract_candidate_embedding(img)
            if emb is not None:
                embeddings.append(emb)
                print(f"  OK {fname}")
            else:
                print(f"  FAIL {fname} (no face detected)")
        except Exception as e:
            print(f"  FAIL {fname} ({e})")
    
    return embeddings


def main():
    print("=" * 47)
    print("  Cute Couple Finder - Demo Model Setup")
    print("=" * 47 + "\n")
    
    # Check training data exists
    if not os.path.isdir(BF_DIR) or not os.listdir(BF_DIR):
        print(f"ERROR: No Brad Pitt training images in {BF_DIR}")
        print("Run download_default_celebs.py first, or add images manually.")
        sys.exit(1)
    
    if not os.path.isdir(GF_DIR) or not os.listdir(GF_DIR):
        print(f"ERROR: No Scarlett Johansson training images in {GF_DIR}")
        sys.exit(1)
    
    # Extract BF (Brad Pitt) embeddings
    print("Extracting Brad Pitt embeddings...")
    bf_embeddings = extract_embeddings_from_dir(BF_DIR, "bf")
    print(f"   -> {len(bf_embeddings)} embeddings\n")
    
    # Extract GF (Scarlett Johansson) embeddings
    print("Extracting Scarlett Johansson embeddings...")
    gf_embeddings = extract_embeddings_from_dir(GF_DIR, "gf")
    print(f"   -> {len(gf_embeddings)} embeddings\n")
    
    # Get random (background) embeddings
    print("Loading background face embeddings...")
    random_embeddings = get_random_embeddings(DATA_DIR)
    print(f"   -> {len(random_embeddings)} embeddings\n")
    
    if not bf_embeddings or not gf_embeddings:
        print("ERROR: Could not extract enough embeddings. Check your images.")
        sys.exit(1)
    
    # Train model
    print("Training demo model...")
    clf = train_model(bf_embeddings, gf_embeddings, random_embeddings)
    
    # Save
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(DEMO_MODEL_PATH, 'wb') as f:
        pickle.dump(clf, f)
    
    print(f"\nDemo model saved to: {DEMO_MODEL_PATH}")
    print(f"   BF samples: {len(bf_embeddings)}")
    print(f"   GF samples: {len(gf_embeddings)}")
    print(f"   Random samples: {len(random_embeddings)}")
    print("\nThe demo page is now ready! Start the server with: python app.py")


if __name__ == "__main__":
    main()
