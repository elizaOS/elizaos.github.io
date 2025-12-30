import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { httpClient } from "../utils/http-client.js";

const ListAvailablePluginsSchema = z.object({
  category: z.string().optional().describe("Filter plugins by category (e.g., 'blockchain', 'social', 'ai')"),
  include_details: z.boolean().optional().default(false).describe("Include detailed plugin information"),
  sort_by: z.enum(["name", "category", "updated", "popularity"]).optional().default("name").describe("Sort plugins by field"),
});

class ListAvailablePluginsTool extends MCPTool {
  name = "list_available_plugins";
  description = "List all available plugins from ElizaOS with optional filtering and sorting capabilities";
  schema = ListAvailablePluginsSchema;
  useStringify = true; // Use JSON stringification for proper formatting

  async execute(input: MCPInput<this>) {
    try {
      // Get the main data directory listing
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

      // Extract plugin information from directory names and get details
      const plugins = [];
      
      for (const dirName of pluginDirs) {
        const pluginName = dirName.replace('elizaos-plugins_plugin-', '');
        
        let pluginInfo: any = {
          name: `plugin-${pluginName}`,
          directory: dirName,
          status: "active"
        };

        // If detailed info requested, get latest stats
        if (input.include_details) {
          try {
            // Try to get the most recent stats
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
                
                pluginInfo = {
                  ...pluginInfo,
                  repository: statsData.repository || `elizaos-plugins/${pluginName}`,
                  last_updated: statsData.interval?.intervalEnd || statsData.interval?.intervalStart,
                  recent_activity: {
                    prs: statsData.topPRs?.length || 0,
                    issues: statsData.topIssues?.length || 0,
                    overview: statsData.overview
                  }
                };
              } catch (error) {
                // Stats file exists but couldn't parse - continue with basic info
              }
            }
          } catch (error) {
            // No stats directory or access issue - continue with basic info
          }
        }

        plugins.push(pluginInfo);
      }

      // Apply filtering
      let filteredPlugins = plugins;
      if (input.category) {
        // Basic category inference from plugin names
        filteredPlugins = plugins.filter(plugin => {
          const name = plugin.name.toLowerCase();
          const category = input.category!.toLowerCase();
          
          if (category === 'blockchain' || category === 'crypto') {
            return name.includes('evm') || name.includes('solana') || name.includes('crypto') || name.includes('web3');
          } else if (category === 'social') {
            return name.includes('twitter') || name.includes('discord') || name.includes('telegram') || name.includes('farcaster');
          } else if (category === 'ai') {
            return name.includes('knowledge') || name.includes('ai') || name.includes('llm') || name.includes('openai');
          } else if (category === 'automation') {
            return name.includes('auton8n') || name.includes('automation') || name.includes('workflow');
          } else if (category === 'integration') {
            return name.includes('mcp') || name.includes('api') || name.includes('integration');
          } else if (category === 'data') {
            return name.includes('coingecko') || name.includes('data') || name.includes('fetch') || name.includes('market');
          }
          
          return true;
        });
      }

      // Apply sorting
      filteredPlugins.sort((a, b) => {
        switch (input.sort_by) {
          case "name":
            return a.name.localeCompare(b.name);
          case "updated":
            const aDate = new Date(a.last_updated || 0).getTime();
            const bDate = new Date(b.last_updated || 0).getTime();
            return bDate - aDate; // Most recent first
          default:
            return a.name.localeCompare(b.name);
        }
      });

      // Build categories list
      const categories = ['blockchain', 'social', 'ai', 'automation', 'integration', 'data'];

      // Return the JSON object - framework will stringify it properly
      return {
        total_plugins: filteredPlugins.length,
        plugins: filteredPlugins,
        categories,
        filter_applied: input.category || null,
        sort_by: input.sort_by,
        include_details: input.include_details,
        updated_at: new Date().toISOString(),
        source: "Real data from ElizaOS GitHub Pages",
        endpoint: "https://elizaos.github.io/data/"
      };

    } catch (error: any) {
      return {
        error: "Failed to fetch plugin list",
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

export default ListAvailablePluginsTool;