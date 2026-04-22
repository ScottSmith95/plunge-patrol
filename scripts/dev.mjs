import { spawn } from 'node:child_process';
import { join } from 'node:path';

const isWindows = process.platform === 'win32';
const binDir = join(process.cwd(), 'node_modules', '.bin');
const postcssBin = join(binDir, isWindows ? 'postcss.cmd' : 'postcss');
const eleventyBin = join(binDir, isWindows ? 'eleventy.cmd' : 'eleventy');

const children = [];

function run(command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  children.push(child);

  child.on('exit', (code) => {
    if (code !== 0) {
      shutdown(code ?? 1);
    }
  });

  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run(postcssBin, [
  'src/assets/styles/main.css',
  '-o',
  'src/assets/styles/app.css',
  '--watch'
]);

run(eleventyBin, ['--serve']);
