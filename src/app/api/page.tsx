"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

interface Parameter {
  name?: string;
  required?: boolean;
  description?: string;
  in?: string;
  schema?: Record<string, unknown>;
  $ref?: string;
}

interface Response {
  description: string;
  content?: Record<string, unknown>;
}

interface Endpoint {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  responses?: Record<string, Response>;
}

interface OpenAPISpec {
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, Endpoint>>;
  tags?: Array<{ name: string; description?: string }>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

// Page-level copy button
function PageCopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const article = document.querySelector("article");
      if (!article) return;

      let formattedText = "";

      // Helper to get clean text
      const getText = (el: Element) => el.textContent?.trim() || "";

      // Title and description
      const h1 = article.querySelector("h1");
      const description = article.querySelector("p.text-muted-foreground");
      if (h1) formattedText += `# ${getText(h1)}\n\n`;
      if (description) formattedText += `${getText(description)}\n\n`;

      // Quickstart section
      formattedText += `## Quickstart\n\n`;
      const quickstartCard = article.querySelector(".border-2");
      if (quickstartCard) {
        const quickstartDesc = quickstartCard.querySelector("p");
        if (quickstartDesc) formattedText += `${getText(quickstartDesc)}\n\n`;

        // Base URL
        formattedText += `### Base URL\n\n`;
        const baseUrlCode = quickstartCard.querySelector(".font-mono code");
        if (baseUrlCode) formattedText += `${getText(baseUrlCode)}\n\n`;

        // Common Endpoints
        formattedText += `### Common Endpoints\n\n`;
        const endpointRows = quickstartCard.querySelectorAll(
          ".space-y-2 > .flex.items-center.gap-2",
        );
        endpointRows.forEach((row) => {
          const label = row.querySelector(".text-xs");
          const code = row.querySelector("code");
          if (label && code) {
            formattedText += `**${getText(label)}**: ${getText(code)}\n`;
          }
        });
        formattedText += `\n`;

        // Code examples
        formattedText += `### Code Examples\n\n`;
        const tabs = quickstartCard.querySelectorAll("[role='tabpanel']");
        tabs.forEach((tab, idx) => {
          const lang = ["curl", "JavaScript", "Python"][idx];
          const code = tab.querySelector("pre code");
          if (code) {
            formattedText += `**${lang}**:\n\`\`\`${lang.toLowerCase()}\n${getText(code)}\n\`\`\`\n\n`;
          }
        });
      }

      // API Reference sections
      formattedText += `## API Reference\n\n`;
      const sections = article.querySelectorAll("section");
      sections.forEach((section) => {
        const h3 = section.querySelector("h3");
        if (h3) formattedText += `### ${getText(h3)}\n\n`;

        const endpoints = section.querySelectorAll(
          ".border.border-border\\/50",
        );
        endpoints.forEach((endpoint) => {
          const method = endpoint.querySelector(".bg-green-500\\/10");
          const path = endpoint.querySelector("code.text-base");
          const desc = endpoint.querySelectorAll("p.text-muted-foreground")[0];
          const url = endpoint.querySelector(".bg-muted code");

          if (method && path) {
            formattedText += `**${getText(method)}** \`${getText(path)}\`\n\n`;
          }
          if (desc) formattedText += `${getText(desc)}\n\n`;
          if (url) formattedText += `${getText(url)}\n\n`;

          // Parameters
          const paramSections = endpoint.querySelectorAll(
            ".border-t.border-border\\/30",
          );
          paramSections.forEach((section) => {
            const header = section.querySelector(".font-semibold");

            if (header && getText(header).includes("Parameters")) {
              formattedText += `**Parameters:**\n`;
              // Get param divs - they have code.font-mono as direct child
              const paramDivs = Array.from(
                section.querySelectorAll(".text-sm"),
              ).filter((div) => div.querySelector("code.font-mono"));
              paramDivs.forEach((param) => {
                const paramName = param.querySelector("code.font-mono");
                const paramDesc = param.querySelector(".text-muted-foreground");
                const required = param.querySelector(".text-red-600");
                if (paramName) {
                  formattedText += `- \`${getText(paramName)}\``;
                  if (required) formattedText += ` (required)`;
                  if (paramDesc) formattedText += `: ${getText(paramDesc)}`;
                  formattedText += `\n`;
                }
              });
              formattedText += `\n`;
            }
          });

          // Responses - now always included (even if collapsed via CSS)
          const responseSection = endpoint.querySelector(
            ".space-y-3.pt-2.border-t",
          );
          if (responseSection) {
            formattedText += `**Response:**\n`;

            // Find the response containers (hidden class or not)
            const responseContainers =
              responseSection.querySelectorAll(".space-y-2");
            responseContainers.forEach((responseContainer) => {
              // Get status code and description
              const badge = responseContainer.querySelector(".font-mono");
              const desc = responseContainer.querySelector(
                ".text-muted-foreground",
              );
              if (badge) {
                formattedText += `${getText(badge)}`;
                if (desc) formattedText += `: ${getText(desc)}`;
                formattedText += `\n\n`;
              }

              // Get JSON example
              const jsonExample = responseContainer.querySelector("pre code");
              if (jsonExample) {
                formattedText += `\`\`\`json\n${getText(jsonExample)}\n\`\`\`\n`;
              }
            });
            formattedText += `\n`;
          }

          formattedText += `---\n\n`;
        });
      });

      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Copy page
        </>
      )}
    </Button>
  );
}

