#!/usr/bin/env python3
"""
Minimal GitHub org collector (objective data only).

- Fast and simple: no file trees, no GitIngest, no subjective analysis.
- Uses GraphQL for aggregate counts (issues/PRs/releases) so large repos are cheap.
- Gets exact contributor count with ONE REST request (per_page=1 + Link: rel="last").

Usage:
  python org_collect_min.py --org ethereum-optimism --out optimism.json --csv optimism.csv

Env:
  GITHUB_TOKEN   (recommended)
"""

import os, csv, json, time, argparse, logging, re, requests
from typing import Any, Dict, List, Optional

# ------------- Config / Headers -------------
API_BASE = "https://api.github.com"
GRAPHQL_URL = "https://api.github.com/graphql"
API_VERSION = "2022-11-28"
TOKEN = os.getenv("GITHUB_TOKEN")

REST_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}),
}
GQL_HEADERS = {
    "Accept": "application/vnd.github+json",
    **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}),
}

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("collector")

# ------------- HTTP helpers -------------
def http_get(url: str, params=None, retries=3, timeout=30):
    for i in range(retries):
        r = requests.get(url, headers=REST_HEADERS, params=params, timeout=timeout)
        if r.status_code in (502, 503, 504):
            time.sleep(1.5 * (i + 1)); continue
        if r.status_code == 403 and "rate limit" in r.text.lower():
            _sleep_until_reset(r); continue
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r
    r.raise_for_status()
    return r

def http_post(url: str, body: dict, retries=3, timeout=30):
    for i in range(retries):
        r = requests.post(url, headers=GQL_HEADERS, json=body, timeout=timeout)
        if r.status_code in (502, 503, 504):
            time.sleep(1.5 * (i + 1)); continue
        if r.status_code == 403 and "rate limit" in r.text.lower():
            _sleep_until_reset(r); continue
        r.raise_for_status()
        return r
    r.raise_for_status()
    return r

def _sleep_until_reset(resp: requests.Response):
    reset = resp.headers.get("X-RateLimit-Reset")
    wait = max(int(reset) - int(time.time()) + 2, 2) if reset else 10
    log.warning(f"Rate limit reached; sleeping {wait}s")
    time.sleep(wait)

def paginate(url: str, params=None, per_page=100):
    page = 1
    while True:
        p = dict(params or {}); p.update({"per_page": per_page, "page": page})
        r = http_get(url, params=p)
        if r is None: return
        items = r.json()
        if not isinstance(items, list) or not items: break
        for it in items: yield it
        if len(items) < per_page: break
        page += 1

# ------------- GraphQL aggregate counts -------------
GQL_COUNTS = """
query($owner:String!, $name:String!){
  repository(owner:$owner, name:$name){
    stargazerCount
    forkCount
    watchers { totalCount }
    issues(states: OPEN) { totalCount }
    issuesClosed: issues(states: CLOSED) { totalCount }
    pullRequests(states: OPEN) { totalCount }
    pullRequestsClosed: pullRequests(states: CLOSED) { totalCount }
    pullRequestsMerged: pullRequests(states: MERGED) { totalCount }
    releases { totalCount }
    defaultBranchRef {
      target {
        ... on Commit {
          committedDate
          history(first:1){ edges { node { committedDate } } }
        }
      }
    }
  }
}
"""

def repo_counts(owner: str, name: str) -> Dict[str, Any]:
    r = http_post(GRAPHQL_URL, {"query": GQL_COUNTS, "variables": {"owner": owner, "name": name}})
    data = r.json()
    if "errors" in data:
        return {}
    repo = (data.get("data") or {}).get("repository") or {}
    dbr = (repo.get("defaultBranchRef") or {}).get("target") or {}
    # prefer history edge date if present
    edges = ((dbr.get("history") or {}).get("edges") or [])
    last_commit = edges[0]["node"]["committedDate"] if edges else dbr.get("committedDate")
    return {
        "stars": repo.get("stargazerCount"),
        "forks": repo.get("forkCount"),
        "watchers": (repo.get("watchers") or {}).get("totalCount"),
        "issues_open": (repo.get("issues") or {}).get("totalCount"),
        "issues_closed": (repo.get("issuesClosed") or {}).get("totalCount"),
        "prs_open": (repo.get("pullRequests") or {}).get("totalCount"),
        "prs_closed": (repo.get("pullRequestsClosed") or {}).get("totalCount"),
        "prs_merged": (repo.get("pullRequestsMerged") or {}).get("totalCount"),
        "releases": (repo.get("releases") or {}).get("totalCount"),
        "last_commit_at": last_commit,
    }

# ------------- Small helpers -------------
def list_org_repos(org: str, include_archived=False, include_forks=False, max_repos=0) -> List[dict]:
    url = f"{API_BASE}/orgs/{org}/repos"
    out = []
    for repo in paginate(url, params={"type": "all", "sort": "full_name"}):
        if not include_archived and repo.get("archived"): continue
        if not include_forks and repo.get("fork"): continue
        out.append(repo)
        if max_repos and len(out) >= max_repos: break
    return out

def get_topics(owner: str, name: str) -> List[str]:
    r = http_get(f"{API_BASE}/repos/{owner}/{name}/topics")
    return (r.json() or {}).get("names", []) if r else []

