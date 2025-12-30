import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { httpClient } from "../utils/http-client.js";

const GetPluginStatsSchema = z.object({
  plugin_name: z.string().optional().describe("Specific plugin name to get stats for"),
  include_details: z.boolean().optional().default(false).describe("Include detailed statistics"),
});

class GetPluginStatsTool extends MCPTool {
  name = "get_plugin_stats";
  description = "Fetch plugin statistics from ElizaOS data including downloads, stars, and other metrics";
  schema = GetPluginStatsSchema;
  useStringify = true; // Use JSON stringification for proper formatting

  async execute(input: MCPInput<this>) {
    try {
      // Get the main data directory listing to find plugin directories
      const mainResponse = await httpClient.get("/");
      const mainHtml = mainResponse.data;
      
      // Extract plugin directory names
      const pluginDirRegex = /href="(elizaos-plugins_plugin-[^"]+)\/"/g;
      const pluginDirs: string[] = [];
      let match;
      
      while ((match = pluginDirRegex.exec(mainHtml)) !== null) {
        pluginDirs.push(match[1]);
      }

      if (pluginDirs.length === 0) {
        return {
          error: "No plugin directories found",
          message: "Unable to find any plugin directories in the ElizaOS data repository",
          endpoint: "https://elizaos.github.io/data/",
          expected_pattern: "elizaos-plugins_plugin-*",
          timestamp: new Date().toISOString()
        };
      }

      // Filter plugins if a specific name is requested
      let targetPluginDirs = pluginDirs;
      if (input.plugin_name) {
        const searchName = input.plugin_name.toLowerCase().replace('plugin-', '');
        targetPluginDirs = pluginDirs.filter(dir => 
          dir.toLowerCase().includes(searchName)
        );
        
        if (targetPluginDirs.length === 0) {
          return {
            error: "Plugin not found",
            requested_plugin: input.plugin_name,
            available_plugins: pluginDirs.map(dir => dir.replace('elizaos-plugins_plugin-', 'plugin-')),
            message: "Please check the plugin name and try again",
            timestamp: new Date().toISOString()
          };
        }
      }

      // Collect statistics for each plugin
      const pluginStats = [];
      
      for (const dirName of targetPluginDirs) {
        const pluginName = dirName.replace('elizaos-plugins_plugin-', 'plugin-');
        
        let stats: any = {
          name: pluginName,
          directory: dirName,
          status: "active"
        };

        try {
          // Get the latest daily stats
          const statsResponse = await httpClient.get(`/${dirName}/stats/day/`);
          const statsHtml = statsResponse.data;
          
          // Get the latest stats file
          const statsFileRegex = /href="(stats_\d{4}-\d{2}-\d{2}\.json)"/g;
          const statsFiles: string[] = [];
          let statsMatch;
          
          while ((statsMatch = statsFileRegex.exec(statsHtml)) !== null) {
            statsFiles.push(statsMatch[1]);
          }
          
          if (statsFiles.length > 0) {
            // Get the latest stats file (they're in chronological order)
            const latestStatsFile = statsFiles[statsFiles.length - 1];
            
            try {
              const statsDataResponse = await httpClient.get(`/${dirName}/stats/day/${latestStatsFile}`);
              const statsData = statsDataResponse.data;
              
              stats = {
                ...stats,
                repository: statsData.repository,
                last_updated: statsData.interval?.intervalEnd || statsData.interval?.intervalStart,
                interval_type: statsData.interval?.intervalType,
                overview: statsData.overview,
                stats_file: latestStatsFile,
                prs: {
                  total: statsData.topPRs?.length || 0,
                  merged: statsData.topPRs?.filter((pr: any) => pr.mergedAt).length || 0,
                  open: statsData.topPRs?.filter((pr: any) => !pr.mergedAt).length || 0
                },
                issues: {
                  total: statsData.topIssues?.length || 0
                }
              };

              if (input.include_details && statsData.topPRs) {
                stats.recent_prs = statsData.topPRs.slice(0, 5).map((pr: any) => ({
                  title: pr.title,
                  author: pr.author,
                  number: pr.number,
                  created_at: pr.createdAt,
                  merged_at: pr.mergedAt,
                  additions: pr.additions,
                  deletions: pr.deletions
                }));
              }

              if (input.include_details && statsData.topIssues) {
                stats.recent_issues = statsData.topIssues.slice(0, 5).map((issue: any) => ({
                  title: issue.title,
                  author: issue.author,
                  number: issue.number,
                  created_at: issue.createdAt,
                  state: issue.state
                }));
              }

            } catch (error) {
              stats.error = `Could not parse stats data: ${error}`;
            }
          } else {
            stats.error = "No stats files found";
          }
        } catch (error) {
          stats.error = `Could not access stats directory: ${error}`;
        }

        // Try to get additional metadata from summaries if available
        if (input.include_details) {
          try {
            const summariesResponse = await httpClient.get(`/${dirName}/summaries/`);
            const summariesHtml = summariesResponse.data;
            
            // Look for summary files
            const summaryFileRegex = /href="([^"]*\.json)"/g;
            const summaryFiles: string[] = [];
            let summaryMatch;
            
            while ((summaryMatch = summaryFileRegex.exec(summariesHtml)) !== null) {
              summaryFiles.push(summaryMatch[1]);
            }
            
            if (summaryFiles.length > 0) {
              // Try to get the latest summary
              const latestSummary = summaryFiles[summaryFiles.length - 1];
              
              try {
                const summaryDataResponse = await httpClient.get(`/${dirName}/summaries/${latestSummary}`);
                const summaryData = summaryDataResponse.data;
                
                stats.summary_data = {
                  file: latestSummary,
                  data: summaryData
                };
              } catch (error) {
                // Summaries are optional
              }
            }
          } catch (error) {
            // Summaries directory might not exist
          }
        }

        pluginStats.push(stats);
      }

      // Return the actual JSON object
      return {
        total_plugins: pluginStats.length,
        plugins: pluginStats,
        filter_applied: input.plugin_name || null,
        include_details: input.include_details,
        updated_at: new Date().toISOString(),
        source: "Real data from ElizaOS GitHub Pages",
        endpoint: "https://elizaos.github.io/data/"
      };

    } catch (error: any) {
      return {
        error: "Failed to fetch plugin stats",
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: "https://elizaos.github.io/data/",
        possible_causes: [
          "ElizaOS data repository is unavailable",
          "Network connectivity issues",
          "Data repository structure has changed"
        ]
      };
    }
  }
}

export default GetPluginStatsTool;