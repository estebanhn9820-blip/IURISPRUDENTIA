const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_USER = process.env.APP_USER || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_TEXT_LENGTH = 100000;
const runFile = promisify(execFile);

if (!APP_PASSWORD || !OPENAI_API_KEY) {
  console.error('Faltan variables obligatorias: APP_PASSWORD y OPENAI_API_KEY.');
  process.exit(1);
}

function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    let credentials = '';
    try { credentials = Buffer.from(encoded, 'base64').toString('utf8'); } catch {}
    const separator = credentials.indexOf(':');
    const user = separator >= 0 ? credentials.slice(0, separator) : '';
    const password = separator >= 0 ? credentials.slice(separator + 1) : '';
    const userBuffer = Buffer.from(user);
    const expectedUser = Buffer.from(APP_USER);
    const passwordBuffer = Buffer.from(password);
    const expectedPassword = Buffer.from(APP_PASSWORD);
    const userMatches = userBuffer.length === expectedUser.length && crypto.timingSafeEqual(userBuffer, expectedUser);
    const passwordMatches = passwordBuffer.length === expectedPassword.length && crypto.timingSafeEqual(passwordBuffer, expectedPassword);
    if (userMatches && passwordMatches) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="IURISPRUDENTIA", charset="UTF-8"');
  return res.status(401).send('Autenticación requerida.');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 2, fieldSize: 2048 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.docx', '.txt'].includes(extension)) return callback(new Error('Formato no permitido. Usa PDF, DOCX o TXT.'));
    callback(null, true);
  }
});

async function extractText(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === '.txt') return file.buffer.toString('utf8');
  if (extension === '.pdf') {
    const parsed = await pdfParse(file.buffer);
    return parsed.text;
  }
  // Use the system unzip utility to extract only the document XML; no archive paths are written to disk.
  const tempFile = path.join(require('node:os').tmpdir(), `${crypto.randomUUID()}.docx`);
  try {
    await fs.writeFile(tempFile, file.buffer, { flag: 'wx', mode: 0o600 });
    const { stdout } = await runFile('unzip', ['-p', tempFile, 'word/document.xml'], { maxBuffer: MAX_FILE_SIZE * 5, timeout: 10000 });
    return stdout.replace(/<w:tab\b[^>]*\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  } finally {
    await fs.rm(tempFile, { force: true });
  }
}

async function makeSummary(text, citation, topic) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: 'Eres un asistente de investigación jurídica. Resume providencias colombianas en español, de forma fiel y estructurada. No inventes hechos, normas, fechas ni decisiones. Si un dato no aparece en el texto, indícalo. Incluye: problema jurídico, decisión y regla o criterio relevante. Aclara al final que el resumen no reemplaza la lectura de la providencia.' },
        { role: 'user', content: `Radicado: ${citation}\nTema indicado: ${topic}\n\nResume esta providencia basándote únicamente en el texto:\n\n${text.slice(0, 80000)}` }
      ]
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || 'El servicio de resumen no está disponible.');
    error.status = response.status === 401 || response.status === 429 ? 502 : 503;
    throw error;
  }
  const summary = result.choices?.[0]?.message?.content?.trim();
  if (!summary) throw Object.assign(new Error('El servicio no generó un resumen.'), { status: 502 });
  return summary;
}

app.use(requireLogin);
app.use(express.static(__dirname, { index: 'index.html', dotfiles: 'ignore' }));

app.get('/api/sentences', async (req, res, next) => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const names = await fs.readdir(DATA_DIR);
    const records = await Promise.all(names.filter(name => /^[a-f0-9-]+\.json$/i.test(name)).map(async name => {
      try {
        const record = JSON.parse(await fs.readFile(path.join(DATA_DIR, name), 'utf8'));
        const { text, ...publicRecord } = record;
        return publicRecord;
      } catch { return null; }
    }));
    res.json(records.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) { next(error); }
});

app.get('/api/sentences/:id', async (req, res, next) => {
  if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Identificador inválido.' });
  try {
    const record = JSON.parse(await fs.readFile(path.join(DATA_DIR, `${req.params.id}.json`), 'utf8'));
    res.json({ id: record.id, citation: record.citation, text: record.text });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'No se encontró la providencia.' });
    next(error);
  }
});

app.post('/api/sentences', (req, res, next) => {
  upload.single('file')(req, res, async error => {
    if (error) return res.status(error instanceof multer.MulterError ? 400 : 400).json({ error: error.message });
    try {
      const citation = String(req.body.citation || '').trim().slice(0, 160);
      const topic = String(req.body.topic || '').trim().slice(0, 80);
      if (!citation || !topic || !req.file) return res.status(400).json({ error: 'Indica el radicado, el tema y selecciona un archivo.' });
      let text;
      try { text = (await extractText(req.file)).replace(/\u0000/g, '').trim(); }
      catch { return res.status(400).json({ error: 'No se pudo leer el archivo. Verifica que sea un PDF, DOCX o TXT válido y que el PDF contenga texto.' }); }
      if (!text) return res.status(400).json({ error: 'No se encontró texto legible en el archivo. Los PDF escaneados requieren OCR antes de cargarlos.' });
      text = text.slice(0, MAX_TEXT_LENGTH);
      const summary = await makeSummary(text, citation, topic);
      const record = { id: crypto.randomUUID(), citation, topic, filename: path.basename(req.file.originalname).slice(0, 180), summary, text, createdAt: new Date().toISOString() };
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(path.join(DATA_DIR, `${record.id}.json`), JSON.stringify(record), { flag: 'wx', mode: 0o600 });
      const { text: privateText, ...publicRecord } = record;
      res.status(201).json(publicRecord);
    } catch (caught) { next(caught); }
  });
});

app.use((error, req, res, next) => {
  console.error(error.message || error);
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Ocurrió un error interno. Inténtalo de nuevo.' });
});

app.listen(PORT, () => console.log(`IURISPRUDENTIA lista en el puerto ${PORT}`));
