export interface ProjectConfigManager {
  onReady(): Promise<void>;
  getConfig(): ProjectConfig | null;
  onUpdate(listener: (config: ProjectConfig) => void): () => void;
}
