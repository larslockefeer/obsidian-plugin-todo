export const config = {
  runner: 'local',
  framework: 'mocha',
  specs: ['./e2e/**/*.e2e.mjs'],
  maxInstances: 1,
  capabilities: [{
    browserName: 'obsidian',
    'wdio:obsidianOptions': {
      appVersion: process.env.OBSIDIAN_VERSION || 'latest',
      installerVersion: 'latest',
      plugins: ['.'],
      vault: './e2e/vaults/inbox',
    },
  }],
  services: ['obsidian'],
  mochaOpts: { timeout: 120000 },
  waitforTimeout: 10000,
  logLevel: 'warn',
};
