import {readFile, writeFile, readdir, copyFile, mkdir} from 'node:fs/promises';
import {extname} from 'node:path';
const downloads = 'C:/Users/lukec/Downloads/';
const records = JSON.parse(await readFile('sources/register.json', 'utf8'));
const imageNames = (await readdir(downloads)).filter(n => /^WhatsApp Image 2026-09-06 at 11\.00\..*\.jpeg$/.test(n)).sort();
const documents = {
  F07:'AURA GEODE to MACRO.pdf', F08:'Web3 Sensorium for Science Debate.pdf',
  F09:'Solar Swarm Satellite Research Report.pdf', F10:'Super Alignment of Artificial Super Intelligence.docx',
  F11:'AoI Super Assistant.pdf', F12:'Super-Computers of North Straddie.pdf', F13:'Blend Aura to Unity.docx',
  F14:'Version7 Aura of Intelligence 2023 July (1).pdf', F15:'03 The Constitutional Matrix of Participation 2.pdf'
};
const images = {F17:2,F18:1,F19:7,F20:8,F21:6,F22:3,F27:10,F28:13,F30:14,F31:15,F32:16,F33:18,F34:19,F35:22};
const extras = [
  ['F46','document','Australian C-Hour Legislative Strategy','Australian C-Hour Legislative Strategy.pdf','08','A strategy document exploring the Community-Hour and Australian legislation.'],
  ['F47','document','Clinical Research Path for Aura of Dementia','Clinical Research Path for Aura of Dementia (1).pdf','04','A first-draft research plan for an Aura dementia care system, developed with Google Gemini.'],
  ['F48','document','Space Weather Data IFTTT','Space Weather Data IFTTT.pdf','10','A conversation exploring space weather data, sensors and automated data connections.'],
  ['F49','document','What Would You Choose 2023','What Would You Choose 2023 (1).pdf','03','A 2023 slide collection exploring life choices, Sudden Life Gaming and Joyful Responsible Abundance.'],
  ['F50','image','Travel photograph beside a golden Buddha statue',4,'09','A travel photograph beside a golden Buddha statue.'],
  ['F51','image','Tiny-planet travel photograph',5,'09','A tiny-planet panorama from my travels.'],
  ['F52','image','A quiet moment beneath a chakra tapestry',9,'03','A personal photograph beneath a chakra tapestry.'],
  ['F53','image','Travel and event photo collage',11,'09','A selfie and event photograph brought together in a collage.'],
  ['F54','image','SDNx innovation lab event post',17,'09','A saved public post about the SDNx innovation lab event in Kolhapur in June 2019.'],
  ['F55','image','Purple Party for Australia artwork',20,'08','Purple Party for Australia artwork with Joyful Responsible Abundance.'],
  ['F56','image','Trying virtual reality',21,'01','A personal photograph with a virtual reality headset.']
];
await mkdir('assets/archive/intake-20260906', {recursive:true});
const imported = [];
async function attach(record, filename) {
  const publicPath = `assets/archive/intake-20260906/${record.id.toLowerCase()}${extname(filename).toLowerCase()}`;
  await copyFile(downloads + filename, publicPath);
  if (record.location !== filename && !record.previousLocation) record.previousLocation = record.location;
  Object.assign(record, {location:filename, publicPath, availability:'published-source'});
  imported.push({id:record.id,title:record.title,filename,publicPath});
}
for(const [id,name] of Object.entries(documents)) await attach(records.find(r=>r.id===id),name);
for(const [id,index] of Object.entries(images)) await attach(records.find(r=>r.id===id),imageNames[index-1]);
for(const [id,type,title,input,primaryPage,notes] of extras) {
  let record = records.find(r=>r.id===id);
  if(!record) { record={id,type,title,primaryPage,notes,status:'Source supplied by Luke Nathan Hayes',authorship:'Supplied by Luke Nathan Hayes'}; records.push(record); }
  await attach(record,type==='image'?imageNames[input-1]:input);
}
await writeFile('sources/register.json',JSON.stringify(records,null,2)+'\n');
await writeFile('data/source-intake-20260906.json',JSON.stringify({imported,duplicateImage:imageNames[11],remaining:records.filter(r=>r.availability==='missing-locally').map(r=>({id:r.id,title:r.title,filename:r.location}))},null,2)+'\n');
const fields=['id','type','title','location','primaryPage','status','notes'];
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
await writeFile('sources/source-register.csv', 'source_id,type,title,location,primary_page,status,notes\n'+records.map(r=>fields.map(k=>quote(r[k])).join(',')).join('\n')+'\n');
console.log(`Connected ${imported.length} sources. Remaining: ${records.filter(r=>r.availability==='missing-locally').map(r=>r.title).join('; ')}`);
