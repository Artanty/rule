import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Rule, createDefaultRule } from '../models/rule.model';

@Injectable({
    providedIn: 'root'
})
export class RuleStoreService {
    private rulesSubject = new BehaviorSubject<Rule[]>([]);
    public rules$: Observable<Rule[]> = this.rulesSubject.asObservable();
    
    private triggerMappingsSubject = new BehaviorSubject<any[]>([]);
    public triggerMappings$ = this.triggerMappingsSubject.asObservable();
    
    private uiSettingsSubject = new BehaviorSubject<{ showDelayInput: boolean; wideRuleNames: boolean }>({
        showDelayInput: false,
        wideRuleNames: false
    });
    public uiSettings$ = this.uiSettingsSubject.asObservable();
    
    constructor() {}
    
    // Get current snapshot
    getRules(): Rule[] {
        return this.rulesSubject.value;
    }
    
    getTriggerMappings(): any[] {
        return this.triggerMappingsSubject.value;
    }
    
    // Update methods
    setRules(rules: Rule[]) {
        this.rulesSubject.next([...rules]);
    }
    
    setTriggerMappings(mappings: any[]) {
        this.triggerMappingsSubject.next(mappings);
    }
    
    setUiSettings(settings: { showDelayInput: boolean; wideRuleNames: boolean }) {
        this.uiSettingsSubject.next(settings);
    }
    
    // Rule CRUD operations
    addRule() {
        const current = this.getRules();
        this.setRules([...current, createDefaultRule()]);
    }
    
    addCustomRule() {
        const newRule = createDefaultRule();
        newRule.type = 'custom';
        newRule.name = "Custom Rule";
        newRule.customCode = '# Write your custom StreamByter code here\n# Example:\n# IF M0 == B0 07\n#   SND M0 M1 7F\n# END';
        const current = this.getRules();
        this.setRules([...current, newRule]);
    }
    
    updateRule(index: number, changes: Partial<Rule>) {
        const current = this.getRules();
        current[index] = { ...current[index], ...changes };
        this.setRules(current);
    }
    
    updateRuleField<K extends keyof Rule>(index: number, field: K, value: Rule[K]) {
        const current = this.getRules();
        current[index] = { ...current[index], [field]: value };
        this.setRules(current);
    }
    
    updateTriggerField(index: number, field: string, value: any) {
        const current = this.getRules();
        current[index].trigger = { ...current[index].trigger, [field]: value };
        this.setRules(current);
    }
    
    updateOutputField(index: number, field: string, value: any) {
        const current = this.getRules();
        current[index].output = { ...current[index].output, [field]: value };
        this.setRules(current);
    }
    
    updateTriggerSource(index: number, value: string, triggerMappings: any[]) {
        const current = this.getRules();
        if (value.startsWith('mapping:')) {
            const mappingName = value.substring('mapping:'.length);
            const mapping = triggerMappings.find(m => m.name === mappingName);
            if (mapping) {
                current[index].triggerSource = {
                    type: 'mapping',
                    value: mappingName,
                    mappingName: mappingName
                };
                current[index].trigger.channel = mapping.triggerMidiChannel;
            }
        } else if (value.startsWith('device:')) {
            const channel = parseInt(value.substring('device:'.length), 10);
            current[index].triggerSource = { type: 'device', value: channel };
            current[index].trigger.channel = channel;
        } else if (value.startsWith('channel:')) {
            const channel = parseInt(value.substring('channel:'.length), 10);
            current[index].triggerSource = { type: 'channel', value: channel };
            current[index].trigger.channel = channel;
        }
        this.setRules(current);
    }
    
    updateConsumerSource(index: number, value: string, consumerMappings: any[]) {
        const current = this.getRules();
        if (value.startsWith('mapping:')) {
            const mappingName = value.substring('mapping:'.length);
            const mapping = consumerMappings.find(m => m.name === mappingName);
            if (mapping) {
                current[index].consumerSource = {
                    type: 'mapping',
                    value: mappingName,
                    mappingName: mappingName
                };
                current[index].output.channel = mapping.triggerMidiChannel;
                current[index].showMappingSelector = true;
            }
        } else if (value.startsWith('device:')) {
            const channel = parseInt(value.substring('device:'.length), 10);
            current[index].consumerSource = { type: 'device', value: channel };
            current[index].output.channel = channel;
            current[index].showMappingSelector = false;
        } else if (value.startsWith('channel:')) {
            const channel = parseInt(value.substring('channel:'.length), 10);
            current[index].consumerSource = { type: 'channel', value: channel };
            current[index].output.channel = channel;
            current[index].showMappingSelector = false;
        }
        this.setRules(current);
    }
    
    deleteRule(index: number) {
        const current = this.getRules();
        current.splice(index, 1);
        this.setRules(current);
    }
    
    duplicateRule(index: number) {
        const current = this.getRules();
        const copy = JSON.parse(JSON.stringify(current[index]));
        copy.name = `${copy.name} (copy)`;
        copy.selected = false;
        copy.collapsed = true;
        current.splice(index + 1, 0, copy);
        this.setRules(current);
    }
    
    generateNameForRule(index: number, nameGenerator: any) {
        const current = this.getRules();
        const newName = nameGenerator.generateName(current[index]);
        current[index].name = newName;
        this.setRules(current);
    }
    
    generateNamesForSelected(nameGenerator: any) {
        const current = this.getRules();
        for (let i = 0; i < current.length; i++) {
            if (current[i].type === 'standard' && current[i].selected) {
                current[i].name = nameGenerator.generateName(current[i]);
            }
        }
        this.setRules(current);
    }
    
    selectAllRules() {
        const current = this.getRules();
        current.forEach(rule => {
            if (rule.type === 'standard') rule.selected = true;
        });
        this.setRules(current);
    }
    
    selectRegularRules() {
        const current = this.getRules();
        current.forEach(rule => {
            rule.selected = rule.type === 'standard';
        });
        this.setRules(current);
    }
    
    selectNoneRules() {
        const current = this.getRules();
        current.forEach(rule => rule.selected = false);
        this.setRules(current);
    }
    
    toggleCustomCollapse(index: number) {
        const current = this.getRules();
        current[index].collapsed = !current[index].collapsed;
        this.setRules(current);
    }
    
    clearRules() {
        this.setRules([]);
    }
    
    loadRules(rules: Rule[]) {
        this.setRules(rules);
    }
    getSelectedRulesCount(): number {
        return this.getRules().filter(r => r.type === 'standard' && r.selected).length;
    }    
}