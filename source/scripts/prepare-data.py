"""Rebuild normalized, attributed candidate data from a pinned FreeDict archive.
Requires the source archive and extracted official CET text supplied as arguments.
No sense/translation cross-product and no regional IPA assumptions.
"""
import sys,json,hashlib,tarfile,re,pathlib,xml.etree.ElementTree as ET,unicodedata
sys.stdout.reconfigure(encoding='utf-8')
root=pathlib.Path(__file__).resolve().parents[1];out=root.parent
archive=pathlib.Path(sys.argv[1]);cettext=pathlib.Path(sys.argv[2])
expected='25aed0f1d7de68919aa9da1ba92d67f566ae4ea81660f42071c81fc21e56d4b210d61df379315678648c45ca7e52c4a0ba2eec009fbaab7c72e7472489e1fc4c'
assert hashlib.sha512(archive.read_bytes()).hexdigest()==expected,'FreeDict checksum mismatch'
with tarfile.open(archive) as t:
    xml=t.extractfile('eng-zho/eng-zho.tei').read()
    (out/'licenses/FreeDict-CC-BY-SA-3.0.txt').write_bytes(t.extractfile('eng-zho/COPYING').read())
    # Retain editable adopted source and its original notices, separate from MIT code.
    (out/'data/freedict-eng-zho-2025.11.23.tei').write_bytes(xml)
ns={'t':'http://www.tei-c.org/ns/1.0'}
def text(x):return ' '.join(''.join(x.itertext()).split()) if x is not None else ''
def stable(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
dictionary=[]
for e in ET.fromstring(xml).findall('.//t:entry',ns):
    lemma=text(e.find('t:form/t:orth',ns));pos=text(e.find('t:gramGrp/t:pos',ns))
    if not lemma:continue
    senses=[]
    for s in e.findall('t:sense',ns):
        zh='；'.join(dict.fromkeys(text(x) for x in s.findall('t:cit/t:quote',ns) if text(x)))
        en=' / '.join(dict.fromkeys(text(x) for x in s.findall('.//t:def',ns) if text(x)))
        if zh:
            senses.append(dict(id='fd-s-'+stable(lemma+'|'+pos+'|'+zh+'|'+en),pos=pos or '未注明',en=en,zh=zh,source='freedict-eng-zho-2025.11.23',status='来源候选 · 未独立语言审阅'))
    if not senses:continue
    ipa=list(dict.fromkeys(text(x) for x in e.findall('t:form/t:pron',ns) if text(x)))
    dictionary.append(dict(id='fd-l-'+stable(lemma+'|'+pos),lemma=lemma,ipa={'other':ipa},senses=senses))
# Original rows and derived/variant forms remain associated, with page/order evidence.
lines=cettext.read_text(encoding='utf-8').splitlines();start=next(i for i,x in enumerate(lines) if x.strip()=='a/an');end=next(i for i in range(start,len(lines)) if lines[i].strip()=='★ zoom')
meta=cettext.with_suffix('.meta.json')
line_offset=int(json.loads(meta.read_text(encoding='utf8'))['originalStartLine'])-1 if meta.exists() else 0
rows=[]
for i in range(start,end+1):
    line=lines[i].strip()
    if not re.match(r'^(?:★\s*)?[A-Za-z]',line):continue
    six=line.startswith('★');raw=re.sub(r'^★\s*','',line)
    parts=raw.split();head=parts[0]
    forms=[]
    for part in parts:
        if not re.fullmatch(r"[A-Za-z][A-Za-z'’()/-]*",part):continue
        variants=part.split('/')
        for v in variants:
            if '(' in v:forms.extend([re.sub(r'\([^)]*\)','',v),v.replace('(','').replace(')','')])
            else:forms.append(v)
    rows.append(dict(id='cet-row-'+str(len(rows)+1),line=i+1+line_offset,original=line,head=head,level='CET-6' if six else 'CET-4',forms=forms))
index={}
for l in dictionary:index.setdefault(l['lemma'].lower(),[]).append(l)
for row in rows:
    row['mappings']=[]
    for f in row['forms']:
        found=index.get(f.lower(),[])
        row['mappings'].append(dict(form=f,lexemeIds=[x['id'] for x in found],status='matched-candidate' if found else 'missing'))
        for l in found:
            # A form can occur in more than one original row; foundation wins only for level filtering.
            if l.get('cet')!='CET-4':l['cet']=row['level']
write=lambda name,obj:(out/'data'/name).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
write('dictionary.json',dictionary);write('cet-coverage.json',rows)
manifest={'version':'0.9.0-data.20261107','status':'开发候选版 · 正式发布门槛未通过','headwords':len(dictionary),'sources':[{'id':'freedict-eng-zho-2025.11.23','name':'FreeDict + WikDict / Karl Bartel / Wiktionary contributors / DBnary','version':'2025.11.23','url':'https://download.freedict.org/dictionaries/eng-zho/2025.11.23/freedict-eng-zho-2025.11.23.src.tar.xz','license':'CC BY-SA 3.0 Unported'},{'id':'contextflow-original','name':'ContextFlow 原创学习内容与模型修订义项（非人工精校）','version':'0.9.0','url':'','license':'CC BY-SA 3.0 Unported'},{'id':'cet2016','name':'全国大学英语四、六级考试大纲 2016 年修订版（覆盖依据，非词典释义）','version':'2016','url':'https://cet.neea.edu.cn/res/Home/1704/55b02330ac17274664f06d9d3db8249d.pdf','license':'原发布方权利；仅词目映射及出处'}], 'coverage':{'cetOfficialRows':5418,'cetExtractedRows':len(rows),'cetMappedRows':sum(all(m['lexemeIds'] for m in row['mappings']) for row in rows),'cetMissingForms':sum(not m['lexemeIds'] for row in rows for m in row['mappings']),'ieltsValidated':0,'independentLexemeReview':0,'independentContextReview':0,'recommendationAccuracyMeasured':False},'sha512Source':expected,'modifications':'TEI 按原义项保留英汉对应；标准化字段、稳定内容哈希 ID；IPA 保留原有未注明地区状态；CET 为自动提取候选映射。'}
write('manifest.json',manifest)
print(json.dumps({'dictionary':len(dictionary),'senses':sum(len(x['senses']) for x in dictionary),'coverage':manifest['coverage']},ensure_ascii=False))
