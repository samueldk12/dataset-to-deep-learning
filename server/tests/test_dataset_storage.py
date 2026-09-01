"""
Regression tests for server/app.py's disk-based dataset storage:
- path traversal via an attacker-controlled image `id`
- a crash when a class entry is missing its `id` field
"""
import os

# 1x1 transparent PNG
TINY_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def test_malicious_image_id_cannot_write_outside_dataset_folder(client, datasets_dir):
    payload = {
        'id': 'proj_traversal_test',
        'name': 'Traversal Test',
        'classes': [{'id': 'cls_1', 'name': 'Test'}],
        'images': [
            {
                'id': '../../../../evil_escape',
                'url': TINY_PNG_DATA_URL,
                'width': 1,
                'height': 1,
                'annotations': [],
            }
        ],
    }
    res = client.post('/api/datasets', json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True

    # The sanitized id keeps the alnum/underscore characters ("evil_escape") but
    # strips every '.' and '/' -- so a file legitimately named evil_escape.* may
    # exist, but only *inside* this dataset's own folder, never above it.
    project_folder = os.path.join(str(datasets_dir), 'proj_traversal_test')
    for root, _dirs, files in os.walk(datasets_dir.parent):
        for f in files:
            if 'evil_escape' in f:
                full_path = os.path.join(root, f)
                assert full_path.startswith(project_folder), (
                    f"path traversal wrote a file outside the dataset folder: {full_path}"
                )

    # The sanitized image should have landed inside its own dataset folder instead.
    images_dir = os.path.join(project_folder, 'images')
    assert os.path.isdir(images_dir)
    written = os.listdir(images_dir)
    assert len(written) == 1
    assert '..' not in written[0] and '/' not in written[0] and '\\' not in written[0]


def test_class_missing_id_does_not_crash_save(client):
    payload = {
        'id': 'proj_missing_class_id',
        'name': 'Missing Class Id Test',
        'classes': [{'name': 'NoIdHere'}],  # no 'id' key
        'images': [],
    }
    res = client.post('/api/datasets', json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
