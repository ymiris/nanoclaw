import readline from 'readline';
import fs from 'fs';
import {
  initDatabase,
  getSession,
  setSession,
  setRegisteredGroup,
  getRegisteredGroup,
  getAllRegisteredGroups,
  storeChatMetadata,
} from './db.js';
import { runContainerAgent } from './container-runner.js';
import { ensureContainerRuntimeRunning } from './container-runtime.js';
import { stripInternalTags, formatMessages } from './router.js';
import { resolveGroupFolderPath } from './group-folder.js';
import { ASSISTANT_NAME } from './config.js';
import type { RegisteredGroup, NewMessage } from './types.js';
import type { ChildProcess } from 'child_process';

async function main() {
  ensureContainerRuntimeRunning();
  initDatabase();

  // Optional agent argument: npm run tui -- freya
  const agentArg = process.argv[2]?.toLowerCase();

  let tuiFolder: string;
  let tuiJid: string;
  let group: RegisteredGroup;
  let displayName: string;

  if (!agentArg || agentArg === 'main' || agentArg === 'summer') {
    tuiFolder = 'tui_main';
    tuiJid = 'tui:main';
    displayName = ASSISTANT_NAME;
    group = {
      name: 'TUI',
      folder: tuiFolder,
      trigger: `@${ASSISTANT_NAME}`,
      added_at: new Date().toISOString(),
      requiresTrigger: false,
      isMain: false,
    };
    if (!getRegisteredGroup(tuiJid)) {
      const groupDir = resolveGroupFolderPath(tuiFolder);
      fs.mkdirSync(groupDir, { recursive: true });
      setRegisteredGroup(tuiJid, group);
      storeChatMetadata(tuiJid, new Date().toISOString(), 'TUI', 'tui', false);
      console.log(`[tui] First run — created groups/${tuiFolder}/`);
      console.log(
        `[tui] Add a CLAUDE.md there to customise ${ASSISTANT_NAME}'s behaviour.\n`,
      );
    }
  } else {
    // Find registered group by folder name
    const allGroups = getAllRegisteredGroups();
    const existing = Object.values(allGroups).find(
      (g) => g.folder === agentArg,
    );
    if (!existing) {
      const available = Object.values(allGroups)
        .map((g) => g.folder)
        .filter((f) => f !== 'tui_main')
        .join(', ');
      console.error(`Unknown agent: "${agentArg}"`);
      console.error(`Available agents: ${available || '(none registered)'}`);
      process.exit(1);
    }
    tuiFolder = existing.folder;
    tuiJid = `tui:${tuiFolder}`;
    displayName = tuiFolder.charAt(0).toUpperCase() + tuiFolder.slice(1);
    group = existing;
  }

  let sessionId = getSession(tuiFolder);
  let activeProc: ChildProcess | null = null;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: 'you: ',
  });

  console.log(`Connected to ${displayName} (TUI). Ctrl+C to exit.\n`);
  rl.prompt();

  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) {
      rl.prompt();
      return;
    }

    rl.pause();

    const msg: NewMessage = {
      id: `tui-${Date.now()}`,
      chat_jid: tuiJid,
      sender: 'user',
      sender_name: 'User',
      content: text,
      timestamp: new Date().toISOString(),
      is_from_me: false,
    };

    process.stdout.write(`\n${displayName}: `);

    await runContainerAgent(
      group,
      {
        prompt: formatMessages(
          [msg],
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ),
        sessionId,
        groupFolder: tuiFolder,
        chatJid: tuiJid,
        isMain: false,
        assistantName: displayName,
      },
      (proc) => {
        activeProc = proc;
      },
      async (result) => {
        if (result.newSessionId) {
          sessionId = result.newSessionId;
          setSession(tuiFolder, result.newSessionId);
        }
        if (result.result) {
          const out = stripInternalTags(result.result).trim();
          if (out) process.stdout.write(out);
        }
        if (result.status === 'error') {
          process.stdout.write(`[error] ${result.error ?? 'unknown'}`);
        }
      },
    );

    activeProc = null;
    process.stdout.write('\n\n');
    rl.resume();
    rl.prompt();
  });

  const cleanup = () => {
    if (activeProc) (activeProc as ChildProcess).kill('SIGTERM');
    console.log('\nBye.');
    process.exit(0);
  };
  rl.on('close', cleanup);
  process.on('SIGINT', cleanup);
}

main().catch((err) => {
  console.error('TUI error:', err);
  process.exit(1);
});
