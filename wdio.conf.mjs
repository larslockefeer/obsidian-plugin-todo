export const config = {
  runner: 'local',
  framework: 'cucumber',
  specs: ['./e2e/features/**/*.feature'],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'obsidian',
      'wdio:obsidianOptions': {
        appVersion: process.env.OBSIDIAN_VERSION || 'latest',
        installerVersion: 'latest',
        plugins: ['.'],
        vault: './e2e/vaults/inbox',
      },
    },
  ],
  services: ['obsidian'],
  cucumberOpts: {
    import: ['./e2e/step-definitions/**/*.mjs'],
    timeout: 120000,
    strict: true,
  },
  waitforTimeout: 10000,
  logLevel: 'warn',
};
