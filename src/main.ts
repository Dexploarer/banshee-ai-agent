import { invoke } from '@tauri-apps/api/core';
import pino from 'pino';
import { type Agent, createAssistant, createFileManager } from './lib/ai';

// Initialize logger
const logger = pino({
  level: 'info',
  browser: {
    asObject: true,
  },
});

let greetInputEl: HTMLInputElement;
let greetMsgEl: HTMLElement;
let _aiAgent: Agent | null = null;

async function greet(): Promise<void> {
  try {
    logger.info({ action: 'greet_start', name: greetInputEl.value });

    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    const result = await invoke<string>('greet', { name: greetInputEl.value });
    greetMsgEl.textContent = result;

    logger.info({ action: 'greet_success', result });
  } catch (error) {
    logger.error({
      action: 'greet_error',
      error: error instanceof Error ? error.message : String(error),
    });
    greetMsgEl.textContent = 'An error occurred while greeting';
  }
}

async function testAIAgent(): Promise<void> {
  try {
    logger.info({ action: 'ai_test_start' });

    // Check if we have API keys stored
    const providers = await invoke<string[]>('list_providers_command');
    logger.info({ action: 'providers_available', providers });

    if (providers.length === 0) {
      greetMsgEl.textContent = 'No AI providers configured. Please add API keys first.';
      return;
    }

    // Create a simple AI assistant
    _aiAgent = createAssistant({
      providerId: providers[0] === 'openai' ? 'openai' : 'anthropic',
      tools: ['showNotification'],
    });

    greetMsgEl.textContent = `AI Agent initialized with ${providers.join(', ')} provider(s)`;
    logger.info({ action: 'ai_agent_created', providers });
  } catch (error) {
    logger.error({
      action: 'ai_test_error',
      error: error instanceof Error ? error.message : String(error),
    });
    greetMsgEl.textContent = `AI Agent test failed: ${error}`;
  }
}

async function testFileOperations(): Promise<void> {
  try {
    logger.info({ action: 'file_test_start' });

    // Test file manager agent
    const _fileAgent = createFileManager();

    // Test listing files in current directory
    const files = await invoke<string[]>('list_files_command', { path: '.' });
    logger.info({ action: 'files_listed', count: files.length });

    greetMsgEl.textContent = `File operations test: Found ${files.length} files`;
  } catch (error) {
    logger.error({
      action: 'file_test_error',
      error: error instanceof Error ? error.message : String(error),
    });
    greetMsgEl.textContent = `File test failed: ${error}`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  logger.info({ action: 'dom_loaded' });

  greetInputEl = document.querySelector('#greet-input') as HTMLInputElement;
  greetMsgEl = document.querySelector('#greet-msg') as HTMLElement;

  const greetForm = document.querySelector('#greet-form') as HTMLFormElement;
  greetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    greet();
  });

  // Add buttons for testing AI features
  // const container = document.querySelector('.container') as HTMLElement;

  const aiTestBtn = document.createElement('button');
  aiTestBtn.textContent = 'Test AI Agent';
  aiTestBtn.onclick = testAIAgent;
  aiTestBtn.style.marginLeft = '10px';

  const fileTestBtn = document.createElement('button');
  fileTestBtn.textContent = 'Test File Operations';
  fileTestBtn.onclick = testFileOperations;
  fileTestBtn.style.marginLeft = '10px';

  greetForm.appendChild(aiTestBtn);
  greetForm.appendChild(fileTestBtn);
});
