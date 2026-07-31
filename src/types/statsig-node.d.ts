declare module "statsig-node" {
  type StatsigModule = {
    checkGate: (user: unknown, key: string) => boolean;
    getExperiment: (
      user: unknown,
      key: string,
    ) => { get: (key: string, fallback: string) => unknown };
    initialize: (
      serverSecret: string,
      options: { environment: { tier: string | undefined } },
    ) => Promise<void>;
    shutdown: () => Promise<void>;
  };

  const Statsig: StatsigModule;
  export default Statsig;
}
