import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const uploadToFirebase = async (filePath, fileName) => {
  const content = readFileSync(filePath);
  const type = 'image/png';
  const url = `https://firebasestorage.googleapis.com/v0/b/leadership-overview.firebasestorage.app/o?name=icons%2F${fileName}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': type,
      },
      body: content,
    });
    const data = await res.json();
    console.log(`Uploaded ${fileName}:`, `https://firebasestorage.googleapis.com/v0/b/leadership-overview.firebasestorage.app/o/icons%2F${fileName}?alt=media`);
  } catch (err) {
    console.error(`Failed ${fileName}:`, err);
  }
};

const dir = "C:\\Users\\admin\\.gemini\\antigravity\\brain\\ed1bc350-83fe-42f5-847f-61764739f2a5";
const files = readdirSync(dir)
  .filter(f => f.startsWith('media__1776197051') && f.endsWith('.png'))
  .map(f => ({ name: f, path: path.join(dir, f), size: statSync(path.join(dir, f)).size }));

// Let's identify them by size based on the output earlier
for (const f of files) {
   let friendlyName = f.name;
   if (f.size === 17376) friendlyName = 'linkedin.png';
   else if (f.size === 9365) friendlyName = 'chat.png';
   else if (f.size === 9304) friendlyName = 'phone.png';
   else if (f.size === 8880) friendlyName = 'globe.png';
   
   await uploadToFirebase(f.path, friendlyName);
}
