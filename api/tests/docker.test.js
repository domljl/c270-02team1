// Done by Wen Yi (24009255)

require("dotenv").config();
const { execSync } = require('child_process');
const http = require('http');

const hasDb = Boolean(process.env.DATABASE_URL);
const maybe = hasDb ? describe : describe.skip;

maybe('Docker Container Validation', () => {
  beforeAll(() => {
    console.log('Building Docker image...');
    execSync('docker build -t inventory-api:test .', { stdio: 'inherit' });

    console.log('Starting Docker container...');
    const dbUrl = process.env.DATABASE_URL;
    const pgssl = process.env.PGSSL || 'false';
    execSync(`docker run -d --name inventory-api-test -p 3000:3000 -e DATABASE_URL="${dbUrl}" -e PGSSL=${pgssl} inventory-api:test`, { stdio: 'inherit' });
  });

  afterAll(() => {
    // Stop and remove the container
    console.log('Stopping and removing Docker container...');
    try {
      execSync('docker stop inventory-api-test', { stdio: 'inherit' });
      execSync('docker rm inventory-api-test', { stdio: 'inherit' });
    } catch (error) {
      console.warn('Error stopping/removing container:', error.message);
    }
  });

  it('should build the Docker image successfully', () => {
    // This test is implicit in beforeAll, but we can add a check
    expect(() => execSync('docker images inventory-api:test')).not.toThrow();
  });

  it('should run the container successfully', () => {
    // Check if container is running
    const output = execSync('docker ps --filter name=inventory-api-test --format "{{.Names}}"').toString().trim();
    expect(output).toBe('inventory-api-test');
  });

  it('should return HTTP 200 for /health endpoint', async () => {
    // Wait a bit for the container to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000/health', (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Health check failed with status code: ${res.statusCode}`));
        }
      });

      req.on('error', (err) => {
        reject(new Error(`Health check request failed: ${err.message}`));
      });

      // Set a timeout for the request
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Health check request timed out'));
      });
    });
  });
});