// Simple syntax highlighting component
function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: "bash" | "javascript" | "python";
}) {
  const highlightBash = (text: string) => {
    const parts: React.ReactNode[] = [];
    const lines = text.split("\n");

    lines.forEach((line, lineIdx) => {
      if (line.startsWith("#")) {
        parts.push(
          <span key={lineIdx} className="text-green-600 dark:text-green-400">
            {line}
          </span>,
        );
      } else {
        const words = line.split(/(\s+|"[^"]*")/);
        const highlighted = words.map((word, idx) => {
          if (word.match(/^(curl|jq)$/)) {
            return (
              <span
                key={idx}
                className="font-semibold text-purple-600 dark:text-purple-400"
              >
                {word}
              </span>
            );
          } else if (word.match(/^(-s|-f)$/)) {
            return (
              <span key={idx} className="text-blue-600 dark:text-blue-400">
                {word}
              </span>
            );
          } else if (word.startsWith('"') && word.endsWith('"')) {
            return (
              <span key={idx} className="text-amber-600 dark:text-amber-400">
                {word}
              </span>
            );
          }
          return <span key={idx}>{word}</span>;
        });
        parts.push(<span key={lineIdx}>{highlighted}</span>);
      }
      if (lineIdx < lines.length - 1) parts.push("\n");
    });

    return parts;
  };

  const highlightJS = (text: string) => {
    const parts: React.ReactNode[] = [];
    const lines = text.split("\n");

    lines.forEach((line, lineIdx) => {
      if (line.trim().startsWith("//")) {
        parts.push(
          <span key={lineIdx} className="text-green-600 dark:text-green-400">
            {line}
          </span>,
        );
      } else {
        const words = line.split(
          /(\s+|"[^"]*"|`[^`]*`|'[^']*'|\b\d+\b|[{}()[\];,.])/,
        );
        const highlighted = words.map((word, idx) => {
          if (
            word.match(
              /^(const|let|var|if|else|return|await|async|import|from)$/,
            )
          ) {
            return (
              <span
                key={idx}
                className="font-semibold text-purple-600 dark:text-purple-400"
              >
                {word}
              </span>
            );
          } else if (word.match(/^(fetch|console|null)$/)) {
            return (
              <span
                key={idx}
                className="font-semibold text-blue-600 dark:text-blue-400"
              >
                {word}
              </span>
            );
          } else if (word.match(/^(log|json|status)$/)) {
            return (
              <span key={idx} className="text-cyan-600 dark:text-cyan-400">
                {word}
              </span>
            );
          } else if (
            word.match(/^"[^"]*"$/) ||
            word.match(/^'[^']*'$/) ||
            word.match(/^`[^`]*`$/)
          ) {
            return (
              <span key={idx} className="text-amber-600 dark:text-amber-400">
                {word}
              </span>
            );
          } else if (word.match(/^\d+$/)) {
            return (
              <span key={idx} className="text-orange-600 dark:text-orange-400">
                {word}
              </span>
            );
          }
          return <span key={idx}>{word}</span>;
        });
        parts.push(<span key={lineIdx}>{highlighted}</span>);
      }
      if (lineIdx < lines.length - 1) parts.push("\n");
    });

    return parts;
  };

  const highlightPython = (text: string) => {
    const parts: React.ReactNode[] = [];
    const lines = text.split("\n");

    lines.forEach((line, lineIdx) => {
      if (line.trim().startsWith("#")) {
        parts.push(
          <span key={lineIdx} className="text-green-600 dark:text-green-400">
            {line}
          </span>,
        );
      } else {
        const words = line.split(/(\s+|"[^"]*"|'[^']*'|\b\d+\b|[=(),:])/);
        const highlighted = words.map((word, idx) => {
          if (word.match(/^(import|if|else|return|def|class)$/)) {
            return (
              <span
                key={idx}
                className="font-semibold text-purple-600 dark:text-purple-400"
              >
                {word}
              </span>
            );
          } else if (word.match(/^(requests|print)$/)) {
            return (
              <span
                key={idx}
                className="font-semibold text-blue-600 dark:text-blue-400"
              >
                {word}
              </span>
            );
          } else if (word.match(/^(get|json|status_code|timeout)$/)) {
            return (
              <span key={idx} className="text-cyan-600 dark:text-cyan-400">
                {word}
              </span>
            );
          } else if (word.match(/^"[^"]*"$/) || word.match(/^'[^']*'$/)) {
            return (
              <span key={idx} className="text-amber-600 dark:text-amber-400">
                {word}
              </span>
            );
          } else if (word.match(/^\d+$/)) {
            return (
              <span key={idx} className="text-orange-600 dark:text-orange-400">
                {word}
              </span>
            );
          }
          return <span key={idx}>{word}</span>;
        });
        parts.push(<span key={lineIdx}>{highlighted}</span>);
      }
      if (lineIdx < lines.length - 1) parts.push("\n");
    });

    return parts;
  };

  let highlighted: React.ReactNode[];
  if (language === "bash") {
    highlighted = highlightBash(code);
  } else if (language === "javascript") {
    highlighted = highlightJS(code);
  } else {
    highlighted = highlightPython(code);
  }

  return <code className="text-sm">{highlighted}</code>;
}

// Helper to render path/URL with highlighted variables
function renderPathWithVars(pathStr: string) {
  const parts = pathStr.split(/(\{[^}]+\})/);
  return parts.map((part, idx) => {
    if (part.startsWith("{") && part.endsWith("}")) {
      return (
        <span
          key={idx}
          className="rounded bg-blue-500/10 px-1.5 py-0.5 font-bold text-blue-600 dark:text-blue-400"
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function Quickstart({ baseUrl }: { baseUrl: string }) {
  const overall = `${baseUrl}/api/summaries/overall/week/latest.json`;
  const contributor = `${baseUrl}/api/summaries/contributors/{username}/month/latest.json`;
  const repo = `${baseUrl}/api/summaries/repos/{owner}_{repo}/week/latest.json`;
  const profile = `${baseUrl}/api/contributors/{username}/profile.json`;

  const curlExample = `# Fetch latest overall summary
curl -s "${overall}" | jq .

# Fetch contributor monthly summary
curl -s "${baseUrl}/api/summaries/contributors/wtfsayo/month/latest.json" | jq .`;

  const jsExample = `// Fetch with error handling
const baseUrl = "${baseUrl}";
const url = \`\${baseUrl}/api/summaries/overall/week/latest.json\`;

const res = await fetch(url);
if (res.status === 404) {
  console.log("Artifact not yet published");
  return null;
}

const data = await res.json();
console.log(data.content); // AI-generated summary`;

  const pyExample = `import requests

# Fetch with error handling
base_url = "${baseUrl}"
url = f"{base_url}/api/summaries/overall/week/latest.json"

r = requests.get(url, timeout=20)
if r.status_code == 404:
    print("Artifact not yet published")
else:
    data = r.json()
    print(data["content"])  # AI-generated summary`;

  return (
    <Card className="not-prose mb-8 border-2">
      <CardHeader>
        <CardTitle className="text-2xl">Quickstart</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          <strong>Static artifacts with no server-side computation.</strong>{" "}
          Poll endpoints on your own cadence, cache aggressively, and treat 404
          as &quot;not yet published.&quot;
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base URL */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Base URL
          </h3>
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 font-mono">
            <code className="flex-1 break-all text-sm">{baseUrl}</code>
            <CopyButton text={baseUrl} />
          </div>
        </div>

        {/* Common Endpoints */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Common Endpoints
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">
                Overall summary
              </span>
              <code className="flex-1 break-all font-mono text-xs">
                {renderPathWithVars(overall)}
              </code>
              <CopyButton text={overall} />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">
                Contributor
              </span>
              <code className="flex-1 break-all font-mono text-xs">
                {renderPathWithVars(contributor)}
              </code>
              <CopyButton text={contributor} />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">
                Repository
              </span>
              <code className="flex-1 break-all font-mono text-xs">
                {renderPathWithVars(repo)}
              </code>
              <CopyButton text={repo} />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">
                Profile
              </span>
              <code className="flex-1 break-all font-mono text-xs">
                {renderPathWithVars(profile)}
              </code>
              <CopyButton text={profile} />
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Code Examples
          </h3>
          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curl">curl</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="py">Python</TabsTrigger>
            </TabsList>
            <TabsContent value="curl" className="mt-4">
              <div className="relative rounded-lg bg-muted p-4">
                <pre className="overflow-auto">
                  <CodeBlock code={curlExample} language="bash" />
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton text={curlExample} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="js" className="mt-4">
              <div className="relative rounded-lg bg-muted p-4">
                <pre className="overflow-auto">
                  <CodeBlock code={jsExample} language="javascript" />
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton text={jsExample} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="py" className="mt-4">
              <div className="relative rounded-lg bg-muted p-4">
                <pre className="overflow-auto">
                  <CodeBlock code={pyExample} language="python" />
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton text={pyExample} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

function EndpointBlock({
  method,
  path,
  endpoint,
  baseUrl,
}: {
  method: string;
  path: string;
  endpoint: Endpoint;
  baseUrl: string;
}) {
  const [showResponse, setShowResponse] = useState(false);
  const fullUrl = `${baseUrl}${path}`;

  return (
    <div className="not-prose mb-6 space-y-3 rounded-lg border border-border/50 bg-card p-4">
      {/* Method + Path */}
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="border-green-500/20 bg-green-500/10 font-mono text-xs text-green-600 dark:text-green-400"
        >
          {method.toUpperCase()}
        </Badge>
        <code className="text-base font-semibold">
          {renderPathWithVars(path)}
        </code>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">
        {endpoint.description || endpoint.summary}
      </p>

      {/* Full URL */}
      <div className="flex items-center gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
        <code className="flex-1 break-all">{renderPathWithVars(fullUrl)}</code>
        <CopyButton text={fullUrl} />
        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
          <Link href={fullUrl} target="_blank">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Parameters */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div className="space-y-2 border-t border-border/30 pl-4 pt-2">
          <p className="text-sm font-semibold">Parameters:</p>
          {endpoint.parameters
            .filter((param) => param.name)
            .map((param, idx) => (
              <div key={idx} className="text-sm">
                <code className="font-mono">{param.name}</code>
                {param.required && (
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                    required
                  </span>
                )}
                {param.description && (
                  <p className="ml-4 mt-1 text-xs text-muted-foreground">
                    {param.description}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Responses */}
      {endpoint.responses && (
        <div className="space-y-3 border-t border-border/30 pt-2">
          <button
            onClick={() => setShowResponse(!showResponse)}
            className="flex w-full items-center justify-between rounded py-2 pl-4 pr-2 text-left transition-colors hover:bg-muted/50"
          >
            <p className="text-sm font-semibold">Response example</p>
            <span className="text-xs text-muted-foreground">
              {showResponse ? "▼" : "▶"}
            </span>
          </button>

          <div className={showResponse ? "space-y-3" : "hidden space-y-3"}>
            {Object.entries(endpoint.responses).map(([code, response]) => {
              const example = (response.content as Record<string, unknown>)?.[
                "application/json"
              ]?.example;

              if (!example) return null;

              return (
                <div key={code} className="space-y-2">
                  <div className="flex items-center gap-2 pl-4">
                    <Badge
                      variant={code.startsWith("2") ? "default" : "secondary"}
                      className="font-mono text-xs"
                    >
                      {code}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {response.description}
                    </span>
                  </div>
                  <div className="relative overflow-auto rounded-lg bg-muted p-3">
                    <pre className="text-xs">
                      <code>{JSON.stringify(example, null, 2)}</code>
                    </pre>
                    <div className="absolute right-2 top-2">
                      <CopyButton text={JSON.stringify(example, null, 2)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/openapi.json")
      .then((res) => res.json())
      .then((data) => {
        // Resolve $ref in parameters
        const resolveParams = (params: Parameter[] | undefined) => {
          if (!params) return undefined;
          return params.map((param) => {
            if ("$ref" in param && typeof param.$ref === "string") {
              const refPath = param.$ref.replace("#/", "").split("/");
              let resolved: Record<string, unknown> = data;
              for (const key of refPath) {
                resolved = resolved[key] as Record<string, unknown>;
              }
              return resolved;
            }
            return param;
          });
        };

        // Resolve all $refs in paths
        Object.keys(data.paths).forEach((path) => {
          Object.keys(data.paths[path]).forEach((method) => {
            if (data.paths[path][method].parameters) {
              data.paths[path][method].parameters = resolveParams(
                data.paths[path][method].parameters,
              );
            }
          });
        });

        setSpec(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load OpenAPI spec:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <p className="text-destructive">Failed to load API specification</p>
      </div>
    );
  }

  // Use env var to override openapi.json server URL (for fork-friendliness)
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    spec.servers?.[0]?.url ||
    ""
  ).replace(/\/$/, ""); // Remove trailing slash

  // Group endpoints by tag
  const endpointsByTag: Record<
    string,
    Array<{ method: string; path: string; endpoint: Endpoint }>
  > = {};

  Object.entries(spec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, endpoint]) => {
      if (method === "parameters") return; // Skip path-level parameters

      const tags = endpoint.tags || ["Other"];
      tags.forEach((tag: string) => {
        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }
        endpointsByTag[tag].push({ method, path, endpoint });
      });
    });
  });

  // Sort endpoints within each tag: latest.json first, then index.json, then others
  Object.keys(endpointsByTag).forEach((tag) => {
    endpointsByTag[tag].sort((a, b) => {
      const aScore = a.path.includes("latest.json")
        ? 0
        : a.path.includes("index.json")
          ? 1
          : 2;
      const bScore = b.path.includes("latest.json")
        ? 0
        : b.path.includes("index.json")
          ? 1
          : 2;
      return aScore - bScore || a.path.localeCompare(b.path);
    });
  });

  // Sort tags by the order in spec.tags
  const tagOrder = spec.tags?.map((t) => t.name) || [];
  const sortedTags = Object.keys(endpointsByTag).sort((a, b) => {
    const aIndex = tagOrder.indexOf(a);
    const bIndex = tagOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <article className="prose prose-lg max-w-none dark:prose-invert">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="mb-0">{spec.info.title}</h1>
            <div className="not-prose flex items-center gap-2">
              <Badge variant="secondary">v{spec.info.version}</Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${baseUrl}/api/index.json`} target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  API Index
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/openapi.json" download="openapi.json">
                  <Download className="mr-2 h-4 w-4" />
                  OpenAPI Spec
                </Link>
              </Button>
              <PageCopyButton />
            </div>
          </div>
          <p className="max-w-none text-base text-muted-foreground">
            {spec.info.description}
          </p>
        </div>

        {/* Quickstart Section */}
        <Quickstart baseUrl={baseUrl} />

        {/* API Reference */}
        <div className="mt-12">
          <h2 className="mb-4">API Reference</h2>
          <p className="mb-6 text-base text-muted-foreground">
            Complete endpoint listing with parameters, responses, and examples.
          </p>
        </div>

        {/* Endpoints by Tag */}
        {sortedTags.map((tag) => {
          const tagInfo = spec.tags?.find((t) => t.name === tag);
          const anchorId = tag.toLowerCase().replace(/\s+/g, "-");
          return (
            <section key={tag} id={anchorId} className="mb-12">
              <div className="mb-6 border-b-2 border-primary/20 pb-3">
                <a
                  href={`#${anchorId}`}
                  className="group inline-flex items-center gap-2 no-underline hover:underline"
                >
                  <h3 className="mb-1 font-bold text-primary">{tag}</h3>
                  <LinkIcon className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
                {tagInfo?.description && (
                  <p className="text-base text-muted-foreground">
                    {tagInfo.description}
                  </p>
                )}
              </div>
              <div className="space-y-8">
                {endpointsByTag[tag].map(({ method, path, endpoint }) => (
                  <EndpointBlock
                    key={`${method}-${path}`}
                    method={method}
                    path={path}
                    endpoint={endpoint}
                    baseUrl={baseUrl}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </article>
    </div>
  );
}
