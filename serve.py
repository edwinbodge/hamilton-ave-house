"""Serve the house model locally with caching disabled, so edits always show up.

    python3 serve.py            # then open http://localhost:8742
"""
import functools
import http.server
import json
import os
import time

PORT = 8742


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # Creekside editor (local only): each save posts the full edit state here, so the edits you
    # make while walking around land in creekside/edits-capture.json for baking into the defaults.
    def do_POST(self):
        folder = {"/__creekside-edits": "creekside", "/__susan-edits": "susan-ln"}.get(self.path)
        if not folder:
            self.send_error(404)
            return
        n = int(self.headers.get("Content-Length") or 0)
        data = json.loads(self.rfile.read(n) or b"{}")
        out = os.path.join(self.directory, folder, "edits-capture.json")
        with open(out, "w") as f:
            json.dump({"saved": time.strftime("%Y-%m-%d %H:%M:%S"), "edits": data}, f, indent=1)
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCache, directory=root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"House model at http://localhost:{PORT}")
        httpd.serve_forever()
