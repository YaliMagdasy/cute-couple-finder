"""Scheduled cleanup of expired model files."""

import os
import time

from config import MODELS_DIR, MODEL_EXPIRY_HOURS


def purge_expired_models(model_cache: dict | None = None) -> int:
    """Delete model .pkl files older than MODEL_EXPIRY_HOURS.

    Also removes their entries from the in-memory *model_cache* dict
    if provided.

    Returns the number of models purged.
    """
    if not os.path.isdir(MODELS_DIR):
        return 0

    max_age_seconds = MODEL_EXPIRY_HOURS * 3600
    now = time.time()
    purged = 0

    for fname in os.listdir(MODELS_DIR):
        if not fname.endswith(".pkl"):
            continue
        fpath = os.path.join(MODELS_DIR, fname)
        try:
            age = now - os.path.getmtime(fpath)
            if age > max_age_seconds:
                os.remove(fpath)
                uid = fname.replace(".pkl", "")
                if model_cache and uid in model_cache:
                    del model_cache[uid]
                purged += 1
                print(f"[cleanup] Purged expired model: {fname}")
        except Exception as e:
            print(f"[cleanup] Error processing {fname}: {e}")

    return purged
