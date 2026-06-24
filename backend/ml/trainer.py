"""Train an SVC classifier for the couple matcher."""

import numpy as np
from sklearn.svm import SVC


def train_model(
    p1_embeddings: list[np.ndarray],
    p2_embeddings: list[np.ndarray],
    random_embeddings: list[np.ndarray],
) -> SVC:
    """Train a linear SVC on person1, person2, and random embeddings.

    Labels: 0 = p1, 1 = p2, 2 = random.
    Returns the fitted classifier.
    """
    X = list(p1_embeddings) + list(p2_embeddings) + list(random_embeddings)
    y = (
        [0] * len(p1_embeddings)
        + [1] * len(p2_embeddings)
        + [2] * len(random_embeddings)
    )

    X = np.array(X)
    y = np.array(y)

    clf = SVC(C=1.0, kernel="linear", probability=True)
    clf.fit(X, y)
    return clf
