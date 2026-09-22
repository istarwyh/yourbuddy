#!/usr/bin/env node
/**
 * WeChat Publisher CLI — 微信公众号内容管理
 *
 * Usage:
 *   wechat-publisher init                           Initialize local database
 *   wechat-publisher auth                           Show access_token status
 *   wechat-publisher upload-image <file>            Upload body image → WeChat CDN URL
 *   wechat-publisher upload-cover <file>            Upload permanent cover → media_id
 *   wechat-publisher draft add --json '{...}'       Create draft article
 *   wechat-publisher draft list [--offset] [--count] List drafts from WeChat
 *   wechat-publisher draft get <media_id>           Get draft details
 *   wechat-publisher draft delete <media_id>        Delete draft
 *   wechat-publisher publish <media_id>             Submit draft for publishing
 *   wechat-publisher publish-status <publish_id>    Check publish status
 *   wechat-publisher history [filters]              List local records
 *   wechat-publisher search <keyword>               Search local records
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename, extname, dirname } from 'node:path';
import { homedir } from 'node:os';
import http from 'node:http';
import https from 'node:https';

// ── Paths ───────────────────────────────────────────────────
// Data dir resolution: env override > OpenClaw workspace (if present) > standalone default
function resolveDataDir() {
  if (process.env.WECHAT_PUBLISHER_DATA_DIR) return process.env.WECHAT_PUBLISHER_DATA_DIR;
  const openclawWorkspace = join(homedir(), '.openclaw', 'workspace');
  if (existsSync(openclawWorkspace)) return join(openclawWorkspace, 'wechat-publisher');
  return join(homedir(), '.wechat-publisher');
}
const DATA_DIR = resolveDataDir();
const CONFIG_PATH = join(DATA_DIR, 'config.json');
const TOKEN_PATH = join(DATA_DIR, 'token.json');
const DB_PATH = join(DATA_DIR, 'drafts.db');

const API_BASE = 'https://api.weixin.qq.com';
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const UPLOAD_CACHE_PATH = join(DATA_DIR, 'upload-cache.json');

// ── Upload Cache (dedup by file content hash) ───────────────

function fileHash(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function loadUploadCache() {
  if (!existsSync(UPLOAD_CACHE_PATH)) return {};
  try { return JSON.parse(readFileSync(UPLOAD_CACHE_PATH, 'utf-8')); } catch { return {}; }
}

function saveUploadCache(cache) {
  ensureDataDir();
  writeFileSync(UPLOAD_CACHE_PATH, JSON.stringify(cache, null, 2));
}

function getCachedUpload(hash, type) {
  const cache = loadUploadCache();
  const entry = cache[`${type}:${hash}`];
  if (!entry) return null;
  const ageMs = Date.now() - (entry.ts || 0);
  if (type === 'image' && ageMs > 3 * 24 * 3600 * 1000) return null;
  return entry;
}

function setCachedUpload(hash, type, data) {
  const cache = loadUploadCache();
  cache[`${type}:${hash}`] = { ...data, ts: Date.now() };
  saveUploadCache(cache);
}

// ── Config ──────────────────────────────────────────────────

function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
  // Priority 1: environment variables
  if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
    return {
      appId: process.env.WECHAT_APP_ID,
      appSecret: process.env.WECHAT_APP_SECRET,
      proxy: process.env.WECHAT_API_PROXY || '',
    };
  }

  // Priority 2: config.json in the data directory
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `No credentials found. Either:\n` +
      `  1. Set env vars WECHAT_APP_ID / WECHAT_APP_SECRET (optional: WECHAT_API_PROXY), or\n` +
      `  2. Create ${CONFIG_PATH} with:\n` +
      `     {"appId": "YOUR_APP_ID", "appSecret": "YOUR_APP_SECRET", "proxy": ""}`
    );
  }
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  if (!cfg.appId || !cfg.appSecret) {
    throw new Error('Config must contain appId and appSecret');
  }
  if (!cfg.proxy && process.env.WECHAT_API_PROXY) cfg.proxy = process.env.WECHAT_API_PROXY;
  return cfg;
}

// ── Proxy-aware fetch via HTTP CONNECT tunnel ────────────────

function createTunnel(proxyUrl, targetHost, targetPort) {
  return new Promise((resolve, reject) => {
    const proxy = new URL(proxyUrl);
    const req = http.request({
      host: proxy.hostname,
      port: proxy.port,
      method: 'CONNECT',
      path: `${targetHost}:${targetPort}`,
    });
    req.on('connect', (_res, socket) => {
      if (_res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${_res.statusCode}`));
        return;
      }
      resolve(socket);
    });
    req.on('error', reject);
    req.end();
  });
}

async function proxyFetch(url, options = {}) {
  const cfg = loadConfig();
  if (!cfg.proxy) return fetch(url, options);

  const target = new URL(url);
  const socket = await createTunnel(cfg.proxy, target.hostname, target.port || 443);
  const agent = new https.Agent({ socket, rejectUnauthorized: true });

  const body = options.body;
  let bodyBuffer, contentType;

  if (body instanceof FormData) {
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    contentType = `multipart/form-data; boundary=${boundary}`;
    const parts = [];
    for (const [key, value] of body.entries()) {
      if (value instanceof Blob) {
        const ab = await value.arrayBuffer();
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${value.name || key}"\r\nContent-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`
        ));
        parts.push(Buffer.from(new Uint8Array(ab)));
        parts.push(Buffer.from('\r\n'));
      } else {
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        ));
      }
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    bodyBuffer = Buffer.concat(parts);
  } else if (typeof body === 'string') {
    bodyBuffer = Buffer.from(body);
    contentType = options.headers?.['Content-Type'] || 'application/json';
  }

  const reqHeaders = { host: target.hostname, ...options.headers };
  if (contentType) reqHeaders['Content-Type'] = contentType;
  if (bodyBuffer) reqHeaders['Content-Length'] = bodyBuffer.length;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: options.method || 'GET',
      headers: reqHeaders,
      agent,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          json: () => JSON.parse(buf.toString()),
          text: () => buf.toString(),
        });
      });
    });
    req.on('error', reject);
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

// ── Access Token ────────────────────────────────────────────

function loadCachedToken() {
  if (!existsSync(TOKEN_PATH)) return null;
  try {
    const data = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    if (data.accessToken && data.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
      return data.accessToken;
    }
  } catch {}
  return null;
}

function saveToken(accessToken, expiresIn) {
  ensureDataDir();
  writeFileSync(TOKEN_PATH, JSON.stringify({
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshedAt: new Date().toISOString(),
  }, null, 2));
}

async function getAccessToken() {
  const cached = loadCachedToken();
  if (cached) return cached;

  const cfg = loadConfig();
  const url = `${API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${cfg.appId}&secret=${cfg.appSecret}`;
  const res = await proxyFetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`Failed to get access_token: [${data.errcode}] ${data.errmsg}`);
  }

  saveToken(data.access_token, data.expires_in);
  return data.access_token;
}

// ── API Helpers ─────────────────────────────────────────────

async function apiPost(urlPath, body) {
  const token = await getAccessToken();
  const sep = urlPath.includes('?') ? '&' : '?';
  const url = `${API_BASE}${urlPath}${sep}access_token=${token}`;
  const res = await proxyFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeChat API error: [${data.errcode}] ${data.errmsg}`);
  }
  return data;
}

async function apiUpload(urlPath, filePath, fieldName = 'media') {
  const token = await getAccessToken();
  const sep = urlPath.includes('?') ? '&' : '?';
  const url = `${API_BASE}${urlPath}${sep}access_token=${token}`;

  const fileData = readFileSync(filePath);
  const mimeType = getMimeType(filePath);
  const blob = new Blob([fileData], { type: mimeType });
  const form = new FormData();
  form.append(fieldName, blob, basename(filePath));

  const res = await proxyFetch(url, { method: 'POST', body: form });
  const data = await res.json();
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`Upload failed: [${data.errcode}] ${data.errmsg}`);
  }
  return data;
}

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.bmp': 'image/bmp',
  };
  return map[ext] || 'application/octet-stream';
}

// ── Database ────────────────────────────────────────────────

function getDb() {
  ensureDataDir();
  return new DatabaseSync(DB_PATH);
}

function initDb(silent = false) {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT,
      title TEXT NOT NULL,
      author TEXT,
      digest TEXT,
      thumb_media_id TEXT,
      publish_id TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      published_at TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drafts_created ON drafts(created_at);`);
  db.close();
  if (!silent) console.log(`Database initialized at ${DB_PATH}`);
}

function recordDraft(mediaId, title, author, digest, thumbMediaId) {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO drafts (media_id, title, author, digest, thumb_media_id)
     VALUES (?, ?, ?, ?, ?)`
  );
  const result = stmt.run(mediaId, title, author || null, digest || null, thumbMediaId || null);
  db.close();
  return Number(result.lastInsertRowid);
}

function updateDraftPublish(mediaId, publishId) {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET publish_id = ?, status = 'publishing',
     updated_at = datetime('now') WHERE media_id = ?`
  ).run(publishId, mediaId);
  db.close();
}

function markPublished(publishId) {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET status = 'published', published_at = datetime('now'),
     updated_at = datetime('now') WHERE publish_id = ?`
  ).run(publishId);
  db.close();
}

// ── Markdown / HTML → WeChat ────────────────────────────────

const STYLE_PRESETS = {
  minimal:  { primary: '#333',    accent: '#07c160', heading: '#1a1a1a', quoteBg: '#f7f7f7' },
  business: { primary: '#1a1a1a', accent: '#1890ff', heading: '#1a1a1a', quoteBg: '#f5f5f5' },
  lively:   { primary: '#333',    accent: '#ff6b6b', heading: '#1a1a1a', quoteBg: '#fff5f5' },
};

function inlineFormat(text, s) {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color: ${s.accent};">$1</strong>`)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color: ${s.accent}; text-decoration: none;">$1</a>`);
}

function markdownToWechatHtml(md, style = 'minimal') {
  const s = STYLE_PRESETS[style] || STYLE_PRESETS.minimal;

  const codeBlocks = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => {
    codeBlocks.push(code.trimEnd());
    return `\n%%CODE_${codeBlocks.length - 1}%%\n`;
  });

  const inlineCodes = [];
  processed = processed.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(code);
    return `%%IC_${inlineCodes.length - 1}%%`;
  });

  const blocks = processed.split(/\n{2,}/);
  const htmlBlocks = [];

  for (const block of blocks) {
    const t = block.trim();
    if (!t) continue;

    const codeMatch = t.match(/^%%CODE_(\d+)%%$/);
    if (codeMatch) {
      const esc = codeBlocks[parseInt(codeMatch[1])]
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      htmlBlocks.push(
        `<pre style="margin: 1em 0; padding: 12px 16px; background: #f5f5f5; border-radius: 4px; ` +
        `font-size: 14px; line-height: 1.6; overflow-x: auto; font-family: Consolas, Monaco, monospace; ` +
        `color: #333; white-space: pre-wrap; word-wrap: break-word;">${esc}</pre>`
      );
      continue;
    }

    if (/^%%IMG_\d+%%$/.test(t)) { htmlBlocks.push(t); continue; }

    if (/^[-*_]{3,}$/.test(t)) {
      htmlBlocks.push('<p style="text-align: center; margin: 1.5em 0; color: #ddd; font-size: 14px; letter-spacing: 4px;">────── ✦ ──────</p>');
      continue;
    }

    if (t.startsWith('## ')) {
      htmlBlocks.push(`<h2 style="margin: 1.5em 0 0.8em 0; font-size: 18px; font-weight: bold; color: ${s.heading}; border-left: 4px solid ${s.accent}; padding-left: 12px; line-height: 1.4;">${inlineFormat(t.slice(3).trim(), s)}</h2>`);
      continue;
    }

    if (t.startsWith('### ')) {
      htmlBlocks.push(`<h3 style="margin: 1.2em 0 0.6em 0; font-size: 17px; font-weight: bold; color: ${s.heading}; line-height: 1.4;">${inlineFormat(t.slice(4).trim(), s)}</h3>`);
      continue;
    }

    if (t.startsWith('> ')) {
      const q = t.split('\n').map(l => l.replace(/^>\s?/, '').trim()).join('<br/>');
      htmlBlocks.push(`<blockquote style="margin: 1em 0; padding: 12px 16px; background: ${s.quoteBg}; border-left: 4px solid ${s.accent}; color: #555; font-size: 15px; line-height: 1.75;">${inlineFormat(q, s)}</blockquote>`);
      continue;
    }

    if (t.startsWith('|') && t.includes('|', 1)) {
      const rows = t.split('\n').filter(r => r.trim().startsWith('|'));
      if (rows.length >= 2) {
        const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());
        const isSep = (row) => /^\|[\s\-:|]+\|$/.test(row.trim());
        const headers = parseRow(rows[0]);
        const dataStart = isSep(rows[1]) ? 2 : 1;
        let th = '<table style="margin: 1em 0; border-collapse: collapse; width: 100%; font-size: 15px;">';
        if (dataStart === 2) {
          th += '<thead><tr>' + headers.map(h =>
            `<th style="border: 1px solid #e8e8e8; padding: 8px 12px; background: #fafafa; font-weight: bold; text-align: left;">${inlineFormat(h, s)}</th>`
          ).join('') + '</tr></thead>';
        }
        th += '<tbody>';
        for (let ri = dataStart; ri < rows.length; ri++) {
          th += '<tr>' + parseRow(rows[ri]).map(c =>
            `<td style="border: 1px solid #e8e8e8; padding: 8px 12px;">${inlineFormat(c, s)}</td>`
          ).join('') + '</tr>';
        }
        th += '</tbody></table>';
        htmlBlocks.push(th);
        continue;
      }
    }

    if (/^[-*] /.test(t)) {
      const items = t.split('\n').filter(l => /^\s*[-*] /.test(l)).map(l => l.trim().replace(/^[-*] /, ''));
      const lis = items.map(i => `<li style="margin-bottom: 0.5em; line-height: 1.8; font-size: 16px;">${inlineFormat(i, s)}</li>`).join('\n');
      htmlBlocks.push(`<ul style="margin: 0.8em 0; padding-left: 2em; color: ${s.primary};">\n${lis}\n</ul>`);
      continue;
    }

    if (/^\d+\. /.test(t)) {
      const items = t.split('\n').filter(l => /^\s*\d+\. /.test(l)).map(l => l.trim().replace(/^\d+\. /, ''));
      const lis = items.map(i => `<li style="margin-bottom: 0.5em; line-height: 1.8; font-size: 16px;">${inlineFormat(i, s)}</li>`).join('\n');
      htmlBlocks.push(`<ol style="margin: 0.8em 0; padding-left: 2em; color: ${s.primary};">\n${lis}\n</ol>`);
      continue;
    }

    if (t.startsWith('<') && !t.startsWith('%%')) {
      htmlBlocks.push(t);
      continue;
    }

    // Mixed text + list in one block (e.g. "Label:\n- item1\n- item2")
    const lines = t.split('\n');
    const firstListIdx = lines.findIndex(l => /^\s*[-*] /.test(l.trim()) || /^\s*\d+\. /.test(l.trim()));
    if (firstListIdx > 0) {
      const textPart = lines.slice(0, firstListIdx).join('<br/>');
      htmlBlocks.push(`<p style="margin: 0 0 1em 0; line-height: 1.8; font-size: 16px; color: ${s.primary}; letter-spacing: 0.5px;">${inlineFormat(textPart, s)}</p>`);
      const listLines = lines.slice(firstListIdx);
      const isOrdered = /^\s*\d+\. /.test(listLines[0].trim());
      const items = listLines.filter(l => isOrdered ? /^\s*\d+\. /.test(l) : /^\s*[-*] /.test(l))
        .map(l => l.trim().replace(isOrdered ? /^\d+\. / : /^[-*] /, ''));
      const tag = isOrdered ? 'ol' : 'ul';
      const lis = items.map(i => `<li style="margin-bottom: 0.5em; line-height: 1.8; font-size: 16px;">${inlineFormat(i, s)}</li>`).join('\n');
      htmlBlocks.push(`<${tag} style="margin: 0.8em 0; padding-left: 2em; color: ${s.primary};">\n${lis}\n</${tag}>`);
      continue;
    }

    const paraContent = t.split('\n').map(l => inlineFormat(l.trim(), s)).join('<br/>');
    htmlBlocks.push(`<p style="margin: 0 0 1em 0; line-height: 1.8; font-size: 16px; color: ${s.primary}; letter-spacing: 0.5px;">${paraContent}</p>`);
  }

  let result = htmlBlocks.join('\n');
  for (let i = 0; i < inlineCodes.length; i++) {
    const esc = inlineCodes[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    result = result.replaceAll(
      `%%IC_${i}%%`,
      `<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 14px; font-family: Consolas, Monaco, monospace; color: ${s.accent};">${esc}</code>`
    );
  }

  return result;
}

function parseMarkdownFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const dir = dirname(filePath);

  let title = 'Untitled';
  let body = content;
  const h1 = content.match(/^# (.+)$/m);
  if (h1) {
    title = h1[1].trim();
    body = content.replace(/^# .+$/m, '').trim();
  }

  const images = [];
  body = body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    const idx = images.length;
    const isRemote = /^https?:\/\//.test(src) || src.startsWith('data:');
    const fullPath = isRemote ? src : join(dir, src);
    images.push({ idx, alt, path: fullPath, isRemote });
    return `%%IMG_${idx}%%`;
  });

  let summary = '';
  for (const line of body.split('\n')) {
    const stripped = line.trim();
    if (stripped && !/^[#>*\-`%|]/.test(stripped) && !/^\d+\. /.test(stripped)) {
      summary = stripped.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').slice(0, 120);
      break;
    }
  }

  return { title: title.slice(0, 32), body, images, summary, format: 'markdown' };
}

function parseHtmlFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const dir = dirname(filePath);

  let title = 'Untitled';
  const titleTag = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag) title = titleTag[1].trim();
  else {
    const h1Tag = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Tag) title = h1Tag[1].trim();
  }

  let body = content;
  const bodyTag = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyTag) body = bodyTag[1].trim();
  else {
    body = content
      .replace(/<html[^>]*>|<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '').trim();
  }

  const images = [];
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = imgRe.exec(body)) !== null) {
    const src = m[1];
    const isRemote = /^https?:\/\//.test(src) || src.startsWith('data:');
    images.push({
      idx: images.length,
      path: isRemote ? src : join(dir, src),
      isRemote,
      originalTag: m[0],
      originalSrc: src,
    });
  }

  let summary = '';
  const pTag = body.match(/<p[^>]*>([^<]+)/i);
  if (pTag) summary = pTag[1].replace(/<[^>]+>/g, '').trim().slice(0, 120);

  return { title: title.slice(0, 32), body, images, summary, format: 'html' };
}

// ── Commands ────────────────────────────────────────────────

async function cmdAuth() {
  const cached = loadCachedToken();
  if (cached) {
    const tokenData = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    const remaining = Math.round((tokenData.expiresAt - Date.now()) / 1000);
    console.log(`Access token: valid (${remaining}s remaining)`);
    console.log(`Refreshed at: ${tokenData.refreshedAt}`);
  } else {
    console.log('Access token: expired or not cached, fetching new one...');
    await getAccessToken();
    const tokenData = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    const remaining = Math.round((tokenData.expiresAt - Date.now()) / 1000);
    console.log(`Access token: refreshed (${remaining}s remaining)`);
  }
}

async function cmdUploadImage(filePath) {
  if (!filePath) throw new Error('Usage: wechat-publisher upload-image <file_path>');
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const hash = fileHash(filePath);
  const cached = getCachedUpload(hash, 'image');
  if (cached) {
    console.log(JSON.stringify({ url: cached.url, cached: true }, null, 2));
    console.log(`\n(cached) Use this URL in article content: ${cached.url}`);
    return;
  }

  const data = await apiUpload('/cgi-bin/media/uploadimg', filePath);
  setCachedUpload(hash, 'image', { url: data.url });
  console.log(JSON.stringify({ url: data.url }, null, 2));
  console.log(`\nUse this URL in article content: ${data.url}`);
}

async function cmdUploadCover(filePath) {
  if (!filePath) throw new Error('Usage: wechat-publisher upload-cover <file_path>');
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const hash = fileHash(filePath);
  const cached = getCachedUpload(hash, 'cover');
  if (cached) {
    console.log(JSON.stringify({ media_id: cached.media_id, url: cached.url, cached: true }, null, 2));
    console.log(`\n(cached) Use this media_id as thumb_media_id: ${cached.media_id}`);
    return;
  }

  const data = await apiUpload('/cgi-bin/material/add_material?type=image', filePath);
  setCachedUpload(hash, 'cover', { media_id: data.media_id, url: data.url });
  console.log(JSON.stringify({ media_id: data.media_id, url: data.url }, null, 2));
  console.log(`\nUse this media_id as thumb_media_id: ${data.media_id}`);
}

async function cmdDraftAdd(jsonStr) {
  if (!jsonStr) {
    throw new Error(
      "Usage: wechat-publisher draft add --json '{\"title\":\"...\",\"content\":\"...\",\"thumb_media_id\":\"...\"}'"
    );
  }

  const article = JSON.parse(jsonStr);
  if (!article.title) throw new Error('title is required');
  if (!article.content) throw new Error('content is required');

  if (article.title.length > 32) {
    throw new Error(`Title too long: ${article.title.length} chars (max 32)`);
  }
  if (article.author && article.author.length > 16) {
    throw new Error(`Author too long: ${article.author.length} chars (max 16)`);
  }

  const apiArticle = {
    article_type: 'news',
    title: article.title,
    content: article.content,
    thumb_media_id: article.thumb_media_id || '',
    author: article.author || '',
    digest: article.digest || '',
    content_source_url: article.content_source_url || '',
    need_open_comment: article.need_open_comment ?? 1,
    only_fans_can_comment: article.only_fans_can_comment ?? 0,
  };

  const data = await apiPost('/cgi-bin/draft/add', { articles: [apiArticle] });

  const localId = recordDraft(
    data.media_id, article.title, article.author, article.digest, article.thumb_media_id
  );

  console.log(JSON.stringify({
    media_id: data.media_id,
    local_id: localId,
    title: article.title,
    status: 'draft',
  }, null, 2));
}

async function cmdDraftList(args) {
  const offset = parseInt(getArg(args, '--offset') || '0');
  const count = parseInt(getArg(args, '--count') || '20');

  const data = await apiPost('/cgi-bin/draft/batchget', {
    offset,
    count: Math.min(count, 20),
    no_content: 1,
  });

  if (!data.item || data.item.length === 0) {
    console.log('No drafts found.');
    return;
  }

  console.log(`Drafts (${data.item.length} of ${data.total_count}):\n`);
  for (const item of data.item) {
    const article = item.content?.news_item?.[0];
    if (!article) continue;
    const updated = new Date(item.update_time * 1000).toISOString().slice(0, 16);
    console.log(`  ${item.media_id} | ${article.title} | ${updated}`);
  }
}

async function cmdDraftGet(mediaId) {
  if (!mediaId) throw new Error('Usage: wechat-publisher draft get <media_id>');
  const data = await apiPost('/cgi-bin/draft/get', { media_id: mediaId });
  console.log(JSON.stringify(data, null, 2));
}

async function cmdDraftDelete(mediaId) {
  if (!mediaId) throw new Error('Usage: wechat-publisher draft delete <media_id>');
  await apiPost('/cgi-bin/draft/delete', { media_id: mediaId });
  console.log(`Draft ${mediaId} deleted.`);
}

async function cmdPublish(mediaId) {
  if (!mediaId) throw new Error('Usage: wechat-publisher publish <media_id>');

  let data;
  try {
    data = await apiPost('/cgi-bin/freepublish/submit', { media_id: mediaId });
  } catch (err) {
    if (err.message.includes('48001')) {
      console.log(JSON.stringify({
        error: 'api_unauthorized',
        code: 48001,
        media_id: mediaId,
        message: '当前公众号未获得「发布」接口权限（错误码 48001）。这通常是因为公众号未完成企业认证。',
        action: '草稿已创建成功，请手动登录微信公众号后台（mp.weixin.qq.com）→ 草稿箱 → 找到对应草稿 → 点击发布。',
        workaround: '如需通过 API 直接发布，需要完成公众号的企业主体认证（300元/年）。',
      }, null, 2));
      return;
    }
    throw err;
  }

  const publishId = data.publish_id;
  updateDraftPublish(mediaId, publishId);

  console.log(JSON.stringify({
    publish_id: publishId,
    media_id: mediaId,
    status: 'submitted',
    note: 'Publishing is async. Use publish-status to check progress.',
  }, null, 2));
}

async function cmdPublishStatus(publishId) {
  if (!publishId) throw new Error('Usage: wechat-publisher publish-status <publish_id>');
  const data = await apiPost('/cgi-bin/freepublish/get', { publish_id: publishId });

  const statusMap = { 0: 'success', 1: 'publishing', 2: 'original_failed', 3: 'common_failed', 4: 'platform_failed' };
  const statusLabel = statusMap[data.publish_status] || `unknown(${data.publish_status})`;

  if (data.publish_status === 0) {
    markPublished(publishId);
  }

  const result = { publish_id: publishId, status: statusLabel };
  if (data.article_id) result.article_id = data.article_id;
  if (data.article_detail?.item) {
    result.articles = data.article_detail.item.map(a => ({
      idx: a.idx,
      article_url: a.article_url,
    }));
  }
  if (data.fail_idx?.length) result.fail_idx = data.fail_idx;

  console.log(JSON.stringify(result, null, 2));
}

function cmdHistory(args) {
  const db = getDb();
  const conditions = [];
  const params = [];

  const month = getArg(args, '--month');
  if (month) {
    conditions.push("strftime('%Y-%m', created_at) = ?");
    params.push(month);
  }

  const status = getArg(args, '--status');
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const limit = parseInt(getArg(args, '--limit') || '50');
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

  const rows = db.prepare(
    `SELECT * FROM drafts${where} ORDER BY created_at DESC LIMIT ?`
  ).all(...params, limit);
  db.close();

  if (rows.length === 0) {
    console.log('No records found.');
    return;
  }

  const statusLabels = {
    draft: '📝草稿', publishing: '⏳发布中', published: '✅已发布', failed: '❌失败',
  };

  console.log(`Records (${rows.length}):\n`);
  for (const r of rows) {
    const sl = statusLabels[r.status] || r.status;
    console.log(`  #${r.id} | ${sl} | ${r.title} | ${r.created_at} | ${r.media_id || '-'}`);
  }
}

function cmdSearch(keyword) {
  if (!keyword) { console.log('Usage: wechat-publisher search <keyword>'); return; }
  const db = getDb();
  const pattern = `%${keyword}%`;
  const rows = db.prepare(
    `SELECT * FROM drafts WHERE title LIKE ? OR author LIKE ? OR digest LIKE ?
     ORDER BY created_at DESC LIMIT 50`
  ).all(pattern, pattern, pattern);
  db.close();

  if (rows.length === 0) { console.log(`No records matching "${keyword}".`); return; }

  console.log(`Search results for "${keyword}" (${rows.length}):\n`);
  for (const r of rows) {
    console.log(`  #${r.id} | ${r.status} | ${r.title} | ${r.created_at}`);
  }
}

async function cmdPublishFile(filePath, args) {
  if (!filePath) {
    throw new Error(
      'Usage: wechat-publisher publish-file <file.md|html> [--style minimal|business|lively] ' +
      '[--author name] [--title override] [--digest text] [--thumb cover.jpg] [--cta] ' +
      '[--max-content-images N] [--dry-run]'
    );
  }
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const ext = extname(filePath).toLowerCase();
  const style = getArg(args, '--style') || 'minimal';
  const authorOpt = getArg(args, '--author') || '';
  const titleOpt = getArg(args, '--title');
  const digestOpt = getArg(args, '--digest');
  const thumbOpt = getArg(args, '--thumb');
  const addCta = args.includes('--cta');
  const dryRun = args.includes('--dry-run');
  const maxContentImagesRaw = parseInt(getArg(args, '--max-content-images') || '5', 10);
  const maxContentImages = Number.isFinite(maxContentImagesRaw) && maxContentImagesRaw > 0 ? maxContentImagesRaw : 5;

  console.log(`[1/5] Parsing ${basename(filePath)} ...`);
  let parsed;
  if (ext === '.md' || ext === '.markdown') {
    parsed = parseMarkdownFile(filePath);
  } else if (ext === '.html' || ext === '.htm') {
    parsed = parseHtmlFile(filePath);
  } else {
    throw new Error(`Unsupported format: ${ext} (use .md or .html)`);
  }

  const title = (titleOpt || parsed.title).slice(0, 32);
  const digest = (digestOpt || parsed.summary).slice(0, 128);
  console.log(`  Title : ${title}`);
  console.log(`  Digest: ${digest || '(auto)'}`);
  console.log(`  Images: ${parsed.images.length}`);

  const uploaded = new Map();
  const localImages = parsed.images.filter(i => !i.isRemote && existsSync(i.path));
  const coverSrc = thumbOpt && existsSync(thumbOpt) ? thumbOpt : (localImages.length > 0 ? localImages[0].path : null);

  if (localImages.length > 0 || coverSrc) {
    console.log(`\n[2/5] Uploading images ...`);

    if (coverSrc) {
      const hash = fileHash(coverSrc);
      const cached = getCachedUpload(hash, 'cover');
      if (cached) {
        uploaded.set('cover', { mediaId: cached.media_id, url: cached.url });
        console.log(`  [cover] ${basename(coverSrc)} → cached`);
      } else {
        try {
          const data = await apiUpload('/cgi-bin/material/add_material?type=image', coverSrc);
          setCachedUpload(hash, 'cover', { media_id: data.media_id, url: data.url });
          uploaded.set('cover', { mediaId: data.media_id, url: data.url });
          console.log(`  [cover] ${basename(coverSrc)} → ok`);
        } catch (err) {
          console.log(`  [cover] FAILED: ${err.message}`);
        }
      }
    }

    let contentCount = 0;
    for (const img of localImages) {
      if (contentCount >= maxContentImages) break;
      if (img.path === coverSrc && !thumbOpt) continue;

      const hash = fileHash(img.path);
      const cached = getCachedUpload(hash, 'image');
      if (cached) {
        uploaded.set(img.idx, { url: cached.url });
        console.log(`  [img ${img.idx}] ${basename(img.path)} → cached`);
      } else {
        let ok = false;
        for (let attempt = 0; attempt < 2 && !ok; attempt++) {
          try {
            const data = await apiUpload('/cgi-bin/media/uploadimg', img.path);
            setCachedUpload(hash, 'image', { url: data.url });
            uploaded.set(img.idx, { url: data.url });
            console.log(`  [img ${img.idx}] ${basename(img.path)} → ok${attempt ? ' (retry)' : ''}`);
            ok = true;
          } catch (err) {
            if (attempt === 1) console.log(`  [img ${img.idx}] ${basename(img.path)} → FAILED, skipping`);
          }
        }
      }
      contentCount++;
    }
  } else {
    console.log('\n[2/5] No local images to upload.');
  }

  console.log(`\n[3/5] Generating HTML (style: ${style}) ...`);
  let htmlContent;

  if (parsed.format === 'markdown') {
    htmlContent = markdownToWechatHtml(parsed.body, style);
    for (const img of parsed.images) {
      const u = uploaded.get(img.idx);
      const coverData = uploaded.get('cover');
      const url = u?.url || (img.path === coverSrc && coverData?.url) || null;
      const marker = `%%IMG_${img.idx}%%`;

      if (url) {
        const tag = `<p style="text-align: center; margin: 1.2em 0;"><img src="${url}" style="max-width: 100%; border-radius: 8px;" /></p>`;
        htmlContent = htmlContent.replaceAll(marker, tag);
      } else if (img.isRemote && /^https?:\/\/mmbiz\.qpic\.cn\//.test(img.path)) {
        const tag = `<p style="text-align: center; margin: 1.2em 0;"><img src="${img.path}" style="max-width: 100%; border-radius: 8px;" /></p>`;
        htmlContent = htmlContent.replaceAll(marker, tag);
      } else {
        htmlContent = htmlContent.replaceAll(marker, '');
      }
    }
  } else {
    htmlContent = parsed.body;
    for (const img of parsed.images) {
      const u = uploaded.get(img.idx);
      const coverData = uploaded.get('cover');
      const url = u?.url || (img.path === coverSrc && coverData?.url) || null;
      if (url && img.originalTag) {
        htmlContent = htmlContent.replace(img.originalTag, img.originalTag.replace(img.originalSrc, url));
      }
    }
  }

  if (addCta) {
    const cs = STYLE_PRESETS[style] || STYLE_PRESETS.minimal;
    htmlContent += `\n<p style="margin: 0; line-height: 1;"><br/></p>` +
      `\n<p style="text-align: center; margin: 1.5em 0; color: #ddd; font-size: 14px; letter-spacing: 4px;">────── ✦ ──────</p>` +
      `\n<p style="margin-top: 1em; padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center; color: #666; font-size: 14px; line-height: 1.8;">` +
      `如果觉得有帮助，欢迎 <strong style="color: ${cs.accent};">点赞</strong> | <strong style="color: ${cs.accent};">在看</strong> | <strong style="color: ${cs.accent};">转发</strong>` +
      `<br/>你的支持是我持续创作的动力 👆</p>`;
  }

  console.log(`  Content: ${htmlContent.length} chars`);

  if (dryRun) {
    console.log('\n[dry-run] Skipping draft creation.');
    console.log('\n--- HTML Preview ---\n');
    console.log(htmlContent.slice(0, 800) + (htmlContent.length > 800 ? '\n...' : ''));
    return;
  }

  console.log('\n[4/5] Creating draft ...');
  initDb(true);
  const coverData = uploaded.get('cover');
  const data = await apiPost('/cgi-bin/draft/add', {
    articles: [{
      article_type: 'news',
      title,
      content: htmlContent,
      thumb_media_id: coverData?.mediaId || '',
      author: authorOpt,
      digest,
      content_source_url: '',
      need_open_comment: 1,
      only_fans_can_comment: 0,
    }],
  });

  const localId = recordDraft(data.media_id, title, authorOpt, digest, coverData?.mediaId);

  console.log('\n[5/5] Done!');
  console.log(JSON.stringify({
    media_id: data.media_id,
    local_id: localId,
    title,
    images_uploaded: uploaded.size,
    content_length: htmlContent.length,
    status: 'draft',
    next_step: `To publish: node wechat-publisher.mjs publish ${data.media_id}`,
  }, null, 2));
}

function cmdConvert(filePath, args) {
  if (!filePath) throw new Error('Usage: wechat-publisher convert <file.md> [--style minimal|business|lively]');
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const ext = extname(filePath).toLowerCase();
  if (ext !== '.md' && ext !== '.markdown') throw new Error('convert only supports Markdown files');

  const style = getArg(args, '--style') || 'minimal';
  const parsed = parseMarkdownFile(filePath);

  let html = markdownToWechatHtml(parsed.body, style);
  for (const img of parsed.images) {
    const label = img.alt || basename(img.path);
    html = html.replaceAll(`%%IMG_${img.idx}%%`, `<!-- image: ${label} -->`);
  }

  console.log(JSON.stringify({
    title: parsed.title,
    summary: parsed.summary,
    images: parsed.images.map(i => ({ path: i.path, alt: i.alt, remote: i.isRemote })),
    style,
    html_length: html.length,
  }, null, 2));
  console.log('\n--- HTML ---\n');
  console.log(html);
}

function showHelp() {
  console.log(`WeChat Publisher CLI (微信公众号发布)

Commands:
  init                            Initialize local database
  auth                            Show access_token status
  upload-image <file>             Upload body image → CDN URL
  upload-cover <file>             Upload cover → permanent media_id
  draft add --json '{...}'        Create draft article
  draft list [--offset N] [--count N]  List drafts from WeChat
  draft get <media_id>            Get draft details
  draft delete <media_id>         Delete draft
  publish <media_id>              Submit draft for publishing
  publish-status <publish_id>     Check publish status
  history [--month] [--status]    List local records
  search <keyword>                Search local records
  publish-file <file> [opts]      Parse file → upload → create draft
  convert <file.md> [--style S]   Markdown → WeChat HTML (preview)

Publish-file options:
  --style minimal|business|lively   Style preset (default: minimal)
  --author <name>                   Author name
  --title <override>                Override auto-detected title
  --digest <text>                   Override auto-detected summary
  --thumb <cover.jpg>               Explicit cover image
  --cta                             Append call-to-action footer
  --dry-run                         Preview only, don't create draft

Draft add JSON fields:
  title (required)      Article title (max 32 chars)
  content (required)    HTML body (images must use WeChat CDN URLs)
  thumb_media_id        Cover image permanent media_id
  author                Author name (max 16 chars)
  digest                Summary (max 128 chars)
  content_source_url    Original article URL
  need_open_comment     1=enable comments (default), 0=disable
  only_fans_can_comment 1=fans only, 0=all (default)
`);
}

// ── CLI Entry ───────────────────────────────────────────────

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const [,, cmd, sub, ...rest] = process.argv;

async function main() {
  switch (cmd) {
    case 'init':
      initDb();
      break;
    case 'auth':
      await cmdAuth();
      break;
    case 'upload-image':
      await cmdUploadImage(sub);
      break;
    case 'upload-cover':
      await cmdUploadCover(sub);
      break;
    case 'draft':
      switch (sub) {
        case 'add': {
          const json = getArg(rest, '--json');
          await cmdDraftAdd(json);
          break;
        }
        case 'list':
          await cmdDraftList(rest);
          break;
        case 'get':
          await cmdDraftGet(rest[0]);
          break;
        case 'delete':
        case 'rm':
          await cmdDraftDelete(rest[0]);
          break;
        default:
          console.log('Usage: wechat-publisher draft <add|list|get|delete>');
      }
      break;
    case 'publish':
      await cmdPublish(sub);
      break;
    case 'publish-status':
      await cmdPublishStatus(sub);
      break;
    case 'history':
    case 'ls':
      cmdHistory([sub, ...rest].filter(Boolean));
      break;
    case 'search':
    case 's':
      cmdSearch([sub, ...rest].filter(Boolean).join(' '));
      break;
    case 'publish-file':
      await cmdPublishFile(sub, rest);
      break;
    case 'convert':
      cmdConvert(sub, rest);
      break;
    default:
      showHelp();
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
