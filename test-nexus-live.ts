cat > test-nexus-live.ts << 'EOF'
import { LLMProvider } from './src/llm/LLMProvider';
import { CoderRunner } from './src/execution/agents/CoderRunner';
import { Task } from './src/types/core';

async function testNexusLive() {
  console.log('🚀 Nexus Live Test\n');
  console.log('==================\n');

  const provider = new LLMProvider({
    claudeBackend: 'cli',
    googleApiKey: process.env.GOOGLE_API_KEY || 'dummy-for-test',
  });

  console.log('🔍 Checking Claude CLI...');
  const cliAvailable = await provider.validateCLIBackend();
  if (!cliAvailable) {
    console.error('❌ Claude CLI not found!');
    process.exit(1);
  }
  console.log('✅ Claude CLI available\n');

  const task: Task = {
    id: 'test-001',
    name: 'Create greeting utility',
    type: 'auto',
    description: `Create src/utils/greet.ts with:
1. greet(name: string): string - returns "Hello, {name}!"
2. greetMultiple(names: string[]): string[] - returns array of greetings
Also create src/utils/greet.test.ts with tests.`,
    files: ['src/utils/greet.ts', 'src/utils/greet.test.ts'],
    timeEstimate: 10,
  };

  console.log('📋 Task:', task.name);
  console.log('\n--- Starting Coder Agent ---\n');

  try {
    const coder = new CoderRunner(provider);
    const result = await coder.execute(task);
    console.log('\n✅ Success:', result.success);
    console.log('📁 Files:', result.filesChanged);
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

testNexusLive();
EOF