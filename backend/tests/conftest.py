from types import SimpleNamespace

import pytest

from app.auth.security import get_current_user
from app.main import app


@pytest.fixture
def authenticated_engineer():
    previous_overrides = app.dependency_overrides.copy()

    def override_current_user():
        return SimpleNamespace(
            id="00000000-0000-0000-0000-000000000001",
            username="test-engineer",
            role="engineer",
        )

    app.dependency_overrides[get_current_user] = override_current_user

    try:
        yield
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)