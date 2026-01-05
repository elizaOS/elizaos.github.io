<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  exclude-result-prefixes="atom">
  <xsl:output method="html" encoding="UTF-8"/>

  <xsl:template match="/">
    <html>
      <head>
        <title><xsl:value-of select="rss/channel/title"/> - RSS Feed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0f; color: #e8e8f0; line-height: 1.6; min-height: 100vh; }
          .container { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
          header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #2a2a3a; }
          h1 { font-size: 1.75rem; color: #00d9ff; margin-bottom: 0.5rem; }
          .description { color: #8888a0; }
          .rss-info { margin-top: 1rem; padding: 0.75rem 1rem; background: #12121a; border-radius: 8px; border: 1px solid #2a2a3a; font-size: 0.85rem; color: #6b6b80; }
          .rss-info code { background: #1a1a2e; padding: 0.2rem 0.4rem; border-radius: 4px; color: #00ff88; word-break: break-all; }
          .item { padding: 1.5rem 0; border-bottom: 1px solid #1a1a2a; }
          .item:last-child { border-bottom: none; }
          .item h2 { font-size: 1.1rem; margin-bottom: 0.5rem; }
          .item h2 a { color: #818cf8; text-decoration: none; }
          .item h2 a:hover { color: #a5b4fc; text-decoration: underline; }
          .date { color: #6b6b80; font-size: 0.85rem; margin-bottom: 0.5rem; }
          .description-content { color: #b8b8c8; }
          footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #2a2a3a; text-align: center; color: #6b6b80; font-size: 0.85rem; }
          footer a { color: #00ff88; text-decoration: none; }
          footer a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1><xsl:value-of select="rss/channel/title"/></h1>
            <p class="description"><xsl:value-of select="rss/channel/description"/></p>
            <div class="rss-info">
              Subscribe by copying this URL into your feed reader: <code><xsl:value-of select="rss/channel/atom:link/@href"/></code>
            </div>
          </header>
          <main>
            <xsl:for-each select="rss/channel/item">
              <article class="item">
                <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
                <div class="date"><xsl:value-of select="pubDate"/></div>
                <div class="description-content">
                  <xsl:value-of select="description"/>
                </div>
              </article>
            </xsl:for-each>
          </main>
          <footer>
            <a href="{rss/channel/link}"><xsl:value-of select="rss/channel/title"/></a>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
