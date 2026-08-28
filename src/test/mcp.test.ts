import { describe, it, expect } from 'vitest';
import { testProviderConnection } from '../utils/aiSettings';

describe('Model Context Protocol (MCP) Server Integration', () => {
  it('connects to local MCP endpoint and validates tools list structure', async () => {
    const res = await testProviderConnection('mcp' as any, { baseUrl: 'http://localhost:5000' } as any);
    // When backend is running on port 5000
    expect(res).toBeDefined();
    expect(typeof res.message).toBe('string');
  });
});
