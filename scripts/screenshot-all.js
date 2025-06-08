/* eslint-env node */

import { chromium } from '@playwright/test';
import { join } from 'path';
import { mkdir, readdir } from 'fs/promises';
import { spawn } from 'child_process';
import http from 'http';

async function isDevServerRunning() {
  return new Promise((resolve) => {
    http
      .get('http://localhost:4321', (res) => {
        resolve(res.statusCode === 200);
      })
      .on('error', () => {
        resolve(false);
      });
  });
}

async function startDevServer() {
  console.log('Starting dev server...');
  const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
  });

  // Wait for server to be ready
  let serverStarted = false;
  devServer.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    if (output.includes('ready in')) {
      serverStarted = true;
    }
  });

  // Wait for server to be ready
  while (!serverStarted) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return devServer;
}

async function takeScreenshot(url, name) {
  console.log(`Starting screenshot process for ${url}`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for any animations to complete
    await page.waitForTimeout(1000);

    // Create screenshots directory if it doesn't exist
    const screenshotsDir = join(process.cwd(), 'screenshots');
    await mkdir(screenshotsDir, { recursive: true });

    const screenshotPath = join(screenshotsDir, `${name}.png`);
    console.log('Taking screenshot...');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

async function getBlogPosts() {
  const blogDir = join(process.cwd(), 'src', 'content', 'blog');
  const files = await readdir(blogDir);
  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace('.md', ''));
}

async function main() {
  const baseUrl = 'http://localhost:4321';
  let devServer = null;

  try {
    // Check if dev server is running
    const isRunning = await isDevServerRunning();
    if (!isRunning) {
      devServer = await startDevServer();
    }

    // Take screenshot of homepage
    console.log('\nTaking screenshot of homepage...');
    await takeScreenshot(baseUrl, 'homepage');

    // Take screenshots of all blog posts
    console.log('\nTaking screenshots of blog posts...');
    const posts = await getBlogPosts();

    for (const post of posts) {
      const url = `${baseUrl}/blog/${post}`;
      console.log(`\nProcessing ${post}...`);
      await takeScreenshot(url, `blog-${post}`);
    }

    console.log('\nAll screenshots completed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    // Kill the dev server if we started it
    if (devServer) {
      console.log('\nStopping dev server...');
      devServer.kill();
    }
  }
}

main().catch(console.error);
