import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { httpClient } from "../utils/http-client.js";

const GetRepositoryDataSchema = z.object({
  repository_name: z.string().optional().describe("Specific repository name to get data for"),
  include_stats: z.boolean().optional().default(true).describe("Include repository statistics"),
  include_contributors: z.boolean().optional().default(false).describe("Include contributor information"),
});

class GetRepositoryDataTool extends MCPTool {
  name = "get_repository_data";
  description = "Fetch repository metadata and statistics from ElizaOS data including stars, forks, and contributors";
  schema = GetRepositoryDataSchema;
  useStringify = true; // Use JSON stringification for proper formatting

  async execute(input: MCPInput<this>) {
    try {
      // Check the main data directory for repository-related directories
      const mainResponse = await httpClient.get("/");
      const mainHtml = mainResponse.data;
      
      // Extract any repository-related directory names
      const repoDirRegex = /href="(elizaos[^"]*?)\/"/g;
      const repoDirs: string[] = [];
      let match;
      
      while ((match = repoDirRegex.exec(mainHtml)) !== null) {
        if (!match[1].includes('plugin')) { // Exclude plugin directories
          repoDirs.push(match[1]);
        }
      }

      if (repoDirs.length === 0) {
        return {
          error: "No repository directories found",
          message: "Unable to find any repository directories in the ElizaOS data repository",
          endpoint: "https://elizaos.github.io/data/",
          expected_pattern: "elizaos*",
          note: "Repository data may not be available in the current data structure",
          timestamp: new Date().toISOString()
        };
      }

      // If specific repository requested, filter
      let targetRepoDirs = repoDirs;
      if (input.repository_name) {
        const searchName = input.repository_name.toLowerCase();
        targetRepoDirs = repoDirs.filter(dir => 
          dir.toLowerCase().includes(searchName)
        );
        
        if (targetRepoDirs.length === 0) {
          return {
            error: "Repository not found",
            requested_repository: input.repository_name,
            available_repositories: repoDirs,
            message: "Please check the repository name and try again",
            timestamp: new Date().toISOString()
          };
        }
      }

      // Collect repository information
      const repositories = [];
      
      for (const dirName of targetRepoDirs) {
        let repoInfo: any = {
          name: dirName,
          directory: dirName,
          data_available: false
        };

        // Try to get repository stats if available
        if (input.include_stats) {
          try {
            // Try different potential stats locations
            const statsPaths = [
              `/${dirName}/stats/`,
              `/${dirName}/repository-stats.json`,
              `/${dirName}/metadata.json`
            ];

            for (const statsPath of statsPaths) {
              try {
                const statsResponse = await httpClient.get(statsPath);
                
                if (statsPath.endsWith('.json')) {
                  // Direct JSON file
                  repoInfo = {
                    ...repoInfo,
                    ...statsResponse.data,
                    data_available: true,
                    data_source: statsPath
                  };
                  break;
                } else {
                  // Directory listing - look for JSON files
                  const statsHtml = statsResponse.data;
                  const jsonFileRegex = /href="([^"]*\.json)"/g;
                  const jsonFiles: string[] = [];
                  let jsonMatch;
                  
                  while ((jsonMatch = jsonFileRegex.exec(statsHtml)) !== null) {
                    jsonFiles.push(jsonMatch[1]);
                  }
                  
                  if (jsonFiles.length > 0) {
                    // Get the first JSON file found
                    const jsonFile = jsonFiles[0];
                    const jsonResponse = await httpClient.get(`${statsPath}${jsonFile}`);
                    
                    repoInfo = {
                      ...repoInfo,
                      ...jsonResponse.data,
                      data_available: true,
                      data_source: `${statsPath}${jsonFile}`
                    };
                    break;
                  }
                }
              } catch (error) {
                // Continue to next path
              }
            }
          } catch (error) {
            // No stats available
          }
        }

        repositories.push(repoInfo);
      }

      return {
        total_repositories: repositories.length,
        repositories: repositories,
        filter_applied: input.repository_name || null,
        include_stats: input.include_stats,
        include_contributors: input.include_contributors,
        updated_at: new Date().toISOString(),
        source: "Real data from ElizaOS GitHub Pages",
        endpoint: "https://elizaos.github.io/data/",
        note: "Repository data structure may vary depending on available data sources"
      };

    } catch (error: any) {
      return {
        error: "Failed to fetch repository data",
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: "https://elizaos.github.io/data/",
        possible_causes: [
          "ElizaOS data repository is unavailable",
          "Network connectivity issues",
          "Repository data structure has changed"
        ]
      };
    }
  }
}

export default GetRepositoryDataTool;