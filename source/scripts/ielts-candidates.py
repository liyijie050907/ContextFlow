"""A transparent *candidate* collection from open lexical text, not a validated IELTS list.
Theme signals are retained per lexeme. No frequency or official-exam claim is made.
"""
import json,re,pathlib
p=pathlib.Path(__file__).resolve().parents[2]/'data'
dictionary=json.loads((p/'dictionary.json').read_text(encoding='utf8'))
themes={
'教育':['education','school','student','teach','learning','university'],
'校园':['campus','college','library','classroom','academic'],
'科技':['computer','technology','machine','digital','electronic','scientific','software'],
'环境':['environment','ecology','climate','pollution','energy','water','soil','forest'],
'社会':['society','social','community','government','citizen','rights','political'],
'经济':['economy','economic','money','business','trade','finance','market','cost'],
'职场':['work','employment','employee','profession','office','job','industry'],
'健康':['health','disease','medical','body','exercise','food','nutrition'],
'旅行':['travel','journey','transport','tourist','vehicle','road','train'],
'文化':['culture','music','art','history','language','tradition','literature'],
'城市':['city','town','urban','building','housing','street','infrastructure'],
'日常生活':['home','house','family','daily','clothing','cooking','household']}
candidates=[]
for l in dictionary:
    if not re.fullmatch('[a-z][a-z-]{2,18}',l['lemma']):continue
    if not any(s['pos'] in ['n','v','adj','adv'] for s in l['senses']):continue
    defs=' '.join(s['en'] for s in l['senses'])
    if re.search(r'\b(archaic|obsolete|vulgar|taxonomic|genus|surname)\b',defs,re.I):continue
    signals={t:[w for w in ws if re.search(r'\b'+w+r'\b',defs,re.I)] for t,ws in themes.items()}
    signals={t:ws for t,ws in signals.items() if ws}
    original=any(s['source']=='contextflow-original' for s in l['senses'])
    if not signals and not original:continue
    score=sum(len(v) for v in signals.values())+100*original
    candidates.append((score,l,signals,original))
candidates.sort(key=lambda x:(-x[0],len(x[1]['lemma']),x[1]['lemma']))
selected=[];seen=set()
for score,l,signals,original in candidates:
    if l['lemma'] in seen:continue
    seen.add(l['lemma']);l['ielts']='ContextFlow 雅思主题候选 · 非官方 · 未精校'
    selected.append({'lexemeId':l['id'],'lemma':l['lemma'],'themes':list(signals) or ['原创教学选词'],'evidence':signals,'basis':'FreeDict 开放许可英文释义的主题关键词匹配'+('；兼为原创教学目标词' if original else ''),'status':'自动选词候选；未做语料频率或考试适配审阅'})
    if len(selected)==2000:break
(p/'ielts-candidates.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf8')
(p/'dictionary.json').write_text(json.dumps(dictionary,ensure_ascii=False,separators=(',',':')),encoding='utf8')
manifest=json.loads((p/'manifest.json').read_text(encoding='utf8'));manifest['coverage']['ieltsCandidates']=len(selected);manifest['coverage']['ieltsValidated']=0
(p/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('IELTS theme candidates:',len(selected),'validated:',0)
