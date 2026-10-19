#!/usr/bin/env python3
"""Copy the public Robin Thurin portfolio into dist for GitHub Pages."""
from collections import deque
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlparse
from urllib.request import Request, urlopen

SOURCE = "https://robin-thurin-portfolio.robinthurin0212.chatgpt.site/"
TARGET = "https://robinthurin0212-design.github.io"
HOST = urlparse(SOURCE).netloc
ROOT = Path("dist")
ROOT.mkdir(exist_ok=True)
EXTENSIONS = {".html", ".css", ".js", ".mjs", ".json", ".png", ".jpg", ".jpeg",
              ".webp", ".gif", ".svg", ".ico", ".woff", ".woff2",
              ".ttf", ".otf", ".pdf", ".mp4", ".webm", ".txt", ".xml"}
queue = deque(["/"])
seen, fetched, failed = set(), [], []

def discover(text, current):
    urls = set(re.findall(r"""(?:src|href|poster|content)\s*=\s*["']([^"'#]+)""", text, re.I))
    urls.update(re.findall(r"""(?:/|\.?\./)?assets/[A-Za-z0-9_./%+@-]+""", text))
    urls.update(re.findall(r"""url\(\s*["']?([^)"']+)""", text))
    urls.update(re.findall(r"""["'](\./[A-Za-z0-9_./-]+\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?))["']""", text))
    found = set()
    base = urljoin(SOURCE, current.lstrip("/"))
    for item in urls:
        item = item.split("?", 1)[0].strip()
        if not item or item.startswith(("data:", "mailto:", "tel:", "#")):
            continue
        parsed = urlparse(urljoin(base, item))
        if parsed.netloc != HOST:
            continue
        path = unquote(parsed.path)
        if (path == "/" or Path(path).suffix.lower() in EXTENSIONS
                or (not Path(path).suffix and re.fullmatch(r"/[A-Za-z0-9_/-]*", path) and not path.startswith(("/cdn-cgi/", "/api/")))):
            found.add(path)
    return found

while queue:
    path = queue.popleft()
    if path in seen:
        continue
    seen.add(path)
    if len(seen) > 300:
        raise SystemExit("Unexpected number of pages or assets.")
    try:
        url = urljoin(SOURCE, path.lstrip("/"))
        with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as response:
            data = response.read()
            content_type = response.headers.get("Content-Type", "")
    except (HTTPError, URLError, TimeoutError) as exc:
        failed.append((path, str(exc)))
        continue
    is_page = path == "/" or (not Path(path).suffix and "text/html" in content_type)
    dest = ROOT / (("index.html" if path == "/" else path.strip("/") + "/index.html") if is_page else path.lstrip("/"))
    dest.parent.mkdir(parents=True, exist_ok=True)
    if "text/" in content_type or "javascript" in content_type or dest.suffix in {".js", ".css", ".svg", ".json"}:
        body = data.decode("utf-8", errors="replace")
        if "text/html" in content_type:
            body = re.sub(r"<script>[^<]*__CF\\$cv\\$params.*?</script>", "", body, flags=re.S)
        queue.extend(sorted(discover(body, path) - seen))
        data = body.replace(SOURCE.rstrip("/"), TARGET).encode("utf-8")
    dest.write_bytes(data)
    fetched.append(path)
    print(f"Fetched {path}: {len(data)} bytes")
    if is_page:
        print(f"Page {path} title: {re.findall(r'<title[^>]*>(.*?)</title>', data.decode('utf-8', errors='replace'), re.I | re.S)[:1]}")

index = ROOT / "index.html"
if not index.exists() or index.stat().st_size < 300:
    raise SystemExit("The public homepage could not be fetched.")
if "<script" in index.read_text(errors="replace") and not any(p.endswith(".js") for p in fetched):
    raise SystemExit("The JavaScript bundle could not be fetched.")
(ROOT / "404.html").write_bytes(index.read_bytes())
(ROOT / ".nojekyll").write_text("")
print(f"Published resources: {len(fetched)}; unavailable resources: {failed}")
