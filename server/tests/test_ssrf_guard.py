import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ssrf_guard import is_safe_remote_url


def test_rejects_loopback():
    assert is_safe_remote_url('http://127.0.0.1/secret') is False
    assert is_safe_remote_url('http://localhost:5000/api/datasets') is False


def test_rejects_cloud_metadata_address():
    assert is_safe_remote_url('http://169.254.169.254/latest/meta-data/') is False


def test_rejects_private_ranges():
    assert is_safe_remote_url('http://10.0.0.5/internal') is False
    assert is_safe_remote_url('http://192.168.1.1/router') is False
    assert is_safe_remote_url('http://172.16.5.5/') is False


def test_rejects_non_http_scheme():
    assert is_safe_remote_url('file:///etc/passwd') is False
    assert is_safe_remote_url('ftp://example.com/x') is False


def test_allows_public_ip_https_url():
    # A literal public IP avoids a real DNS lookup, keeping this test hermetic.
    assert is_safe_remote_url('https://93.184.216.34/photo.jpg') is True
