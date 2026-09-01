"""
Regression tests for server/mcp_server.py.

annotatex_ai_predict previously read preds['predictions'], but run_ai_prediction()
(server/ai_models.py) returns the key 'detections' -- so every successful call
raised a KeyError and the MCP tool call failed with a 500, even though a
correctly-decoded image and valid detections were available the whole time.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from mcp_server import handle_mcp_request

TINY_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def test_ai_predict_tool_call_does_not_crash_on_success():
    request_data = {
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'tools/call',
        'params': {
            'name': 'annotatex_ai_predict',
            'arguments': {
                'image_data': TINY_PNG_DATA_URL,
                # 'heuristic-local' avoids needing real YOLO weights/ultralytics installed.
                'model_id': 'heuristic-local',
            },
        },
    }

    response = handle_mcp_request(request_data)

    assert 'error' not in response
    assert response['result']['content'][0]['type'] == 'text'
    summary_text = response['result']['content'][0]['text']
    assert 'Total de objetos detectados' in summary_text
    # Would previously raise KeyError('predictions') before this text was ever produced.


def test_tools_list_advertises_all_tools():
    response = handle_mcp_request({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list'})
    tool_names = {t['name'] for t in response['result']['tools']}
    assert 'annotatex_ai_predict' in tool_names
    assert 'annotatex_create_dataset' in tool_names


def test_unimplemented_advertised_tool_reports_honestly_instead_of_fake_success():
    # annotatex_merge_annotations is listed in tools/list but has no real handler
    # (it needs dataset/image context the current input schema doesn't carry).
    # It must not claim to have succeeded.
    response = handle_mcp_request({
        'jsonrpc': '2.0',
        'id': 3,
        'method': 'tools/call',
        'params': {'name': 'annotatex_merge_annotations', 'arguments': {'annotation_ids': ['a', 'b']}},
    })
    assert response['result'].get('isError') is True
    text = response['result']['content'][0]['text']
    assert 'não' in text.lower() or 'not' in text.lower()


def test_unknown_tool_name_returns_json_rpc_error():
    response = handle_mcp_request({
        'jsonrpc': '2.0',
        'id': 4,
        'method': 'tools/call',
        'params': {'name': 'totally_made_up_tool', 'arguments': {}},
    })
    assert 'error' in response
    assert response['error']['code'] == -32602
