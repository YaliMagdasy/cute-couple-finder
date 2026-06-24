import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data paths
DATA_DIR = os.path.join(BASE_DIR, "data")

# Models
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Candidates
CELEBRITIES_DIR = os.path.join(BASE_DIR, "static", "celebrities")
DEFAULTS_DIR = os.path.join(BASE_DIR, "static", "defaults")


# Frontend
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

# Model expiry
MODEL_EXPIRY_HOURS = 24

# ML
CLASSES = ["p1", "p2", "random"]
EMBEDDING_DIM = 512
