// Specialized Telegram bots — one per agent (Freya, Rán, Sól, Eir).
// Each bot uses a unique JID prefix so the router can identify which
// agent channel owns a given JID.

import { readEnvFile } from '../env.js';
import { logger } from '../logger.js';
import { registerChannel, ChannelOpts } from './registry.js';
import { TelegramChannel } from './telegram.js';

const AGENT_BOTS: Array<{
  name: string;
  envKey: string;
  jidPrefix: string;
}> = [
  {
    name: 'freya',
    envKey: 'FREYA_TELEGRAM_BOT_TOKEN',
    jidPrefix: 'tg-freya:',
  },
  {
    name: 'ran',
    envKey: 'RAN_REEF_BOT_TOKEN',
    jidPrefix: 'tg-ran:',
  },
  {
    name: 'sol',
    envKey: 'SOL_POWER26_BOT',
    jidPrefix: 'tg-sol:',
  },
  {
    name: 'eir',
    envKey: 'EIR_JOBS_BOT',
    jidPrefix: 'tg-eir:',
  },
];

for (const agent of AGENT_BOTS) {
  registerChannel(`telegram-${agent.name}`, (opts: ChannelOpts) => {
    const envVars = readEnvFile([agent.envKey]);
    const token = process.env[agent.envKey] || envVars[agent.envKey] || '';
    if (!token) {
      logger.warn(
        `Telegram agent ${agent.name}: ${agent.envKey} not set, skipping`,
      );
      return null;
    }
    return new TelegramChannel(token, opts, agent.jidPrefix);
  });
}
