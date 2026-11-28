import fs from 'fs';
import path from 'path';

function mdToHtml(md, title) {
  let body = md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<div class="img-container"><img alt="$1" src="$2"><p class="caption">$1</p></div>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #1e293b;
    max-width: 950px;
    margin: 0 auto;
    padding: 40px 20px;
    background: #f8fafc;
  }
  .content-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06);
    border: 1px solid #e2e8f0;
  }
  h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-top: 0; }
  h2 { color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 36px; }
  h3 { color: #2563eb; margin-top: 24px; }
  h4 { color: #334155; margin-top: 18px; }
  blockquote {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    margin: 20px 0;
    padding: 14px 20px;
    border-radius: 0 8px 8px 0;
    color: #1e40af;
  }
  .img-container { text-align: center; margin: 24px 0; }
  img { max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); border: 1px solid #cbd5e1; }
  .caption { font-size: 13px; color: #64748b; margin-top: 8px; font-style: italic; }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 8px; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 90%; color: #d97706; }
  .btn-print {
    position: fixed; top: 20px; right: 20px; background: #2563eb; color: white; border: none;
    padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600;
  }
  @media print {
    body { background: white; padding: 0; }
    .content-card { border: none; box-shadow: none; padding: 0; }
    .btn-print { display: none; }
  }
</style>
</head>
<body>
<button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
<div class="content-card">
  ${body}
</div>
</body>
</html>`;
}

const files = [
  { name: 'PANDUAN_AFFILIATE.md', title: 'Panduan Mitra Affiliate MapahTrip' },
  { name: 'PANDUAN_STAF_PIC.md', title: 'Panduan Staf PIC Konsulat MapahTrip' },
  { name: 'PANDUAN_OWNER.md', title: 'Panduan Eksekutif Owner MapahTrip' }
];

for (const f of files) {
  const p = path.join('docs', f.name);
  if (fs.existsSync(p)) {
    const md = fs.readFileSync(p, 'utf8');
    const html = mdToHtml(md, f.title);
    const outName = f.name.replace('.md', '.html');
    fs.writeFileSync(path.join('docs', outName), html, 'utf8');
    fs.writeFileSync(path.join('C:\\Users\\User\\Downloads', outName), html, 'utf8');
    console.log('Generated:', outName);
  }
}
