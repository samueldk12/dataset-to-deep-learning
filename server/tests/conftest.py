import os
import sys

SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

import pytest
import app as app_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Flask test client with DATASETS_DIR redirected to an isolated temp folder,
    so tests never read/write the real data/datasets/ directory."""
    monkeypatch.setattr(app_module, 'DATASETS_DIR', str(tmp_path))
    app_module.app.config['TESTING'] = True
    with app_module.app.test_client() as c:
        yield c


@pytest.fixture
def datasets_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, 'DATASETS_DIR', str(tmp_path))
    return tmp_path
