import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
from ai_models import run_ai_prediction


def _blank_image():
    # A flat gray image with no salient contours -> the heuristic detector's
    # default fallback path (a single center bbox) always fires deterministically.
    return np.full((200, 200, 3), 128, dtype=np.uint8)


def test_custom_classes_filters_out_non_matching_detections():
    img = _blank_image()
    # heuristic-local model always returns className "objeto_principal" for a blank image.
    result = run_ai_prediction(img, model_id='heuristic-local', custom_classes=['does_not_exist'])
    assert result['success'] is True
    assert result['detections'] == []


def test_custom_classes_keeps_matching_detections():
    img = _blank_image()
    result = run_ai_prediction(img, model_id='heuristic-local', custom_classes=['objeto_principal'])
    assert result['success'] is True
    assert len(result['detections']) >= 1
    assert all(d['className'] == 'objeto_principal' for d in result['detections'])


def test_no_custom_classes_returns_everything():
    img = _blank_image()
    result = run_ai_prediction(img, model_id='heuristic-local')
    assert result['success'] is True
    assert len(result['detections']) >= 1
