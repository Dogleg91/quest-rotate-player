# yt.js からブックマークレット文字列を作り、setup.html に埋め込む。
# 使い方: python build.py
import html
import re
from pathlib import Path

here = Path(__file__).parent
src = (here / 'yt.js').read_text(encoding='utf-8')

lines = []
for line in src.splitlines():
    line = re.sub(r'\s+//.*$', '', line)   # 行末コメント
    line = line.strip()
    if not line or line.startswith('//'):
        continue
    lines.append(line)
code = ' '.join(lines)
bookmarklet = 'javascript:' + code.replace('%', '%25')

(here / 'bookmarklet.txt').write_text(bookmarklet, encoding='utf-8')
tpl = (here / 'setup.template.html').read_text(encoding='utf-8')
(here / 'setup.html').write_text(tpl.replace('{{BOOKMARKLET}}', html.escape(bookmarklet)), encoding='utf-8')
print(f'bookmarklet: {len(bookmarklet)} chars')
