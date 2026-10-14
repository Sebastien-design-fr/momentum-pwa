from pathlib import Path
import plistlib, uuid, json

ROOT=Path(__file__).resolve().parent
DRAFT=ROOT/'draft'
DRAFT.mkdir(exist_ok=True)
actions=[]
def uid(): return str(uuid.uuid4()).upper()
def action(kind, **params):
    ident=params.setdefault('UUID',uid())
    actions.append({'WFWorkflowActionIdentifier':'is.workflow.actions.'+kind,'WFWorkflowActionParameters':params})
    return {'Type':'ActionOutput','OutputUUID':ident,'OutputName':params.get('CustomOutputName',kind)}
def ref(value): return {'Value':value,'WFSerializationType':'WFTextTokenAttachment'}
def text(value, prefix=''):
    return {'Value':{'string':prefix+'\ufffc','attachmentsByRange':{'{%d, 1}'%len(prefix):value}},'WFSerializationType':'WFTextTokenString'}
def var(name): return {'Type':'Variable','VariableName':name}
def named(name, value):
    action('setvariable',WFVariableName=name,WFInput=ref(value))
    return var(name)
def cond(value, code, literal=None):
    group=uid(); p={'GroupingIdentifier':group,'WFControlFlowMode':0,'WFCondition':code,'WFInput':{'Type':'Variable','Variable':ref(value)}}
    if literal is not None: p['WFConditionalActionString']=str(literal)
    action('conditional',**p);return group
def end(group): action('conditional',GroupingIdentifier=group,WFControlFlowMode=2)
def stop(message):
    result=action('gettext',WFTextActionText=message)
    action('output',WFOutput=text(result),WFNoOutputSurfaceBehavior='DoNothing')
def guard(value,message):
    g=cond(value,101);stop(message);end(g)
def field(key):
    return action('getvalueforkey',WFDictionaryKey=key,WFInput=ref(data),CustomOutputName=key)

action('comment',WFCommentActionText='MOMENTUM Bridge : reçoit le JSON de MOMENTUM et crée un événement avec son vrai titre, ses dates et son alerte. Aucun événement si les champs obligatoires manquent. Une seconde exécution du même identifiant et créneau doit retrouver l’événement existant. Les autorisations Apple sont nécessaires au premier lancement.')
inp={'Type':'ExtensionInput'}
guard(inp,'Aucune tâche reçue. Lance ce raccourci depuis la validation dans MOMENTUM.')
data=action('detect.dictionary',WFInput=ref(inp),CustomOutputName='Demande MOMENTUM')
fields={k:field(k) for k in ['title','id','start','end','alert']}
for key in ['title','id','start','end']:
    guard(fields[key],'Demande incomplète : '+key+' manquant. Aucun événement créé.')
title=named('Titre MOMENTUM',action('gettext',WFTextActionText=text(fields['title'])))
alert=named('Alerte MOMENTUM',action('gettext',WFTextActionText=text(fields['alert'])))
notes=named('Identifiant MOMENTUM',action('gettext',WFTextActionText=text(fields['id'],'Momentum-ID: ')))
# Legacy V0.8 local dates remain accepted; ISO values take precedence when present.
datevars={}
for key in ['start','end']:
    iso=field(key+'ISO')
    chosen=named(key,fields[key])
    g=cond(iso,100);named(key,iso);end(g)
    parsed=action('detect.date',WFInput=ref(chosen),CustomOutputName='Date '+key)
    guard(parsed,'Date illisible : '+key+'. Aucun événement créé.')
    datevars[key]=named('Date '+key,parsed)
action('comment',WFCommentActionText='Recherche du marqueur exact dans les notes, à la date de début. Ne déduplique pas par titre : deux tâches différentes peuvent avoir le même nom.')
found=action('filter.calendarevents',WFContentItemFilter={'Value':{'WFActionParameterFilterPrefix':1,'WFContentPredicateBoundedDate':False,'WFActionParameterFilterTemplates':[
    {'Property':'Start Date','Operator':4,'Removable':True,'Values':{'Date':ref(datevars['start'])}},
    {'Property':'Notes','Operator':4,'Removable':True,'Values':{'String':text(notes)}}
]},'WFSerializationType':'WFContentPredicateTableTemplate'},WFContentItemLimitEnabled=False,CustomOutputName='Événements existants')
g=cond(found,100);stop('Déjà présent dans Calendrier. Aucun doublon créé.');end(g)
for minutes,label in [(0,'At time of event'),(15,'15 minutes before'),(30,'30 minutes before'),(60,'1 hour before'),(1440,'1 day before')]:
    g=cond(alert,4,minutes)
    event=action('addnewevent',WFCalendarItemTitle=text(title),WFCalendarItemStartDate=text(datevars['start']),WFCalendarItemEndDate=text(datevars['end']),WFCalendarItemNotes=text(notes),WFCalendarItemAllDay=False,WFCalendarItemDates=True,WFAlertTime=label,ShowWhenRun=False,CustomOutputName='Événement MOMENTUM')
    guard(event,'Apple n’a pas retourné d’événement. Vérifie les autorisations Calendrier.')
    stop(text(title,'Créé dans Calendrier : '))
    end(g)
stop('Alerte non prise en charge. Valeurs acceptées : 0, 15, 30, 60 ou 1440 minutes. Aucun événement créé.')
workflow={'WFWorkflowMinimumClientVersion':900,'WFWorkflowMinimumClientVersionString':'900','WFWorkflowClientVersion':'3612.0.2.3','WFWorkflowName':'MOMENTUM Bridge','WFWorkflowIcon':{'WFWorkflowIconStartColor':-12365313,'WFWorkflowIconGlyphNumber':61440},'WFWorkflowActions':actions,'WFWorkflowInputContentItemClasses':['WFStringContentItem'],'WFWorkflowOutputContentItemClasses':['WFStringContentItem'],'WFWorkflowTypes':[],'WFWorkflowImportQuestions':[],'WFQuickActionSurfaces':[],'WFWorkflowHasShortcutInputVariables':True,'WFWorkflowHasOutputFallback':False}
path=DRAFT/'MOMENTUM Bridge.shortcut'
path.write_bytes(plistlib.dumps(workflow,fmt=plistlib.FMT_BINARY))
(DRAFT/'MOMENTUM Bridge.plist').write_bytes(plistlib.dumps(workflow))
print('Generated',len(actions),'actions:',path)
