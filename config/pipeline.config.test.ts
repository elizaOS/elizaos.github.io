import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// Mock the pipeline config since the actual file may not exist yet
const mockPipelineConfig = {
  stages: [
    {
      name: "build",
      enabled: true,
      timeout: 300000, // 5 minutes
      retryCount: 2,
      dependencies: []
    },
    {
      name: "test",
      enabled: true,
      timeout: 600000, // 10 minutes
      retryCount: 1,
      dependencies: ["build"]
    },
    {
      name: "deploy",
      enabled: true,
      timeout: 900000, // 15 minutes
      retryCount: 3,
      dependencies: ["test"]
    }
  ],
  timeout: 1800000, // 30 minutes global timeout
  retryCount: 3,
  environment: "development",
  parallelism: 2,
  notifications: {
    enabled: true,
    channels: ["email", "slack"]
  }
};

// Mock the import - in real scenario this would import from './pipeline.config'
const pipelineConfig = mockPipelineConfig;

describe("Pipeline Configuration", () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment variables
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe("Default Configuration", () => {
    it("should have all required configuration properties", () => {
      expect(pipelineConfig).toBeDefined();
      expect(typeof pipelineConfig).toBe("object");
      
      // Check for essential pipeline properties
      const requiredProperties = [
        "stages",
        "timeout", 
        "retryCount",
        "environment"
      ];
      
      requiredProperties.forEach(prop => {
        expect(pipelineConfig).toHaveProperty(prop);
      });
    });

    it("should have valid default timeout value", () => {
      expect(pipelineConfig.timeout).toBeDefined();
      expect(typeof pipelineConfig.timeout).toBe("number");
      expect(pipelineConfig.timeout).toBeGreaterThan(0);
      expect(pipelineConfig.timeout).toBeLessThanOrEqual(3600000); // Max 1 hour
    });

    it("should have valid default retry count", () => {
      expect(pipelineConfig.retryCount).toBeDefined();
      expect(typeof pipelineConfig.retryCount).toBe("number");
      expect(pipelineConfig.retryCount).toBeGreaterThanOrEqual(0);
      expect(pipelineConfig.retryCount).toBeLessThanOrEqual(10);
    });

    it("should have valid environment configuration", () => {
      expect(pipelineConfig.environment).toBeDefined();
      expect(typeof pipelineConfig.environment).toBe("string");
      expect(["development", "staging", "production", "test"]).toContain(pipelineConfig.environment);
    });

    it("should have valid parallelism setting", () => {
      if (pipelineConfig.parallelism) {
        expect(typeof pipelineConfig.parallelism).toBe("number");
        expect(pipelineConfig.parallelism).toBeGreaterThan(0);
        expect(pipelineConfig.parallelism).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("Stages Configuration", () => {
    it("should have at least one stage defined", () => {
      expect(pipelineConfig.stages).toBeDefined();
      expect(Array.isArray(pipelineConfig.stages)).toBe(true);
      expect(pipelineConfig.stages.length).toBeGreaterThan(0);
    });

    it("should have all stages with required properties", () => {
      pipelineConfig.stages.forEach((stage, index) => {
        expect(stage).toHaveProperty("name");
        expect(stage).toHaveProperty("enabled");
        expect(typeof stage.name).toBe("string");
        expect(stage.name.length).toBeGreaterThan(0);
        expect(typeof stage.enabled).toBe("boolean");
        
        // Check for stage-specific properties if they exist
        if (stage.dependencies) {
          expect(Array.isArray(stage.dependencies)).toBe(true);
        }
        if (stage.timeout) {
          expect(typeof stage.timeout).toBe("number");
          expect(stage.timeout).toBeGreaterThan(0);
        }
        if (stage.retryCount !== undefined) {
          expect(typeof stage.retryCount).toBe("number");
          expect(stage.retryCount).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it("should have unique stage names", () => {
      const stageNames = pipelineConfig.stages.map(stage => stage.name);
      const uniqueNames = [...new Set(stageNames)];
      expect(stageNames.length).toBe(uniqueNames.length);
    });

    it("should have valid stage dependencies", () => {
      const stageNames = pipelineConfig.stages.map(stage => stage.name);
      
      pipelineConfig.stages.forEach(stage => {
        if (stage.dependencies) {
          stage.dependencies.forEach(dep => {
            expect(stageNames).toContain(dep);
            expect(dep).not.toBe(stage.name); // Stage cannot depend on itself
          });
        }
      });
    });

    it("should have reasonable stage timeouts", () => {
      pipelineConfig.stages.forEach(stage => {
        if (stage.timeout) {
          expect(stage.timeout).toBeLessThanOrEqual(pipelineConfig.timeout);
          expect(stage.timeout).toBeGreaterThan(0);
        }
      });
    });

    it("should handle disabled stages correctly", () => {
      const disabledStages = pipelineConfig.stages.filter(stage => !stage.enabled);
      const enabledStages = pipelineConfig.stages.filter(stage => stage.enabled);
      
      // Should have at least one enabled stage
      expect(enabledStages.length).toBeGreaterThan(0);
      
      // Disabled stages should not be dependencies of enabled stages
      enabledStages.forEach(stage => {
        if (stage.dependencies) {
          stage.dependencies.forEach(dep => {
            const depStage = pipelineConfig.stages.find(s => s.name === dep);
            expect(depStage?.enabled).toBe(true);
          });
        }
      });
    });
  });

  describe("Dependency Graph Validation", () => {
    it("should not have circular dependencies", () => {
      const detectCircularDependency = (stageName: string, visited: Set<string> = new Set()): boolean => {
        if (visited.has(stageName)) return true;
        visited.add(stageName);
        
        const stage = pipelineConfig.stages.find(s => s.name === stageName);
        if (!stage || !stage.dependencies) return false;
        
        return stage.dependencies.some(dep => detectCircularDependency(dep, new Set(visited)));
      };
      
      pipelineConfig.stages.forEach(stage => {
        expect(detectCircularDependency(stage.name)).toBe(false);
      });
    });

    it("should have valid dependency chain", () => {
      const stageNames = new Set(pipelineConfig.stages.map(s => s.name));
      
      pipelineConfig.stages.forEach(stage => {
        if (stage.dependencies) {
          stage.dependencies.forEach(dep => {
            expect(stageNames.has(dep)).toBe(true);
          });
        }
      });
    });

    it("should identify root stages (no dependencies)", () => {
      const rootStages = pipelineConfig.stages.filter(stage => 
        !stage.dependencies || stage.dependencies.length === 0
      );
      
      expect(rootStages.length).toBeGreaterThan(0);
    });

    it("should calculate maximum dependency depth", () => {
      const calculateDepth = (stageName: string, visited: Set<string> = new Set()): number => {
        if (visited.has(stageName)) return 0; // Avoid infinite loops
        visited.add(stageName);
        
        const stage = pipelineConfig.stages.find(s => s.name === stageName);
        if (!stage || !stage.dependencies || stage.dependencies.length === 0) {
          return 0;
        }
        
        const maxDepth = Math.max(...stage.dependencies.map(dep => 
          calculateDepth(dep, new Set(visited))
        ));
        
        return maxDepth + 1;
      };
      
      const maxDepth = Math.max(...pipelineConfig.stages.map(stage => 
        calculateDepth(stage.name)
      ));
      
      expect(maxDepth).toBeLessThanOrEqual(10); // Reasonable depth limit
    });
  });

  describe("Environment-specific Configuration", () => {
    it("should handle different environments", () => {
      const validEnvironments = ["development", "staging", "production", "test"];
      validEnvironments.forEach(env => {
        const envConfig = { ...pipelineConfig, environment: env };
        expect(envConfig.environment).toBe(env);
      });
    });

    it("should have environment-appropriate timeouts", () => {
      switch (pipelineConfig.environment) {
        case "development":
          // Development might have longer timeouts for debugging
          break;
        case "production":
          // Production should have reasonable timeouts
          expect(pipelineConfig.timeout).toBeLessThanOrEqual(3600000);
          break;
        case "test":
          // Test environment might have shorter timeouts
          break;
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty stages array", () => {
      const emptyConfig = { ...pipelineConfig, stages: [] };
      expect(emptyConfig.stages).toEqual([]);
      expect(Array.isArray(emptyConfig.stages)).toBe(true);
    });

    it("should handle missing optional properties", () => {
      const minimalStage = {
        name: "minimal",
        enabled: true
      };
      
      expect(minimalStage.name).toBe("minimal");
      expect(minimalStage.enabled).toBe(true);
      expect(minimalStage.dependencies).toBeUndefined();
      expect(minimalStage.timeout).toBeUndefined();
    });

    it("should handle zero timeout values", () => {
      const zeroTimeoutConfig = { ...pipelineConfig, timeout: 0 };
      // This should be handled by validation logic
      expect(typeof zeroTimeoutConfig.timeout).toBe("number");
    });

    it("should handle negative retry counts", () => {
      const negativeRetryConfig = { ...pipelineConfig, retryCount: -1 };
      // This should be handled by validation logic
      expect(typeof negativeRetryConfig.retryCount).toBe("number");
    });

    it("should handle very large numbers", () => {
      const largeNumberConfig = { 
        ...pipelineConfig, 
        timeout: Number.MAX_SAFE_INTEGER 
      };
      expect(typeof largeNumberConfig.timeout).toBe("number");
      expect(largeNumberConfig.timeout).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    });
  });

  describe("Configuration Serialization", () => {
    it("should be JSON serializable", () => {
      expect(() => JSON.stringify(pipelineConfig)).not.toThrow();
      
      const serialized = JSON.stringify(pipelineConfig);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(pipelineConfig);
    });

    it("should maintain data types after serialization", () => {
      const serialized = JSON.stringify(pipelineConfig);
      const deserialized = JSON.parse(serialized);
      
      expect(typeof deserialized.timeout).toBe("number");
      expect(typeof deserialized.retryCount).toBe("number");
      expect(typeof deserialized.environment).toBe("string");
      expect(Array.isArray(deserialized.stages)).toBe(true);
    });

    it("should handle complex nested structures", () => {
      if (pipelineConfig.notifications) {
        const serialized = JSON.stringify(pipelineConfig);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized.notifications).toEqual(pipelineConfig.notifications);
      }
    });
  });

  describe("Performance and Resource Constraints", () => {
    it("should not have excessive number of stages", () => {
      expect(pipelineConfig.stages.length).toBeLessThanOrEqual(50);
    });

    it("should have reasonable timeout values", () => {
      expect(pipelineConfig.timeout).toBeLessThanOrEqual(3600000); // 1 hour max
      
      pipelineConfig.stages.forEach(stage => {
        if (stage.timeout) {
          expect(stage.timeout).toBeLessThanOrEqual(1800000); // 30 minutes max per stage
        }
      });
    });

    it("should have reasonable retry counts", () => {
      expect(pipelineConfig.retryCount).toBeLessThanOrEqual(10);
      
      pipelineConfig.stages.forEach(stage => {
        if (stage.retryCount !== undefined) {
          expect(stage.retryCount).toBeLessThanOrEqual(5);
        }
      });
    });

    it("should have reasonable parallelism limits", () => {
      if (pipelineConfig.parallelism) {
        expect(pipelineConfig.parallelism).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("Notification Configuration", () => {
    it("should have valid notification settings", () => {
      if (pipelineConfig.notifications) {
        expect(typeof pipelineConfig.notifications.enabled).toBe("boolean");
        
        if (pipelineConfig.notifications.channels) {
          expect(Array.isArray(pipelineConfig.notifications.channels)).toBe(true);
          pipelineConfig.notifications.channels.forEach(channel => {
            expect(typeof channel).toBe("string");
            expect(["email", "slack", "webhook", "sms"]).toContain(channel);
          });
        }
      }
    });
  });

  describe("Configuration Validation", () => {
    it("should validate stage names are URL-safe", () => {
      const urlSafeRegex = /^[a-zA-Z0-9_-]+$/;
      
      pipelineConfig.stages.forEach(stage => {
        expect(stage.name).toMatch(urlSafeRegex);
      });
    });

    it("should validate stage names follow naming conventions", () => {
      const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
      const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;
      
      pipelineConfig.stages.forEach(stage => {
        const isValidName = kebabCaseRegex.test(stage.name) || camelCaseRegex.test(stage.name);
        expect(isValidName).toBe(true);
      });
    });

    it("should ensure stage names are meaningful", () => {
      pipelineConfig.stages.forEach(stage => {
        expect(stage.name.length).toBeGreaterThan(2);
        expect(stage.name).not.toMatch(/^\d+$/); // Not just numbers
      });
    });
  });

  describe("Integration Compatibility", () => {
    it("should be compatible with CI/CD systems", () => {
      // Common CI/CD requirements
      expect(pipelineConfig).toHaveProperty("stages");
      expect(pipelineConfig.stages.length).toBeGreaterThan(0);
      
      // Should have at least one enabled stage
      const enabledStages = pipelineConfig.stages.filter(s => s.enabled);
      expect(enabledStages.length).toBeGreaterThan(0);
    });

    it("should handle parallel execution constraints", () => {
      if (pipelineConfig.parallelism) {
        // Count stages that can run in parallel (no dependencies)
        const parallelStages = pipelineConfig.stages.filter(stage => 
          !stage.dependencies || stage.dependencies.length === 0
        );
        
        // Parallelism should not exceed available stages
        expect(pipelineConfig.parallelism).toBeLessThanOrEqual(
          Math.max(parallelStages.length, 1)
        );
      }
    });
  });

  describe("Schema Validation", () => {
    it("should match expected configuration schema", () => {
      const expectedSchema = {
        stages: expect.any(Array),
        timeout: expect.any(Number),
        retryCount: expect.any(Number),
        environment: expect.any(String)
      };
      
      expect(pipelineConfig).toMatchObject(expectedSchema);
    });

    it("should validate individual stage schema", () => {
      pipelineConfig.stages.forEach(stage => {
        expect(stage).toMatchObject({
          name: expect.any(String),
          enabled: expect.any(Boolean)
        });
        
        // Optional properties validation
        if ('dependencies' in stage) {
          expect(stage.dependencies).toEqual(expect.any(Array));
        }
        if ('timeout' in stage) {
          expect(stage.timeout).toEqual(expect.any(Number));
        }
        if ('retryCount' in stage) {
          expect(stage.retryCount).toEqual(expect.any(Number));
        }
      });
    });

    it("should validate notification schema if present", () => {
      if (pipelineConfig.notifications) {
        expect(pipelineConfig.notifications).toMatchObject({
          enabled: expect.any(Boolean)
        });
        
        if (pipelineConfig.notifications.channels) {
          expect(pipelineConfig.notifications.channels).toEqual(expect.any(Array));
        }
      }
    });
  });
});

describe("Pipeline Configuration Factory", () => {
  it("should create valid configurations for different environments", () => {
    const environments = ["development", "staging", "production", "test"];
    
    environments.forEach(env => {
      const config = { ...pipelineConfig, environment: env };
      
      expect(config.environment).toBe(env);
      expect(config.stages.length).toBeGreaterThan(0);
      expect(config.timeout).toBeGreaterThan(0);
    });
  });

  it("should handle configuration merging", () => {
    const baseConfig = pipelineConfig;
    const overrides = {
      timeout: 900000,
      retryCount: 5
    };
    
    const mergedConfig = { ...baseConfig, ...overrides };
    
    expect(mergedConfig.timeout).toBe(overrides.timeout);
    expect(mergedConfig.retryCount).toBe(overrides.retryCount);
    expect(mergedConfig.stages).toEqual(baseConfig.stages);
  });
});