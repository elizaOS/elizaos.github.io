import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { httpClient } from "../utils/http-client.js";

const GetSummaryDataSchema = z.object({
  summary_type: z.enum(["overview", "statistics", "activity", "contributors"]).optional().default("overview").describe("Type of summary data to fetch"),
  time_period: z.enum(["week", "month", "quarter", "year", "all"]).optional().default("month").describe("Time period for the summary"),
  include_trends: z.boolean().optional().default(false).describe("Include trend analysis"),
});

class GetSummaryDataTool extends MCPTool {
  name = "get_summary_data";
  description = "Fetch comprehensive summary data about the ElizaOS ecosystem including statistics, activity, and trends";
  schema = GetSummaryDataSchema;
  useStringify = true; // Use JSON stringification for proper formatting

  async execute(input: MCPInput<this>) {
    try {
      // Check for summary data in the main data directory
      const mainResponse = await httpClient.get("/");
      const mainHtml = mainResponse.data;
      
      // Look for summary-related directories
      const summaryDirRegex = /href="([^"]*summary[^"]*?)\/"/gi;
      const summaryDirs: string[] = [];
      let match;
      
      while ((match = summaryDirRegex.exec(mainHtml)) !== null) {
        summaryDirs.push(match[1]);
      }

      // Also check for dump directory which might contain aggregated data
      const dumpDirRegex = /href="(dump)\/"/g;
      while ((match = dumpDirRegex.exec(mainHtml)) !== null) {
        summaryDirs.push(match[1]);
      }

      if (summaryDirs.length === 0) {
        return {
          error: "No summary directories found",
          message: "Unable to find any summary or dump directories in the ElizaOS data repository",
          endpoint: "https://elizaos.github.io/data/",
          searched_patterns: ["*summary*", "dump"],
          note: "Summary data may not be available in the current data structure",
          timestamp: new Date().toISOString()
        };
      }

      const summaryData: any = {
        summary_type: input.summary_type,
        time_period: input.time_period,
        include_trends: input.include_trends,
        data_sources: [],
        data: {}
      };

      // Try to collect data from available summary directories
      for (const dirName of summaryDirs) {
        try {
          const dirResponse = await httpClient.get(`/${dirName}/`);
          const dirHtml = dirResponse.data;
          
          // Look for JSON files in this directory
          const jsonFileRegex = /href="([^"]*\.json)"/g;
          const jsonFiles: string[] = [];
          let jsonMatch;
          
          while ((jsonMatch = jsonFileRegex.exec(dirHtml)) !== null) {
            jsonFiles.push(jsonMatch[1]);
          }
          
          for (const jsonFile of jsonFiles.slice(0, 5)) { // Limit to first 5 files
            try {
              const fileResponse = await httpClient.get(`/${dirName}/${jsonFile}`);
              const fileData = fileResponse.data;
              
              summaryData.data_sources.push({
                directory: dirName,
                file: jsonFile,
                path: `/${dirName}/${jsonFile}`
              });
              
              // Organize data by type
              if (jsonFile.toLowerCase().includes('overview') || input.summary_type === 'overview') {
                summaryData.data.overview = fileData;
              } else if (jsonFile.toLowerCase().includes('stat') || input.summary_type === 'statistics') {
                summaryData.data.statistics = fileData;
              } else if (jsonFile.toLowerCase().includes('activity') || input.summary_type === 'activity') {
                summaryData.data.activity = fileData;
              } else if (jsonFile.toLowerCase().includes('contributor') || input.summary_type === 'contributors') {
                summaryData.data.contributors = fileData;
              } else {
                // Generic data
                if (!summaryData.data.general) {
                  summaryData.data.general = [];
                }
                summaryData.data.general.push({
                  file: jsonFile,
                  data: fileData
                });
              }
              
            } catch (error) {
              summaryData.data_sources.push({
                directory: dirName,
                file: jsonFile,
                path: `/${dirName}/${jsonFile}`,
                error: `Could not parse: ${error}`
              });
            }
          }
          
        } catch (error) {
          // Directory not accessible
        }
      }

      // If specific summary type requested, filter the data
      if (input.summary_type !== 'overview') {
        const requestedData = summaryData.data[input.summary_type];
        summaryData.data = requestedData ? { [input.summary_type]: requestedData } : {};
      }

      return {
        ...summaryData,
        total_sources: summaryData.data_sources.length,
        has_data: Object.keys(summaryData.data).length > 0,
        updated_at: new Date().toISOString(),
        source: "Real data from ElizaOS GitHub Pages",
        endpoint: "https://elizaos.github.io/data/"
      };

    } catch (error: any) {
      return {
        error: "Failed to fetch summary data",
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: "https://elizaos.github.io/data/",
        possible_causes: [
          "ElizaOS data repository is unavailable",
          "Network connectivity issues",
          "Summary data structure has changed"
        ]
      };
    }
  }
}

export default GetSummaryDataTool;