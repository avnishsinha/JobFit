from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


def signup(client: TestClient, email: str) -> None:
    response = client.post("/auth/signup", json={"email": email, "password": "correct horse battery"})
    assert response.status_code == 201


def test_auth_and_private_resource_authorization(client: TestClient) -> None:
    signup(client, "a@example.com")
    job = client.post(
        "/jobs",
        json={"title": "Backend Engineer", "description": "Experience with Python."},
    )
    assert job.status_code == 201
    job_id = job.json()["id"]

    client.post("/auth/logout")
    signup(client, "b@example.com")

    assert client.get("/jobs").json() == []
    assert client.delete(f"/jobs/{job_id}").status_code == 404


def test_unauthenticated_resources_are_rejected(client: TestClient) -> None:
    assert client.get("/resumes").status_code == 401
    assert client.get("/analyses").status_code == 401


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    signup(client, "same@example.com")
    client.post("/auth/logout")
    response = client.post(
        "/auth/signup",
        json={"email": "same@example.com", "password": "correct horse battery"},
    )
    assert response.status_code == 409
