# Подготовка файлов сайта из исходников: python3 подготовка.py
import json, glob, os, shutil, subprocess
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'исходники из фигмы')
OUT = os.path.join(HERE, 'assets')
FFMPEG = os.path.expanduser('~/Claude code/Мои проекты/Болталка/инструменты/ffmpeg/ffmpeg')
HERO_VIDEO = os.path.join(ROOT, 'видео', 'Place the moving (1) (1).mp4')
NIKITA_VIDEO = os.path.join(ROOT, 'видео', 'никита.mp4')

for d in ['', 'кадры', 'фото', 'шрифты', 'vendor']:
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

data = json.load(open(os.path.join(SRC, 'секция.json')))
images = data['images']

def src(h):
    return glob.glob(os.path.join(SRC, 'картинки', h + '*'))[0]

def find_paint(node_name, width=None):
    hit = []
    def walk(n):
        if n['name'] == node_name and (width is None or round(n.get('w', 0)) == width):
            for f in n.get('fills') or []:
                if f['type'] == 'IMAGE':
                    hit.append(f)
        for c in n.get('children', []):
            walk(c)
    walk(data['roots'][0])
    return hit[0]

def crop_by_paint(paint):
    im = Image.open(src(paint['imageHash'][:12]))
    t = paint.get('imageTransform')
    if paint.get('scaleMode') == 'CROP' and t:
        w, h = im.size
        sx, tx, sy, ty = t[0][0], t[0][2], t[1][1], t[1][2]
        im = im.crop((int(tx * w), int(ty * h), int((tx + sx) * w), int((ty + sy) * h)))
    return im

def save(im, name, maxw, q=82):
    im = im.copy()
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    path = os.path.join(OUT, name)
    if name.endswith('.webp'):
        im.save(path, quality=q, method=6)
    else:
        im.convert('RGB').save(path, quality=q, optimize=True, progressive=True)

# аватар для говорящей головы
save(crop_by_paint(find_paint('Ellipse 1', 163)), 'фото/никита.jpg', 600)
# иконки карточек «для кого»
save(crop_by_paint(find_paint('5557cb85-c2eb-4ca2-a964-8711ffe73952 3')), 'фото/иконка-цены.webp', 400)
save(crop_by_paint(find_paint('6ce809a8-2181-4a6b-9998-f4608acf0c69 1')), 'фото/иконка-вопрос.webp', 400)
save(crop_by_paint(find_paint('fe1f38e2-955b-4ad4-8502-f057982434c6 1')), 'фото/иконка-время.webp', 400)
# у иконок в макете тёмный фон чуть разного оттенка, поэтому на карточках виден шов —
# сайт использует png, где фон вырезан в прозрачный по яркости самого светлого канала
def cutout(name, lo=42, hi=110):
    im = Image.open(os.path.join(OUT, name + '.webp')).convert('RGB')
    out = Image.new('RGBA', im.size)
    src_px, dst_px = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = src_px[x, y]
            m = max(r, g, b)
            a = 0 if m <= lo else 255 if m >= hi else round((m - lo) / (hi - lo) * 255)
            dst_px[x, y] = (r, g, b, a)
    out.save(os.path.join(OUT, name + '.png'))
for icon in ['иконка-вопрос', 'иконка-время', 'иконка-цены']:
    cutout(icon)
