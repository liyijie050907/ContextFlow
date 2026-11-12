"""Retain structured translation annotations bound to actual English occurrences."""
import json,re,pathlib,hashlib
p=pathlib.Path(__file__).resolve().parents[2]/'data';content=json.loads((p/'content.json').read_text(encoding='utf8'))
for article in content['articles']:
    article['occurrences']=[]
    for pi,para in enumerate(article['paragraphs']):
        for target in article['targets']:
            for m in re.finditer(r'\b'+re.escape(target['word'])+r'\b',para['en'],re.I):
                key=article['id']+'|'+para['en']+'|'+str(m.start())+'|'+target['senseId']
                article['occurrences'].append({'id':'occ-'+hashlib.sha256(key.encode()).hexdigest()[:20],'paragraph':pi,'start':m.start(),'end':m.end(),'form':m.group(),'senseId':target['senseId']})
        segments=[];last=0
        for m in re.finditer(r'（([a-z][a-z ]+)）',para['zh']):
            english=m.group(1);target=next((t for t in article['targets'] if t['word']==english),None)
            occurrence=next((o for o in article['occurrences'] if target and o['senseId']==target['senseId'] and o['paragraph']==pi),None)
            if not occurrence:continue
            segments.append({'zh':para['zh'][last:m.start()]});segments.append({'zh':'','english':english,'occurrenceId':occurrence['id']});last=m.end()
        segments.append({'zh':para['zh'][last:]});para['segments']=segments
(p/'content.json').write_text(json.dumps(content,ensure_ascii=False,separators=(',',':')),encoding='utf8')
sample=content['articles'][0];(p/'sample-learning-bundle.json').write_text(json.dumps({'format':'ContextFlowLearningBundle','version':1,'articles':[sample],'questions':[q for q in content['questions'] if q['id'] in sample['questionIds']]},ensure_ascii=False,indent=2),encoding='utf8')
