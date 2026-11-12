#!/bin/sh
# Кадры первого экрана из видео, улучшенного Topaz (видео/topaz-4k.mp4, 3848×2152)
cd "$(dirname "$0")/.." || exit 1
F="$HOME/Claude code/Мои проекты/Болталка/инструменты/ffmpeg/ffmpeg"
S="видео/topaz-4k.mp4"
rm -rf /tmp/нк /tmp/нкм && mkdir -p /tmp/нк /tmp/нкм
"$F" -hide_banner -loglevel error -y -i "$S" -vf 'crop=3848:2148:0:2,scale=1920:-2:flags=lanczos' -c:v libwebp -quality 74 -compression_level 4 /tmp/нк/%04d.webp &
# мобильная обрезка та же, что у прежних кадров: x≈33% ширины, по вертикали весь кадр
"$F" -hide_banner -loglevel error -y -i "$S" -vf 'crop=1289:2148:1270:2,scale=540:900:flags=lanczos' -c:v libwebp -quality 70 -compression_level 4 /tmp/нкм/%04d.webp &
wait
[ "$(ls /tmp/нк | wc -l)" -eq 361 ] && [ "$(ls /tmp/нкм | wc -l)" -eq 361 ] || { echo "кадров не 361"; ls /tmp/нк | wc -l; ls /tmp/нкм | wc -l; exit 1; }
rm -rf сайт/assets/кадры сайт/assets/кадры-м
mv /tmp/нк сайт/assets/кадры && mv /tmp/нкм сайт/assets/кадры-м
du -sh сайт/assets/кадры сайт/assets/кадры-м
