import numpy as np
import pytest

from app.services.embedding import cosine_similarity


def test_cosine_similarity_is_one_for_identical_vectors() -> None:
    assert cosine_similarity([1.0, 2.0], [1.0, 2.0]) == pytest.approx(1.0)


def test_cosine_similarity_rejects_invalid_vectors() -> None:
    with pytest.raises(ValueError):
        cosine_similarity([1.0], [1.0, 2.0])

    with pytest.raises(ValueError):
        cosine_similarity(np.zeros(2), np.ones(2))
