import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { Router } from '../../src/api/router';
import { AddressInfo } from 'net';
import http from 'http';
import { join } from 'path';
import { appService } from '../../src/services/app';

describe('HTTP integration', () => {
  let server: http.Server;
  let port: number;
  const testModelPath = join(__dirname, 'fixtures', 'model-with-views.xml');

  beforeAll(async () => {
    // Set up test model path
    process.env.MODEL_PATH = testModelPath;
    // Reset appService to reload with test model
    appService.reset();

    const router = new Router();
    server = http.createServer((req, res) => {
      // mirror server entry: handle promise rejections
      router.handle(req, res).catch(err => {
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.end('Internal Server Error');
        console.error(err);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    // Clean up environment
    delete process.env.MODEL_PATH;
    appService.reset();
  });

  it('GET /views returns markdown', async () => {
    const res = await fetch(`http://localhost:${port}/views?q=Application`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Application');
  });

  it('GET /views/:name returns view details markdown', async () => {
    const res = await fetch(`http://localhost:${port}/views/${encodeURIComponent('Application Cooperation View')}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('ArchiMate View name: Application Cooperation View');
  });
});
