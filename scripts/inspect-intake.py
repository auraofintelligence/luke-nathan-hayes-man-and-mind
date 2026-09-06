from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
from pypdf import PdfReader
from docx import Document
import json

downloads = Path('C:/Users/lukec/Downloads')
out = Path('tmp/intake')
out.mkdir(parents=True, exist_ok=True)
images = sorted(downloads.glob('WhatsApp Image 2026-09-06 at 11.00.*.jpeg'))
for batch in range(0, len(images), 6):
    sheet = Image.new('RGB', (1200, 1500), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(images[batch:batch+6]):
        im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
        im.thumbnail((590, 455))
        x, y = (i % 2)*600, (i//2)*500
        sheet.paste(im, (x+(600-im.width)//2,y))
        draw.text((x+10,y+460), f'{batch+i+1}: {path.name}', fill='black')
    sheet.save(out/f'sheet-{batch//6+1}.jpg')
print(json.dumps({i+1:p.name for i,p in enumerate(images)},indent=2))
names = ['Super Alignment of Artificial Super Intelligence.docx','03 The Constitutional Matrix of Participation 2.pdf','AoI Super Assistant.pdf','AURA GEODE to MACRO.pdf','Australian C-Hour Legislative Strategy.pdf','Clinical Research Path for Aura of Dementia (1).pdf','Solar Swarm Satellite Research Report.pdf','Space Weather Data IFTTT.pdf','Super-Computers of North Straddie.pdf','Version7 Aura of Intelligence 2023 July (1).pdf','Web3 Sensorium for Science Debate.pdf','What Would You Choose 2023 (1).pdf','Blend Aura to Unity.docx']
for name in names:
    path = downloads/name
    if path.suffix == '.pdf':
        doc = PdfReader(path)
        text = '\n'.join(p.extract_text() or '' for p in doc.pages)
        count = len(doc.pages)
    else:
        doc = Document(path)
        text = '\n'.join(p.text for p in doc.paragraphs)
        count = 'docx'
    (out/(path.stem+'.txt')).write_text(text, encoding='utf-8')
    print(name, path.stat().st_size, count, text[:1100].replace('\n',' '))
