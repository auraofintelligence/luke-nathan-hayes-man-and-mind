import { readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Only rewrites website copies. Original downloads are never touched.
const directory = resolve('assets/video');
function atoms(buffer) {
  const result = [];
  for (let offset = 0; offset + 8 <= buffer.length;) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (size === 1) size = Number(buffer.readBigUInt64BE(offset + 8));
    if (size === 0) size = buffer.length - offset;
    if (size < 8 || offset + size > buffer.length) throw new Error('Invalid MP4 atom');
    result.push(type);
    offset += size;
  }
  return result;
}
const report = [];
for (const name of (await readdir(directory)).filter(name => name.endsWith('.mp4') && !name.endsWith('.faststart.mp4'))) {
  const path = resolve(directory, name);
  const before = await stat(path);
  const layout = atoms(await readFile(path));
  const needsFastStart = layout.indexOf('moov') > layout.indexOf('mdat');
  const probe = () => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], {encoding:'utf8'}));
  const original = probe();
  if (needsFastStart) {
    const temporary = path.replace(/\.mp4$/, '.faststart.mp4');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', path, '-map', '0', '-c', 'copy', '-movflags', '+faststart', temporary]);
    await rename(temporary, path);
  }
  const updated = probe();
  const finalLayout = atoms(await readFile(path));
  if (finalLayout.indexOf('moov') < 0 || finalLayout.indexOf('moov') > finalLayout.indexOf('mdat')) throw new Error(`${name}: not fast start`);
  if (Math.abs(Number(updated.format.duration) - Number(original.format.duration)) > .05) throw new Error(`${name}: duration changed`);
  // Decode the complete file to catch damaged video or audio packets.
  execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-xerror', '-i', path, '-f', 'null', '-']);
  const video = updated.streams.find(s => s.codec_type === 'video');
  const audio = updated.streams.find(s => s.codec_type === 'audio');
  const row = {name, beforeBytes:before.size, bytes:(await stat(path)).size, seconds:Number(updated.format.duration), kbps:Math.round(Number(updated.format.bit_rate)/1000), video:video.codec_name, audio:audio.codec_name, width:video.width, height:video.height, fps:video.r_frame_rate, fastStart:true, remuxed:needsFastStart, decodeCheck:'passed'};
  report.push(row);
  console.log(JSON.stringify(row));
}
await writeFile(resolve('data/video-audit.json'), JSON.stringify(report, null, 2) + '\n');
