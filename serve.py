"""Serve the house model locally with caching disabled, so edits always show up.

    python3 serve.py            # then open http://localhost:8742
"""
import functools
import http.server
import os

PORT = 8742


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCache, directory=root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"House model at http://localhost:{PORT}")
        httpd.serve_forever()
