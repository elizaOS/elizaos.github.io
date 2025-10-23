name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
    paths:
      - "src/**"
      - ".github/workflows/deploy.yml"
      - "package.json"
  workflow_dispatch:
  workflow_run:
    workflows: ["Run Pipelines"]
    branches: [main]
    types: [completed]

permissions:
  contents: write
  pages: write
  id-token: write

# Allow one concurrent deployment
concurrency:
  group: "pages"
  cancel-in-progress: true

env:
  DATA_DIR: "data"
  PIPELINE_DATA_BRANCH: "_data"

jobs:
  build-and-deploy:
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout main branch
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      # Set up pipeline-data branch and restore data
      - name: Setup pipeline-data branch
        uses: ./.github/actions/pipeline-data
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          operation: setup
          branch_name: ${{ env.PIPELINE_DATA_BRANCH }}
          data_dir: ${{ env.DATA_DIR }}

      # Restore database from dump
      - name: Restore database
        uses: ./.github/actions/restore-db
        with:
          operation: restore
          dump_dir: ${{ env.DATA_DIR }}/dump
          db_path: ${{ env.DATA_DIR }}/db.sqlite

      - name: Copy yesterday's stats for all tracked repositories
        run: |
          YESTERDAY=$(date -d "yesterday" +'%Y-%m-%d')
          shopt -s nullglob
          for file in data/*/stats/day/stats_${YESTERDAY}.json; do
            cp "$file" "${file%_*}.json"
            echo "Copied: $(basename $(dirname $(dirname $(dirname "$file"))))"
          done

      - name: Generate Directory Listings
        uses: jayanta525/github-pages-directory-listing@v4.0.0
        with:
          FOLDER: data

      - name: Build Next.js app
        run: bun run build
        env:
          NEXT_TELEMETRY_DISABLED: 1
          CI: true
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NEXT_PUBLIC_GITHUB_CLIENT_ID: ${{ secrets.NEXT_PUBLIC_GITHUB_CLIENT_ID }}
          NEXT_PUBLIC_AUTH_WORKER_URL: ${{ secrets.NEXT_PUBLIC_AUTH_WORKER_URL }}

      - name: Move data directory into out folder
        run: cp -r data out/

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: out

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

      # Cleanup worktree (always runs)
      - name: Cleanup
        if: always()
        uses: ./.github/actions/pipeline-data
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          operation: cleanup
          branch_name: ${{ env.PIPELINE_DATA_BRANCH }}
          data_dir: ${{ env.DATA_DIR }}
