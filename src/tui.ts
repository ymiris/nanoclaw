import readline from 'readline';
import fs from 'fs';
import {
  initDatabase,
  getSession,
  setSession,
  setRegisteredGroup,
  getRegisteredGroup,
  storeChatMetadata,
} from './db.js';
import { runContainerAgent } from './container-runner.js';
import { ensureContainerRuntimeRunning } from './container-runtime.js';
import { stripInternalTags, formatMessages } from './router.js';
import { resolveGroupFolderPath } from './group-folder.js';
import { ASSISTANT_NAME } from './config.js';
import type { RegisteredGroup, NewMessage } from './types.js';
import type { ChildProcess } from 'child_process';

const TUI_JID = 'tui:main';
const TUI_FOLDER = 'tui_main';

const GROUP: RegisteredGroup = {
  name: 'TUI',
  folder: TUI_FOLDER,
  trigger: `@${ASSISTANT_NAME}`,
  added_at: new Date().toISOString(),
  requiresTrigger: false,
  isMain: false,
};

async function main() {
  ensureContainerRuntimeRunning();

  initDatabase();

  if (!getRegisteredGroup(TUI_JID)) {
    const groupDir = resolveGroupFolderPath(TUI_FOLDER);
    fs.mkdirSync(groupDir, { recursive: true });
    setRegisteredGroup(TUI_JID, GROUP);
    storeChatMetadata(TUI_JID, new Date().toISOString(), 'TUI', 'tui', false);
    console.log(`[tui] First run — created groups/${TUI_FOLDER}/`);
    console.log(
      `[tui] Add a CLAUDE.md there to customise ${ASSISTANT_NAME}'s behaviour.\n`,
    );
  }

  let sessionId = getSession(TUI_FOLDER);
  let activeProc: ChildProcess | null = null;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: 'you: ',
  });

  console.log(`Connected to ${ASSISTANT_NAME} (TUI). Ctrl+C to exit.\n`);
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
      chat_jid: TUI_JID,
      sender: 'user',
      sender_name: 'User',
      content: text,
      timestamp: new Date().toISOString(),
      is_from_me: false,
    };

    process.stdout.write(`\n${ASSISTANT_NAME}: `);

    await runContainerAgent(
      GROUP,
      {
        prompt: formatMessages([msg]),
        sessionId,
        groupFolder: TUI_FOLDER,
        chatJid: TUI_JID,
        isMain: false,
        assistantName: ASSISTANT_NAME,
      },
      (proc) => {
        activeProc = proc;
      },
      async (result) => {
        if (result.newSessionId) {
          sessionId = result.newSessionId;
          setSession(TUI_FOLDER, result.newSessionId);
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
