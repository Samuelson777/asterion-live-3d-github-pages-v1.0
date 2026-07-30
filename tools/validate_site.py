from pathlib import Path
import re, json, sys
root=Path(__file__).resolve().parents[1]
required=['index.html','css/styles.css','js/app.js','js/versions.js','.github/workflows/pages.yml','.nojekyll']
errors=[]
for p in required:
    if not (root/p).exists(): errors.append(f'missing {p}')
text=(root/'index.html').read_text(encoding='utf-8')
refs=set(re.findall(r'(?:src|href)="([^"#]+)"',text))
for ref in sorted(refs):
    if ref.startswith(('http:','https:','mailto:')): continue
    p=(root/ref.split('?')[0])
    if not p.exists(): errors.append(f'broken reference {ref}')
model_count=len(list((root/'assets/models').glob('*.glb')))
if model_count!=9: errors.append(f'expected 9 GLB assets, found {model_count}')
if errors:
    print('\n'.join('ERROR: '+e for e in errors));sys.exit(1)
print(json.dumps({'status':'PASS','glb_assets':model_count,'files':sum(1 for p in root.rglob('*') if p.is_file())},indent=2))
