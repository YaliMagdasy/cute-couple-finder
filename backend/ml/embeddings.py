"""Face detection and embedding extraction using FaceNet."""

import os
import numpy as np
import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
mtcnn = MTCNN(keep_all=False, device=device)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)


def extract_partner_embedding(img: Image.Image) -> np.ndarray | None:
    """Extract embedding from an image that must contain exactly one face."""
    try:
        boxes, _ = mtcnn.detect(img)
        if boxes is None or len(boxes) != 1:
            return None
        with torch.no_grad():
            face = mtcnn(img)
            if face is None:
                return None
            embedding = resnet(face.unsqueeze(0).to(device)).cpu().numpy()[0]
            return embedding
    except Exception:
        return None


def extract_candidate_embedding(img: Image.Image) -> np.ndarray | None:
    """Extract embedding from a candidate image (single best face)."""
    try:
        with torch.no_grad():
            face = mtcnn(img)
            if face is None:
                return None
            embedding = resnet(face.unsqueeze(0).to(device)).cpu().numpy()[0]
            return embedding
    except Exception:
        return None


def get_random_embeddings(data_dir: str) -> list:
    """Load or compute background face embeddings for the 'random' class.

    Caches the result to ``<data_dir>/random_embeddings.npy`` for reuse.
    """
    cache_path = os.path.join(data_dir, "random_embeddings.npy")
    if os.path.exists(cache_path):
        return np.load(cache_path).tolist()

    embeddings = []
    print("Downloading 50 background faces into memory...")
    try:
        import urllib.request
        import json
        import io
        url = 'https://randomuser.me/api/?results=50'
        req = urllib.request.urlopen(url)
        data = json.loads(req.read().decode('utf-8'))
        for user in data['results']:
            img_url = user['picture']['large']
            try:
                img_req = urllib.request.urlopen(img_url)
                img_data = img_req.read()
                img = Image.open(io.BytesIO(img_data)).convert("RGB")
                emb = extract_candidate_embedding(img)
                if emb is not None:
                    embeddings.append(emb)
            except Exception:
                continue
    except Exception as e:
        print(f"Failed to generate random embeddings: {e}")

    if embeddings:
        np.save(cache_path, np.array(embeddings))
    return embeddings
