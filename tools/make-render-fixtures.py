"""Create reference frames using the same Pillow operations as the Pi."""
import json, hashlib, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
font=ImageFont.truetype(sys.argv[1],16)
texts=['HAPPY HALLOWEEN!','BOO','TRICK OR TREAT','A_B [123] @#$%','.,!? /\\|:;(){}<>-+=*','W'*60, ''.join(chr(i) for i in range(32,127)).upper()]
fixtures=[]
for text in texts:
 box=font.getbbox(text)
 tile=Image.new('RGB',(box[2]-box[0],box[3]-box[1]))
 ImageDraw.Draw(tile).text((-box[0],-box[1]),text,font=font,fill=(255,170,75))
 scale=min(3,28/max(1,tile.height))
 banner=tile.resize((max(1,round(tile.width*scale)),max(1,round(tile.height*scale))),Image.Resampling.NEAREST)
 for t in (0,.05,1.25,3.555,3.7,5,9.2,20):
  frame=Image.new('RGB',(128,32));frame.paste(banner,(int(128-t*36),(32-banner.height)//2))
  fixtures.append({'text':text,'time':t,'width':banner.width,'height':banner.height,'sha256':hashlib.sha256(frame.convert('RGBA').tobytes()).hexdigest()})
Path('tests/render-fixtures.json').write_text(json.dumps(fixtures,indent=2)+'\n')