def get_languages_pct(owner: str, name: str) -> Dict[str, float]:
    r = http_get(f"{API_BASE}/repos/{owner}/{name}/languages")
    data = r.json() if r else {}
    total = sum(data.values()) or 1
    return {k: round(v * 100.0 / total, 2) for k, v in data.items()}

def get_contributor_count_exact(owner: str, name: str) -> int:
    """
    Exact count with a single request:
    - per_page=1 -> Link header has rel="last" page number = total items
    - includes anon=true to count anonymous web/email users
    """
    r = http_get(f"{API_BASE}/repos/{owner}/{name}/contributors",
                 params={"per_page": 1, "anon": "true"})
    if not r: return 0
    link = r.headers.get("Link", "")
    m = re.search(r'[?&]page=(\d+)>;\s*rel="last"', link)
    if m:
        return int(m.group(1))  # total == last page when per_page=1
    # If only one page, either Link missing or single result
    data = r.json()
    return len(data) if isinstance(data, list) else 0

# ------------- Collector -------------
def collect_repo(repo: dict) -> Dict[str, Any]:
    owner = repo["owner"]["login"]
    name  = repo["name"]
    counts = repo_counts(owner, name)
    topics = get_topics(owner, name)
    langs  = get_languages_pct(owner, name)
    contributors = get_contributor_count_exact(owner, name)

    return {
        "full_name": repo["full_name"],
        "html_url": repo["html_url"],
        "description": repo.get("description"),
        "created_at": repo.get("created_at"),
        "updated_at": repo.get("updated_at"),
        "pushed_at": repo.get("pushed_at"),
        "default_branch": repo.get("default_branch"),
        "archived": repo.get("archived", False),
        "fork": repo.get("fork", False),
        "license": (repo.get("license") or {}).get("name") if repo.get("license") else None,
        "topics": topics,
        "languages_pct": langs,

        # Agg counts (no pagination)
        "stars": counts.get("stars"),
        "forks": counts.get("forks"),
        "watchers": counts.get("watchers"),
        "issues_open": counts.get("issues_open"),
        "issues_closed": counts.get("issues_closed"),
        "prs_open": counts.get("prs_open"),
        "prs_closed": counts.get("prs_closed"),
        "prs_merged": counts.get("prs_merged"),
        "releases": counts.get("releases"),
        "last_commit_at": counts.get("last_commit_at"),

        # Exact, cheap
        "contributors_count": contributors,

        "collected_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

# ------------- CSV -------------
CSV_FIELDS = [
    "full_name","archived","fork","license",
    "stars","forks","watchers",
    "issues_open","issues_closed","prs_open","prs_closed","prs_merged",
    "releases","contributors_count",
    "created_at","updated_at","pushed_at","last_commit_at",
    "top_language","topics",
]

def to_csv_rows(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows = []
    for it in items:
        langs = it.get("languages_pct", {})
        top_lang = max(langs.items(), key=lambda kv: kv[1])[0] if langs else ""
        rows.append({
            "full_name": it["full_name"],
            "archived": it.get("archived", False),
            "fork": it.get("fork", False),
            "license": it.get("license") or "",
            "stars": it.get("stars", 0),
            "forks": it.get("forks", 0),
            "watchers": it.get("watchers", 0),
            "issues_open": it.get("issues_open", 0),
            "issues_closed": it.get("issues_closed", 0),
            "prs_open": it.get("prs_open", 0),
            "prs_closed": it.get("prs_closed", 0),
            "prs_merged": it.get("prs_merged", 0),
            "releases": it.get("releases", 0),
            "contributors_count": it.get("contributors_count", 0),
            "created_at": it.get("created_at") or "",
            "updated_at": it.get("updated_at") or "",
            "pushed_at": it.get("pushed_at") or "",
            "last_commit_at": it.get("last_commit_at") or "",
            "top_language": top_lang,
            "topics": ",".join(it.get("topics", [])),
        })
    return rows

# ------------- CLI -------------
def main():
    ap = argparse.ArgumentParser(description="Minimal GitHub org collector (objective data only).")
    ap.add_argument("--org", required=True)
    ap.add_argument("--include-archived", action="store_true")
    ap.add_argument("--include-forks", action="store_true")
    ap.add_argument("--max-repos", type=int, default=0)
    ap.add_argument("--out", help="Write JSON to this file")
    ap.add_argument("--csv", help="Also write CSV to this file")
    args = ap.parse_args()

    repos = list_org_repos(args.org, args.include_archived, args.include_forks, args.max_repos)
    log.info(f"Found {len(repos)} repos in {args.org}")

    items = []
    for i, repo in enumerate(repos, 1):
        name = repo["full_name"]
        try:
            data = collect_repo(repo)
            items.append(data)
            log.info(f"[{i}/{len(repos)}] {name} ✓")
            time.sleep(0.05)  # gentle pacing
        except Exception as e:
            log.warning(f"[{i}/{len(repos)}] {name} failed: {e}")

    if args.out:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)
        log.info(f"Wrote JSON → {args.out}")
    else:
        print(json.dumps(items, indent=2))

    if args.csv:
        rows = to_csv_rows(items)
        os.makedirs(os.path.dirname(args.csv) or ".", exist_ok=True)
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            w.writeheader(); w.writerows(rows)
        log.info(f"Wrote CSV → {args.csv}")

if __name__ == "__main__":
    main()
