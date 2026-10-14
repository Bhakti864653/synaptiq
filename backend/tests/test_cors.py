import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def preflight(origin):
    return client.options(
        "/quiz/generate",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )


@pytest.mark.parametrize(
    "origin",
    [
        "https://synaptiq-eta.vercel.app",
        "http://localhost:3000",
        "https://synaptiq-a1b2c3d4e-bhakti864653s-projects.vercel.app",
    ],
)
def test_allowed_origins(origin):
    r = preflight(origin)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == origin


@pytest.mark.parametrize(
    "origin",
    [
        "https://evil.vercel.app",
        "https://synaptiq-a1b2c3d4e-someoneelse.vercel.app",
        "https://synaptiq-abc-x-bhakti864653s-projects.vercel.app",
        "https://other-a1b2c3d4e-bhakti864653s-projects.vercel.app",
        "https://synaptiq-a1b2c3d4e-bhakti864653s-projects.vercel.app.evil.com",
        "http://synaptiq-a1b2c3d4e-bhakti864653s-projects.vercel.app",
    ],
)
def test_rejected_origins(origin):
    r = preflight(origin)
    assert "access-control-allow-origin" not in r.headers
