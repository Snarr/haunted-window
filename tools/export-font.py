"""Export the Pi's Pillow glyph rasters; pass PixelOperator.ttf as argv[1]."""
import sys, json, hashlib, base64
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
font_path=Path(sys.argv[1]); font=ImageFont.truetype(str(font_path),16)
glyphs={}
for code in range(32,127):
 ch=chr(code);box=font.getbbox(ch); advance=font.getlength(ch)
 assert advance==int(advance)
 tile=Image.new('L',(max(1,box[2]-box[0]),max(1,box[3]-box[1])))
 ImageDraw.Draw(tile).text((-box[0],-box[1]),ch,font=font,fill=255)
 glyphs[ch]={'box':box,'advance':int(advance),'pixels':base64.b64encode(tile.tobytes()).decode()}
# Confirm the font does not introduce pair kerning or non-additive bounds.
for a in glyphs:
 for b in glyphs:
  assert font.getlength(a+b)==glyphs[a]['advance']+glyphs[b]['advance']
  assert font.getbbox(a+b)==(0,min(glyphs[a]['box'][1],glyphs[b]['box'][1]),glyphs[a]['advance']+glyphs[b]['box'][2],max(glyphs[a]['box'][3],glyphs[b]['box'][3]))
Path('docs/pixel-font.json').write_text(json.dumps({'font':'PixelOperator','size':16,'sha256':hashlib.sha256(font_path.read_bytes()).hexdigest(),'glyphs':glyphs},separators=(',',':')))
print('Exported 95 glyphs; all 9,025 character pairs match Pillow metrics.')
