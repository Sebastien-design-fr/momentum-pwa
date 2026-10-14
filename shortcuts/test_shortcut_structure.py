import plistlib, unittest
from pathlib import Path

class BridgeStructure(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow=plistlib.loads((Path(__file__).parent/'draft'/'MOMENTUM Bridge.shortcut').read_bytes())
        cls.actions=cls.workflow['WFWorkflowActions']

    def test_references_and_control_flow(self):
        seen=set(); groups=[]
        def walk(x):
            if isinstance(x,dict):
                if x.get('Type')=='ActionOutput': self.assertIn(x['OutputUUID'],seen)
                for value in x.values():walk(value)
            elif isinstance(x,list):
                for value in x:walk(value)
        for a in self.actions:
            p=a['WFWorkflowActionParameters']; walk(p)
            if a['WFWorkflowActionIdentifier'].endswith('.conditional'):
                mode=p['WFControlFlowMode']
                if mode==0:groups.append(p['GroupingIdentifier'])
                if mode==2:self.assertEqual(groups.pop(),p['GroupingIdentifier'])
            self.assertNotIn(p['UUID'],seen);seen.add(p['UUID'])
        self.assertFalse(groups)

    def test_calendar_fields_and_alerts(self):
        events=[a['WFWorkflowActionParameters'] for a in self.actions if a['WFWorkflowActionIdentifier'].endswith('.addnewevent')]
        self.assertEqual(len(events),5)
        self.assertEqual({x['WFAlertTime'] for x in events},{'At time of event','15 minutes before','30 minutes before','1 hour before','1 day before'})
        for event in events:
            self.assertIs(event['ShowWhenRun'],False)
            for key in ['WFCalendarItemTitle','WFCalendarItemStartDate','WFCalendarItemEndDate','WFCalendarItemNotes']:
                self.assertEqual(event[key]['WFSerializationType'],'WFTextTokenString')
                self.assertEqual(event[key]['Value']['string'],'\ufffc')
                self.assertTrue(event[key]['Value']['attachmentsByRange'])

    def test_no_network_or_script_actions(self):
        allowed={'comment','conditional','gettext','output','detect.dictionary','getvalueforkey','setvariable','detect.date','filter.calendarevents','addnewevent'}
        for a in self.actions:
            self.assertIn(a['WFWorkflowActionIdentifier'].removeprefix('is.workflow.actions.'),allowed)

    def test_deduplication_precedes_every_write(self):
        ids=[a['WFWorkflowActionIdentifier'] for a in self.actions]
        find=ids.index('is.workflow.actions.filter.calendarevents')
        self.assertLess(find,ids.index('is.workflow.actions.addnewevent'))
        predicates=self.actions[find]['WFWorkflowActionParameters']['WFContentItemFilter']['Value']['WFActionParameterFilterTemplates']
        self.assertEqual({p['Property'] for p in predicates},{'Start Date','Notes'})
        for p in predicates:
            self.assertIn('Values',p)
            self.assertNotIn('VariableOverrides',p)

    def test_alerts_use_exact_equality(self):
        branches=[a['WFWorkflowActionParameters'] for a in self.actions if a['WFWorkflowActionIdentifier'].endswith('.conditional') and 'WFConditionalActionString' in a['WFWorkflowActionParameters']]
        self.assertEqual(len(branches),5)
        self.assertEqual({p['WFCondition'] for p in branches},{4})

if __name__=='__main__':unittest.main()