# рендер квартиры без белых полей сверху и снизу
render = Image.open(src('5b01c2947bc4'))
gray = render.convert('L')
rows = [y for y in range(gray.height) if sum(gray.crop((0, y, gray.width, y + 1)).getdata()) / gray.width < 245]
render = render.crop((0, rows[0] + 2, render.width, rows[-1] - 1))
# белое поле картинки умножаем на цвет блока (#edecec), чтобы рендер не выглядел белой заплаткой
from PIL import ImageChops
render = ImageChops.multiply(render.convert('RGB'), Image.new('RGB', render.size, (237, 236, 236)))
save(render, 'фото/рендер.jpg', 4096, 84)
print('рендер', render.size, 'обрезано сверху', rows[0] + 2)
# линии эскиза для рисовки рендера: из HTML в папке «горизонтальный скролл»
import re
full_h = gray.height
sketch_html = open(glob.glob(os.path.join(ROOT, 'горизонтальный скролл', '*.html'))[0], encoding='utf-8').read()
vb_w, vb_h = [float(v) for v in re.search(r'id="roomSvg"[^>]*viewBox="([^"]+)"', sketch_html).group(1).split()[2:]]
paths = re.findall(r'<path class="draw-path" d="([^"]+)" data-maxx="([\d.]+)" data-minx="([\d.]+)"', sketch_html)
sketch = {
    'w': vb_w,
    # эскиз нарисован по картинке с белыми полями, а на сайте поля срезаны — сдвигаем окно просмотра
    'top': round((rows[0] + 2) / full_h * vb_h, 2),
    'h': round(render.height / full_h * vb_h, 2),
    'paths': [[p.replace('.00', ''), float(mn), float(mx)] for p, mx, mn in paths],
}
open(os.path.join(OUT, 'рисовка.js'), 'w').write('window.SKETCH = ' + json.dumps(sketch, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('линий эскиза', len(sketch['paths']))
# фото из сообщения в чате дома
chat = Image.open(src('37dd787cb5c3')).convert('RGB')
save(chat.crop((82, 208, 505, 746)), 'фото/чат-шкаф.jpg', 700, 84)
# персонаж в футере
foot = Image.open(src('d5bd4b6cd013')).convert('RGBA')
foot.thumbnail((1000, 1250))
foot.save(os.path.join(OUT, 'фото/никита-футер.webp'), quality=86, method=6)
# фото кейсов
cases = {
    '1': ['3b580a95b02f', 'cdaf99bc2984', '3db060152435', '8b4519816122', 'b30cea999f90', '36ff9ba19132'],
    '2': ['93ce6a2909ec', '95bd2c8cbe01', '38e737477981', '05483dfd6a7e', 'e47a419cb1a7', 'fba8c2f7bd9e'],
    '4': ['8d0614aed9b8', '85d428276f72', '9c436d2ae938', 'e2d109e6fd92', '2f0024c2228b', '62318ff11455'],
}
for case, hashes in cases.items():
    for i, h in enumerate(hashes, 1):
        save(Image.open(src(h)), f'фото/кейс{case}-{i}.jpg', 900, 80)

# шрифты
fonts = {
    'Gilroy-SemiBold.otf': '~/Library/Fonts/Radomir Tinkov - Gilroy-SemiBold.otf',
    'FeatureMono-Regular.ttf': '~/Library/Fonts/FeatureMono-Regular.ttf',
    'FeatureMono-Medium.ttf': '~/Library/Fonts/FeatureMono-Medium.ttf',
    'InterTight.ttf': '~/Library/Fonts/InterTight-VariableFont_wght.ttf',
}
for dst, s in fonts.items():
    shutil.copy(os.path.expanduser(s), os.path.join(OUT, 'шрифты', dst))
for sub in ['cyrillic', 'latin']:
    p = os.path.join(OUT, 'шрифты', f'JetBrainsMono-{sub}.woff2')
    if not os.path.exists(p):
        subprocess.run(['curl', '-sf', '-o', p, f'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/{sub}-400-normal.woff2'], check=True)

# библиотеки анимаций (те же версии, что в «Прогрессе»)
vendor = os.path.expanduser('~/Claude code/Рабочие проекты/Прогресс/work/current/vendor')
for f in ['gsap.min.js', 'ScrollTrigger.min.js', 'lenis.min.js']:
    shutil.copy(os.path.join(vendor, f), os.path.join(OUT, 'vendor', f))

# кадры первого экрана теперь собирает кадры-из-topaz.sh из улучшенного видео;
# этот шаг оставлен выключенным, иначе он перезапишет их старым исходником
frames_dir = os.path.join(OUT, 'кадры')
count = len(glob.glob(os.path.join(frames_dir, '*.webp')))

# заглушка видео Никиты, пока нет настоящего
if not os.path.exists(NIKITA_VIDEO):
    font = os.path.join(OUT, 'шрифты', 'FeatureMono-Medium.ttf')
    subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-i', os.path.join(OUT, 'фото/никита.jpg'),
                    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '20',
                    '-vf', "scale=1200:-2,zoompan=z='1+0.0006*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=480:s=600x600:fps=24,"
                           f"drawtext=fontfile='{font}':text='ЗДЕСЬ БУДЕТ ВИДЕО':fontcolor=white:fontsize=30:x=(w-tw)/2:y=h-90:box=1:boxcolor=0x201911@0.6:boxborderw=12",
                    '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', NIKITA_VIDEO], check=True)
shutil.copy(NIKITA_VIDEO, os.path.join(OUT, 'никита.mp4'))

open(os.path.join(OUT, 'кадры.js'), 'w').write(f'window.HERO_FRAMES = {count};\n')
print('кадров', count)
