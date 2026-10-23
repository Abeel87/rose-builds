from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
records=json.loads((ROOT/'render-manifest.json').read_text())
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
for page in range(math.ceil(len(records)/24)):
    subset=records[page*24:(page+1)*24]
    canvas=Image.new('RGB',(1280,6*200+40),(27,32,42));d=ImageDraw.Draw(canvas)
    d.text((10,8),'Each pair: LEFT azimuth -65 / RIGHT +65. Original Global client models; choose the face/front view.',fill='white',font=font)
    for i,rec in enumerate(subset):
        x=i%4*320;y=i//4*200+40
        d.rectangle((x,y,x+319,y+199),outline=(69,76,90))
        d.text((x+6,y+4),f'{rec["npcId"]}  {rec["name"]}'[:45],fill='white',font=font)
        for j,suffix in enumerate(['','-opposite']):
            path=ROOT/'renders'/f'{rec["npcId"]}{suffix}.png'
            if path.exists():
                im=Image.open(path).convert('RGBA');im.thumbnail((157,171),Image.Resampling.LANCZOS)
                canvas.paste(im,(x+j*160+(160-im.width)//2,y+24+(171-im.height)//2),im)
            else:d.text((x+j*160+10,y+95),'NEEDS REVIEW',fill=(255,180,100),font=small)
    canvas.save(ROOT/f'contact-pairs-{page+1}.jpg',quality=94)
    print(ROOT/f'contact-pairs-{page+1}.jpg')
