# ai16z Eliza Contributors Site Generator

ai16z, creators of the [eliza](https://github.com/ai16z/eliza) framework. This repo generates static sites showing GitHub contributor activity.


![eliza_banner](https://github.com/user-attachments/assets/e8784793-c4d3-4d59-bba9-6d47885abe63)

[Website](https://elizaos.ai/) | [Discord](https://discord.gg/ai16z) | [Twitter/X](https://x.com/ai16zdao) | [DAO](https://www.daos.fun/HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC)


## Setup

1. Install dependencies:
```bash
npm install
```

2. Put your contributor data JSON files in the `data` directory

3. Build and generate the site:
```bash
npm run build
npm run generate
```

4. Open `profiles/index.html` to view the result

## Directory Structure

- `data/` - Place contributor JSON files here
- `scripts/` - Source code
- `dist/` - Built files
- `profiles/` - Generated static site

## Scripts

- `npm run build` - Bundle the site generator
- `npm run generate` - Generate the static site
/
