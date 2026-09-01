"""
Regression tests for /api/pipeline/run-code.

The endpoint execs user-submitted code against a curated 'safe_globals' dict.
Before the fix, that dict never set '__builtins__', so CPython silently injected
the real builtins module into it -- giving any caller full access to
__import__, open, eval, etc. (a full RCE, not a sandbox at all).
"""


def test_legitimate_pipeline_code_still_works(client):
    code = (
        "result_annotations = [a for a in annotations if a.get('classId') == 'cls_car']\n"
    )
    annotations = [
        {'id': '1', 'classId': 'cls_car'},
        {'id': '2', 'classId': 'cls_ped'},
        {'id': '3', 'classId': 'cls_car'},
    ]
    res = client.post('/api/pipeline/run-code', json={'code': code, 'annotations': annotations})
    data = res.get_json()
    assert res.status_code == 200
    assert data['success'] is True
    assert data['count'] == 2
    assert {a['id'] for a in data['result_annotations']} == {'1', '3'}


def test_builtins_are_not_reachable_from_submitted_code(client):
    # Merely resolving the name __import__ raises NameError before the call would
    # even happen -- enough to prove the sandbox boundary holds without ever
    # executing an import or touching the filesystem.
    code = "__import__('os')\n"
    res = client.post('/api/pipeline/run-code', json={'code': code, 'annotations': []})
    data = res.get_json()
    assert res.status_code == 400
    assert data['success'] is False
    assert "'__import__' is not defined" in data['error']


def test_open_builtin_is_not_reachable_from_submitted_code(client):
    code = "open('nonexistent.txt')\n"
    res = client.post('/api/pipeline/run-code', json={'code': code, 'annotations': []})
    data = res.get_json()
    assert res.status_code == 400
    assert data['success'] is False
    assert "'open' is not defined" in data['error']
