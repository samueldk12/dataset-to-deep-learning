"""
Best-effort SSRF guard for server-side outbound HTTP requests triggered by
client-supplied URLs (remote image fetch, webhook callbacks, etc).

Resolves the hostname and rejects it if any resolved address is loopback,
private, link-local, reserved, or multicast (this covers 127.0.0.0/8,
10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 including the
cloud metadata address 169.254.169.254, and IPv6 equivalents).

This is not a defense against DNS rebinding (the resolved IP could change
between this check and the actual request) -- for that, requests would need
to be pinned to the checked IP. It does stop the common case of a client
pointing the server at an internal service or a metadata endpoint.
"""
import ipaddress
import socket
from urllib.parse import urlparse


def is_safe_remote_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False

        addr_info = socket.getaddrinfo(hostname, None)
        if not addr_info:
            return False

        for family, _type, _proto, _canonname, sockaddr in addr_info:
            ip = ipaddress.ip_address(sockaddr[0])
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            ):
                return False
        return True
    except Exception:
        return False
