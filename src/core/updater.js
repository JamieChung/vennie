'use strict';

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_OWNER = 'mindtheproduct';
const REPO_NAME = 'vennie';

function checkForUpdate(currentVersion) {
  const latest = execSync('npm view vennie version 2>/dev/null', {
    encoding: 'utf8',
    timeout: 10000,
  }).trim();
  return { current: currentVersion, latest, available: latest !== currentVersion };
}

async function applyUpdate(targetVersion, options = {}) {
  const { silent = false, onProgress = () => {} } = options;

  onProgress('Fetching release info...');
  const releaseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/v${targetVersion}`;

  const res = await fetch(releaseUrl, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'vennie-updater',
    },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch release info (${res.status})`);
  }
  const release = await res.json();

  const { assets } = release;
  const checksumAsset = assets.find(a => a.name === 'checksums.txt');
  if (!checksumAsset) {
    throw new Error('No checksums.txt in release — cannot verify integrity');
  }

  onProgress('Fetching checksums...');
  const checksumText = await fetch(checksumAsset.browser_download_url).then(r => r.text());

  const tgzAsset = assets.find(a => a.name === `vennie-${targetVersion}.tgz`);
  if (!tgzAsset) {
    throw new Error(`No tgz asset for v${targetVersion}`);
  }

  onProgress('Downloading package...');
  const arrayBuf = await fetch(tgzAsset.browser_download_url).then(r => r.arrayBuffer());
  const tgzBuf = Buffer.from(arrayBuf);

  onProgress('Verifying integrity...');
  const expectedHash = checksumText.split('\n')
    .find(l => l.includes(tgzAsset.name))
    ?.split(/\s+/)[0];

  if (!expectedHash) {
    throw new Error('Checksum not found in checksums.txt');
  }

  const actualHash = crypto.createHash('sha256').update(tgzBuf).digest('hex');
  if (actualHash !== expectedHash) {
    throw new Error(
      `Integrity check failed\n  expected: ${expectedHash}\n  got:      ${actualHash}`
    );
  }

  onProgress('Installing...');
  const tmpPath = path.join(os.tmpdir(), `vennie-${targetVersion}.tgz`);
  const execOpts = {
    stdio: silent ? 'pipe' : 'inherit',
  };

  try {
    fs.writeFileSync(tmpPath, tgzBuf);
    execSync(`npm install -g ${tmpPath} --ignore-scripts`, execOpts);
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup failure
    }
  }

  return targetVersion;
}

function applyUpdateFallback(targetVersion, options = {}) {
  const { silent = false } = options;
  const pkg = targetVersion || execSync('npm view vennie version 2>/dev/null', {
    encoding: 'utf8',
    timeout: 10000,
  }).trim();

  execSync(`npm install -g vennie@${pkg} --ignore-scripts`, {
    stdio: silent ? 'pipe' : 'inherit',
  });

  return pkg;
}

module.exports = { checkForUpdate, applyUpdate, applyUpdateFallback };