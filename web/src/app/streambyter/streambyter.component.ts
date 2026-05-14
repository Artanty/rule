import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, DeviceMapEntry, CcLibraryEntry, TriggerMapping } from '../services/storage.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

interface Rule {
    name: string;
    enabled: boolean;
    type: 'standard' | 'custom';
    customCode?: string;
    collapsed?: boolean;
    selected?: boolean;
    showMappingSelector?: boolean;
    selectedMappingRuleKey?: any;
    triggerSource: {
        type: 'mapping' | 'device' | 'channel';
        value: string | number;
        mappingName?: string;
    };
    consumerSource: {
        type: 'mapping' | 'device' | 'channel';
        value: string | number;
        mappingName?: string;
    };
    output: {
        type: 'cc' | 'program' | 'note';
        channel: number;
        ccNumber: number;
        valueMode: 'constant' | 'trigger';
        constantValue: number;
        program: number;
        note: number;
        velocity: number;
        velocityMode: 'constant' | 'trigger';
        delayMs: number;
        injectOutput?: boolean;
    };
    trigger: {
        type: 'noteOn' | 'controlChange';
        channel: number;
        noteMode: 'specific' | 'any';
        specificNote: number;
        ccNumber: number;
        valueMode: 'specific' | 'any' | 'range';
        specificValue: number;
        rangeMin: number;
        rangeMax: number;
        consume: 'eat' | 'pass';
        cloneTrigger?: boolean;
    };
}

@Component({
    selector: 'app-streambyter',
    templateUrl: './streambyter.component.html',
    styleUrls: ['./streambyter.component.scss'],
    standalone: false,
})
export class StreambyterComponent implements OnInit {
    rules: Rule[] = [];
    generatedScript: string = '';
    showGenerated: boolean = false;
    fileName: string = '';
    
    deviceMap: DeviceMapEntry[] = [];
    ccLibrary: { [channel: string]: CcLibraryEntry[] } = {};
    
    importFileInputId = 'importRulesInput';
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    showDelayInput: boolean = false;
    wideRuleNames: boolean = false;
    
    exampleRules: Rule[] = [
        {
            name: "CC to Note",
            enabled: true,
            type: 'standard',
            customCode: '',
            collapsed: true,
            selected: false,
            triggerSource: { type: 'device', value: 1 },
            consumerSource: { type: 'channel', value: 1 },
            output: {
                type: "note",
                channel: 1,
                ccNumber: 0,
                valueMode: "constant",
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 100,
                velocityMode: "constant",
                delayMs: 0,
                injectOutput: false
            },
            trigger: {
                type: "controlChange",
                channel: 1,
                noteMode: "specific",
                specificNote: 60,
                ccNumber: 7,
                valueMode: "any",
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: "eat",
                cloneTrigger: false
            }
        },
        {
            name: "Note Velocity Scale",
            enabled: true,
            type: 'standard',
            customCode: '',
            collapsed: true,
            selected: false,
            triggerSource: { type: 'channel', value: 2 },
            consumerSource: { type: 'channel', value: 2 },
            output: {
                type: "cc",
                channel: 2,
                ccNumber: 11,
                valueMode: "trigger",
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: "trigger",
                delayMs: 0,
                injectOutput: false
            },
            trigger: {
                type: "noteOn",
                channel: 2,
                noteMode: "any",
                specificNote: 60,
                ccNumber: 0,
                valueMode: "any",
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: "pass",
                cloneTrigger: false
            }
        }
    ];
    
    triggerMappings: TriggerMapping[] = [];
    openMappingsEditor: boolean = false;
    bulkMappingName: string | null = null;
    dragEnabled: boolean = true;
    
    constructor(
        private storageService: StorageService,
        private cdr: ChangeDetectorRef
    ) {}
    
    ngOnInit() {
        this.loadMidiMaps();
        this.loadTriggerMappings();
    }

    loadTriggerMappings() {
        this.triggerMappings = this.storageService.getTriggerMappings();
        this.cdr.detectChanges();
    }
    
    getTriggerMappingByName(name: string): TriggerMapping | undefined {
        return this.triggerMappings.find(m => m.name === name);
    }
    
    getTriggerSourceOptions(): { value: string; label: string; type: 'mapping' | 'device' | 'channel'; data: any }[] {
        const options: { value: string; label: string; type: 'mapping' | 'device' | 'channel'; data: any }[] = [];
        for (const mapping of this.triggerMappings) {
            options.push({ 
                value: `mapping:${mapping.name}`, 
                label: `📌 ${mapping.name} (Ch${mapping.triggerMidiChannel})`,
                type: 'mapping',
                data: mapping
            });
        }
        const deviceMap = this.storageService.getDeviceMap();
        for (const device of deviceMap) {
            options.push({
                value: `device:${device.midiChannel}`,
                label: `🎛️ ${device.device} (Ch${device.midiChannel})`,
                type: 'device',
                data: device.midiChannel
            });
        }
        for (const ch of this.channels) {
            options.push({
                value: `channel:${ch}`,
                label: `🎹 Channel ${ch}`,
                type: 'channel',
                data: ch
            });
        }
        return options;
    }
    
    getConsumerSourceOptions(): { value: string; label: string; type: 'mapping' | 'device' | 'channel'; data: any }[] {
        const options: { value: string; label: string; type: 'mapping' | 'device' | 'channel'; data: any }[] = [];
        const consumerMappings = this.storageService.getConsumerMappings();
        for (const mapping of consumerMappings) {
            options.push({ 
                value: `mapping:${mapping.name}`, 
                label: `📌 ${mapping.name} (Ch${mapping.triggerMidiChannel})`,
                type: 'mapping',
                data: mapping
            });
        }
        const deviceMap = this.storageService.getDeviceMap();
        for (const device of deviceMap) {
            options.push({
                value: `device:${device.midiChannel}`,
                label: `🎛️ ${device.device} (Ch${device.midiChannel})`,
                type: 'device',
                data: device.midiChannel
            });
        }
        for (const ch of this.channels) {
            options.push({
                value: `channel:${ch}`,
                label: `🎹 Channel ${ch}`,
                type: 'channel',
                data: ch
            });
        }
        return options;
    }
    
    onTriggerSourceChange(rule: Rule, selectedValue: string) {
        const currentCCValue = rule.trigger.ccNumber;
        const currentNoteValue = rule.trigger.specificNote;
    
        if (selectedValue.startsWith('mapping:')) {
            const mappingName = selectedValue.substring('mapping:'.length);
            const mapping = this.getTriggerMappingByName(mappingName);
            if (mapping) {
                rule.triggerSource = {
                    type: 'mapping',
                    value: mappingName,
                    mappingName: mappingName
                };
                rule.trigger.channel = mapping.triggerMidiChannel;
            
                if (rule.trigger.type === 'controlChange') {
                    const ccRules = mapping.rules.filter(r => r.type === 'cc');
                    const valueExists = ccRules.some(r => r.value === currentCCValue);
                    if (valueExists) {
                        rule.trigger.ccNumber = currentCCValue;
                    } else if (ccRules.length > 0) {
                        rule.trigger.ccNumber = ccRules[0].value;
                    }
                } else if (rule.trigger.type === 'noteOn') {
                    const noteRules = mapping.rules.filter(r => r.type === 'note');
                    const valueExists = noteRules.some(r => r.value === currentNoteValue);
                    if (valueExists) {
                        rule.trigger.specificNote = currentNoteValue;
                    } else if (noteRules.length > 0) {
                        rule.trigger.specificNote = noteRules[0].value;
                    }
                }
            }
        } else if (selectedValue.startsWith('device:')) {
            const channel = parseInt(selectedValue.substring('device:'.length), 10);
            rule.triggerSource = { type: 'device', value: channel };
            rule.trigger.channel = channel;
        } else if (selectedValue.startsWith('channel:')) {
            const channel = parseInt(selectedValue.substring('channel:'.length), 10);
            rule.triggerSource = { type: 'channel', value: channel };
            rule.trigger.channel = channel;
        }
        this.cdr.detectChanges();
    }
    
    onConsumerSourceChange(rule: Rule, selectedValue: string) {
        if (selectedValue.startsWith('mapping:')) {
            const mappingName = selectedValue.substring('mapping:'.length);
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === mappingName);
            if (mapping) {
                rule.consumerSource = {
                    type: 'mapping',
                    value: mappingName,
                    mappingName: mappingName
                };
                rule.output.channel = mapping.triggerMidiChannel;
                rule.showMappingSelector = true;
                
                // Try to find a matching rule based on current output values
                let matchedRule = null;
                const currentOutputType = rule.output.type;
                const currentCcNumber = rule.output.ccNumber;
                const currentNoteNumber = rule.output.note;
                const currentProgramNumber = rule.output.program;
                const currentConstantValue = rule.output.constantValue;
                const currentValueMode = rule.output.valueMode;
                
                if (currentOutputType === 'cc') {
                    // First try to match by CC number AND constant value
                    matchedRule = mapping.rules.find(r => 
                        r.type === 'cc' && 
                        r.value === currentCcNumber &&
                        (currentValueMode === 'constant' ? r.dataValue === currentConstantValue : true)
                    );
                    // If not found, try by CC number only
                    if (!matchedRule) {
                        matchedRule = mapping.rules.find(r => r.type === 'cc' && r.value === currentCcNumber);
                    }
                } else if (currentOutputType === 'note') {
                    matchedRule = mapping.rules.find(r => 
                        r.type === 'note' && 
                        r.value === currentNoteNumber &&
                        (rule.output.velocityMode === 'constant' ? r.dataValue === rule.output.velocity : true)
                    );
                    if (!matchedRule) {
                        matchedRule = mapping.rules.find(r => r.type === 'note' && r.value === currentNoteNumber);
                    }
                } else if (currentOutputType === 'program') {
                    matchedRule = mapping.rules.find(r => r.type === 'program' && r.value === currentProgramNumber);
                }
                
                if (matchedRule) {
                    // Apply the matched rule's values
                    if (matchedRule.type === 'cc') {
                        rule.output.type = 'cc';
                        rule.output.ccNumber = matchedRule.value;
                        if (matchedRule.dataValue !== undefined) {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = matchedRule.dataValue;
                        } else {
                            rule.output.valueMode = currentValueMode;
                            rule.output.constantValue = currentConstantValue;
                        }
                    } else if (matchedRule.type === 'note') {
                        rule.output.type = 'note';
                        rule.output.note = matchedRule.value;
                        if (matchedRule.dataValue !== undefined) {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = matchedRule.dataValue;
                        } else {
                            rule.output.velocityMode = rule.output.velocityMode;
                            rule.output.velocity = rule.output.velocity;
                        }
                    } else if (matchedRule.type === 'program') {
                        rule.output.type = 'program';
                        rule.output.program = matchedRule.value;
                    }
                    // Set the selected key using composite key format
                    (rule as any).selectedMappingRuleKey = `${matchedRule.type}_${matchedRule.value}_${matchedRule.dataValue !== undefined ? matchedRule.dataValue : 'null'}`;
                } else {
                    (rule as any).selectedMappingRuleKey = undefined;
                }
            }
        } else if (selectedValue.startsWith('device:')) {
            const channel = parseInt(selectedValue.substring('device:'.length), 10);
            rule.showMappingSelector = false;
            (rule as any).selectedMappingRuleKey = undefined;
            rule.consumerSource = {
                type: 'device',
                value: channel,
                mappingName: undefined
            };
            rule.output.channel = channel;
            // Reset output type to default CC
            if (rule.output.type !== 'cc') {
                rule.output.type = 'cc';
                rule.output.ccNumber = 0;
                rule.output.valueMode = 'constant';
                rule.output.constantValue = 0;
            }
        } else if (selectedValue.startsWith('channel:')) {
            const channel = parseInt(selectedValue.substring('channel:'.length), 10);
            rule.showMappingSelector = false;
            (rule as any).selectedMappingRuleKey = undefined;
            rule.consumerSource = {
                type: 'channel',
                value: channel,
                mappingName: undefined
            };
            rule.output.channel = channel;
            // Reset output type to default CC
            if (rule.output.type !== 'cc') {
                rule.output.type = 'cc';
                rule.output.ccNumber = 0;
                rule.output.valueMode = 'constant';
                rule.output.constantValue = 0;
            }
        }
        this.cdr.detectChanges();
    }

    getMappingRuleOptions(rule: Rule): { value: string; label: string; ruleData: any }[] {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping && mapping.rules) {
                return mapping.rules.map(r => {
                    let label = `${r.name}`;
                    if (r.type === 'cc') {
                        label += ` (CC ${r.value})`;
                        if (r.dataValue !== undefined) {
                            label += ` → send ${r.dataValue}`;
                        }
                    } else if (r.type === 'note') {
                        label += ` (Note ${r.value})`;
                        if (r.dataValue !== undefined) {
                            label += ` → velocity ${r.dataValue}`;
                        }
                    } else if (r.type === 'program') {
                        label += ` (Program ${r.value})`;
                    }
                    const key = `${r.type}_${r.value}_${r.dataValue !== undefined ? r.dataValue : 'null'}`;
                    return { value: key, label: label, ruleData: r };
                });
            }
        }
        return [];
    }

    onMappingRuleSelected(rule: Rule, selectedValue: string) {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                const [type, valueStr, dataValueStr] = selectedValue.split('_');
                const value = parseInt(valueStr, 10);
                const dataValue = dataValueStr !== 'null' ? parseInt(dataValueStr, 10) : undefined;
            
                const selectedRule = mapping.rules.find(r => 
                    r.type === type && 
                    r.value === value && 
                    (dataValue !== undefined ? r.dataValue === dataValue : true)
                );
            
                if (selectedRule) {
                    if (selectedRule.type === 'cc') {
                        rule.output.type = 'cc';
                        rule.output.ccNumber = selectedRule.value;
                        if (selectedRule.dataValue !== undefined) {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = selectedRule.dataValue;
                        } else {
                            rule.output.valueMode = 'trigger';
                            rule.output.constantValue = 0;
                        }
                    } else if (selectedRule.type === 'note') {
                        rule.output.type = 'note';
                        rule.output.note = selectedRule.value;
                        if (selectedRule.dataValue !== undefined) {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = selectedRule.dataValue;
                        } else {
                            rule.output.velocityMode = 'trigger';
                            rule.output.velocity = 64;
                        }
                    } else if (selectedRule.type === 'program') {
                        rule.output.type = 'program';
                        rule.output.program = selectedRule.value;
                    }
                    (rule as any).selectedMappingRuleKey = selectedValue;
                }
            }
        }
        this.cdr.detectChanges();
    }

    getCurrentTriggerSourceValue(rule: Rule): string {
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            return `mapping:${rule.triggerSource.mappingName}`;
        } else if (rule.triggerSource.type === 'device') {
            return `device:${rule.triggerSource.value}`;
        } else if (rule.triggerSource.type === 'channel') {
            return `channel:${rule.triggerSource.value}`;
        }
        return `channel:${rule.trigger.channel}`;
    }
    
    getCurrentConsumerSourceValue(rule: Rule): string {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            return `mapping:${rule.consumerSource.mappingName}`;
        } else if (rule.consumerSource.type === 'device') {
            return `device:${rule.consumerSource.value}`;
        } else if (rule.consumerSource.type === 'channel') {
            return `channel:${rule.consumerSource.value}`;
        }
        return `channel:${rule.output.channel}`;
    }
    
    getEffectiveTriggerName(rule: Rule): string {
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            return rule.triggerSource.mappingName;
        } else if (rule.triggerSource.type === 'device') {
            const deviceName = this.getDeviceName(rule.trigger.channel);
            return deviceName !== `ch${rule.trigger.channel}` ? deviceName : `Device ${rule.trigger.channel}`;
        } else if (rule.triggerSource.type === 'channel') {
            return `Channel ${rule.trigger.channel}`;
        }
        return `Channel ${rule.trigger.channel}`;
    }
    
    getEffectiveConsumerName(rule: Rule): string {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            return rule.consumerSource.mappingName;
        } else if (rule.consumerSource.type === 'device') {
            const deviceName = this.getDeviceName(rule.output.channel);
            return deviceName !== `ch${rule.output.channel}` ? deviceName : `Device ${rule.output.channel}`;
        } else if (rule.consumerSource.type === 'channel') {
            return `Channel ${rule.output.channel}`;
        }
        return `Channel ${rule.output.channel}`;
    }
    
    getCcOptionsFromMapping(mapping: TriggerMapping, currentValue?: number): { value: number; label: string }[] {
        const ccRules = mapping.rules.filter(r => r.type === 'cc');
        if (ccRules.length === 0) {
            return [{ value: 0, label: 'No CC rules in mapping' }];
        }
        return ccRules.map(rule => ({
            value: rule.value,
            label: `${rule.name} (${rule.value})`
        }));
    }
    
    getNoteOptionsFromMapping(mapping: TriggerMapping, currentValue?: number): { value: number; label: string }[] {
        const noteRules = mapping.rules.filter(r => r.type === 'note');
        if (noteRules.length === 0) {
            return [{ value: 60, label: 'No note rules in mapping' }];
        }
        return noteRules.map(rule => ({
            value: rule.value,
            label: `${rule.name} (${rule.value})`
        }));
    }
    
    getConsumerCcOptionsFromMapping(mapping: TriggerMapping, currentValue?: number): { value: number; label: string; dataValue?: number }[] {
        const ccRules = mapping.rules.filter(r => r.type === 'cc');
        if (ccRules.length === 0) {
            return [{ value: 0, label: 'No CC rules in mapping', dataValue: 0 }];
        }
        return ccRules.map(rule => ({
            value: rule.value,
            label: `${rule.name} (${rule.value})`,
            dataValue: rule.dataValue
        }));
    }

    getConsumerNoteOptionsFromMapping(mapping: TriggerMapping, currentValue?: number): { value: number; label: string }[] {
        const noteRules = mapping.rules.filter(r => r.type === 'note');
        if (noteRules.length === 0) {
            return [{ value: 60, label: 'No note rules in mapping' }];
        }
        return noteRules.map(rule => ({
            value: rule.value,
            label: `${rule.name} (${rule.value})`
        }));
    }
    
    getConsumerProgramOptionsFromMapping(mapping: TriggerMapping): { value: number; label: string; dataValue?: number }[] {
        const programRules = mapping.rules.filter(r => r.type === 'program');
        if (programRules.length === 0) {
            return [{ value: 0, label: 'No program rules in mapping', dataValue: 0 }];
        }
        return programRules.map(rule => ({
            value: rule.value,
            label: `${rule.name} (${rule.value})`,
            dataValue: rule.dataValue
        }));
    }
    
    selectAllRules() {
        this.rules.forEach(rule => {
            if (rule.type === 'standard') {
                rule.selected = true;
            }
        });
        this.cdr.detectChanges();
    }
    
    selectRegularRules() {
        this.rules.forEach(rule => {
            if (rule.type === 'standard') {
                rule.selected = true;
            } else {
                rule.selected = false;
            }
        });
        this.cdr.detectChanges();
    }
    
    selectNoneRules() {
        this.rules.forEach(rule => {
            rule.selected = false;
        });
        this.cdr.detectChanges();
    }
    
    getSelectedRulesCount(): number {
        return this.rules.filter(r => r.type === 'standard' && r.selected).length;
    }
    
    generateNamesForSelectedRules() {
        const selectedRules = this.rules.filter(r => r.type === 'standard' && r.selected);
        if (selectedRules.length === 0) {
            return;
        }
        for (let i = 0; i < this.rules.length; i++) {
            const rule = this.rules[i];
            if (rule.type === 'standard' && rule.selected) {
                this.generateNameForRule(i);
            }
        }
        this.cdr.detectChanges();
    }
    
    applyBulkMapping() {
        if (!this.bulkMappingName) {
            return;
        }
        const selectedRules = this.rules.filter(r => r.type === 'standard' && r.selected);
        if (selectedRules.length === 0) {
            return;
        }
        const mapping = this.getTriggerMappingByName(this.bulkMappingName);
        if (!mapping) {
            return;
        }
        for (const rule of selectedRules) {
            const currentCCValue = rule.trigger.ccNumber;
            const currentNoteValue = rule.trigger.specificNote;
            rule.triggerSource = {
                type: 'mapping',
                value: mapping.name,
                mappingName: mapping.name
            };
            rule.trigger.channel = mapping.triggerMidiChannel;
            if (rule.trigger.type === 'controlChange') {
                const ccRules = mapping.rules.filter(r => r.type === 'cc');
                const valueExists = ccRules.some(r => r.value === currentCCValue);
                if (valueExists) {
                    rule.trigger.ccNumber = currentCCValue;
                } else if (ccRules.length > 0) {
                    rule.trigger.ccNumber = ccRules[0].value;
                }
            } else if (rule.trigger.type === 'noteOn') {
                const noteRules = mapping.rules.filter(r => r.type === 'note');
                const valueExists = noteRules.some(r => r.value === currentNoteValue);
                if (valueExists) {
                    rule.trigger.specificNote = currentNoteValue;
                } else if (noteRules.length > 0) {
                    rule.trigger.specificNote = noteRules[0].value;
                }
            }
        }
        this.cdr.detectChanges();
    }
    
    loadMidiMaps() {
        this.deviceMap = this.storageService.getDeviceMap();
        this.ccLibrary = this.storageService.getCcLibrary();
    }
    
    getDeviceName(channel: number): string {
        return this.storageService.getDeviceName(channel);
    }
    
    getParamName(channel: number, type: 'cc' | 'note', value: number): string {
        return this.storageService.getParamName(channel, type, value);
    }
    
    getCcOptions(channel: number, currentValue?: number, rule?: Rule): { value: number; label: string }[] {
        if (rule && rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            const mapping = this.getTriggerMappingByName(rule.triggerSource.mappingName);
            if (mapping) {
                return this.getCcOptionsFromMapping(mapping, currentValue);
            }
        }
        const chStr = String(channel);
        let entries: CcLibraryEntry[] = [];
        if (this.ccLibrary[chStr]) {
            entries = this.ccLibrary[chStr].filter(e => e.type === 'cc');
        }
        if (entries.length === 0) {
            for (let i = 0; i <= 127; i++) {
                entries.push({ name: `CC#${i}`, value: i, type: 'cc' });
            }
        }
        return entries.map(e => ({
            value: e.value,
            label: `${e.name} (${e.value})`
        }));
    }
    
    getNoteOptions(channel: number, currentValue?: number, rule?: Rule): { value: number; label: string }[] {
        if (rule && rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            const mapping = this.getTriggerMappingByName(rule.triggerSource.mappingName);
            if (mapping) {
                return this.getNoteOptionsFromMapping(mapping, currentValue);
            }
        }
        const chStr = String(channel);
        let entries: CcLibraryEntry[] = [];
        if (this.ccLibrary[chStr]) {
            entries = this.ccLibrary[chStr].filter(e => e.type === 'note');
        }
        if (entries.length === 0) {
            for (let i = 0; i <= 127; i++) {
                entries.push({ name: `Note#${i}`, value: i, type: 'note' });
            }
        }
        return entries.map(e => ({
            value: e.value,
            label: `${e.name} (${e.value})`
        }));
    }
    
    getOutputCcOptions(channel: number, currentValue?: number, rule?: Rule): { value: number; label: string }[] {
        // Case 1: MAPPING - show mapping's CC rules
        if (rule && rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                const ccRules = mapping.rules.filter(r => r.type === 'cc');
                if (ccRules.length === 0) {
                    return [{ value: 0, label: 'No CC rules in this mapping' }];
                }
                return ccRules.map(r => {
                    let label = `${r.name} (${r.value})`;
                    if (r.dataValue !== undefined) {
                        label += ` → value: ${r.dataValue}`;
                    }
                    return { value: r.value, label: label };
                });
            }
        }
        
        // Case 2: DEVICE - show device's mapped CC names from ccLibrary
        if (rule && rule.consumerSource.type === 'device') {
            const chStr = String(rule.output.channel);
            let entries: CcLibraryEntry[] = [];
            if (this.ccLibrary[chStr]) {
                entries = this.ccLibrary[chStr].filter(e => e.type === 'cc');
            }
            if (entries.length === 0) {
                for (let i = 0; i <= 127; i++) {
                    entries.push({ name: `CC#${i}`, value: i, type: 'cc' });
                }
            }
            return entries.map(e => ({
                value: e.value,
                label: `${e.name} (${e.value})`
            }));
        }
        
        // Case 3: CHANNEL - show raw 0-127 CC numbers
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `CC#${i}` });
        }
        return options;
    }

    getOutputNoteOptions(channel: number, currentValue?: number, rule?: Rule): { value: number; label: string }[] {
        // Case 1: MAPPING - show mapping's note rules
        if (rule && rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                const noteRules = mapping.rules.filter(r => r.type === 'note');
                if (noteRules.length === 0) {
                    return [{ value: 60, label: 'No note rules in this mapping' }];
                }
                return noteRules.map(r => {
                    let label = `${r.name} (${r.value})`;
                    if (r.dataValue !== undefined) {
                        label += ` → vel: ${r.dataValue}`;
                    }
                    return { value: r.value, label: label };
                });
            }
        }
        
        // Case 2: DEVICE - show device's mapped note names from ccLibrary
        if (rule && rule.consumerSource.type === 'device') {
            const chStr = String(rule.output.channel);
            let entries: CcLibraryEntry[] = [];
            if (this.ccLibrary[chStr]) {
                entries = this.ccLibrary[chStr].filter(e => e.type === 'note');
            }
            if (entries.length === 0) {
                for (let i = 0; i <= 127; i++) {
                    entries.push({ name: `Note#${i}`, value: i, type: 'note' });
                }
            }
            return entries.map(e => ({
                value: e.value,
                label: `${e.name} (${e.value})`
            }));
        }
        
        // Case 3: CHANNEL - show raw 0-127 note numbers
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `Note#${i}` });
        }
        return options;
    }
    
    getOutputProgramOptions(rule?: Rule): { value: number; label: string }[] {
        // Case 1: MAPPING - show mapping's program rules
        if (rule && rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                const options = this.getConsumerProgramOptionsFromMapping(mapping);
                if (options.length > 0) {
                    return options.map(o => ({ value: o.value, label: o.label }));
                }
            }
        }
        
        // Case 2: DEVICE or CHANNEL - show raw 0-127 program numbers
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `Program ${i}` });
        }
        return options;
    }
    
    refreshMaps() {
        this.loadMidiMaps();
        this.loadTriggerMappings();
        this.rules = [...this.rules];
        this.cdr.detectChanges();
    }
    
    triggerFileInput() {
        const input = document.getElementById(this.importFileInputId) as HTMLInputElement;
        if (input) input.click();
    }
    
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        const fileName = file.name;
        const baseFileName = fileName.replace(/\.(sbr|json)$/i, '');
        this.fileName = baseFileName;
        if (fileName.endsWith('.sbr')) {
            this.importSbrFile(file);
        } else if (fileName.endsWith('.json')) {
            this.importJsonFile(file);
        }
        input.value = '';
    }
    
    loadExample() {
        this.rules = JSON.parse(JSON.stringify(this.exampleRules));
        this.fileName = '';
        this.cdr.detectChanges();
    }
    
    clearRules() {
        this.rules = [];
        this.showGenerated = false;
        this.generatedScript = '';
        this.fileName = '';
        this.cdr.detectChanges();
    }
    
    addRule() {
        const newRule: Rule = {
            name: "New Rule",
            enabled: true,
            type: 'standard',
            customCode: '',
            collapsed: true,
            selected: false,
            triggerSource: { type: 'channel', value: 1 },
            consumerSource: { type: 'channel', value: 1 },
            output: {
                type: "cc",
                channel: 1,
                ccNumber: 0,
                valueMode: "constant",
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: "constant",
                delayMs: 0,
                injectOutput: false
            },
            trigger: {
                type: "controlChange",
                channel: 1,
                noteMode: "specific",
                specificNote: 60,
                ccNumber: 0,
                valueMode: "any",
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: "eat",
                cloneTrigger: false
            }
        };
        this.rules.push(newRule);
        this.cdr.detectChanges();
    }
    
    addCustomRule() {
        const newRule: Rule = {
            name: "Custom Rule",
            enabled: true,
            type: 'custom',
            customCode: '# Write your custom StreamByter code here\n# Example:\n# IF M0 == B0 07\n#   SND M0 M1 7F\n# END',
            collapsed: true,
            selected: false,
            triggerSource: { type: 'channel', value: 1 },
            consumerSource: { type: 'channel', value: 1 },
            output: {
                type: "cc",
                channel: 1,
                ccNumber: 0,
                valueMode: "constant",
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: "constant",
                delayMs: 0,
                injectOutput: false
            },
            trigger: {
                type: "controlChange",
                channel: 1,
                noteMode: "specific",
                specificNote: 60,
                ccNumber: 0,
                valueMode: "any",
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: "eat",
                cloneTrigger: false
            }
        };
        this.rules.push(newRule);
        this.cdr.detectChanges();
    }
    
    deleteRule(index: number) {
        if (confirm(`Delete rule "${this.rules[index].name}"?`)) {
            this.rules.splice(index, 1);
            this.cdr.detectChanges();
        }
    }
    
    duplicateRule(index: number) {
        const original = this.rules[index];
        const copy = JSON.parse(JSON.stringify(original));
        copy.name = `${original.name} (copy)`;
        copy.selected = false;
        copy.collapsed = true;
        this.rules.splice(index + 1, 0, copy);
        this.cdr.detectChanges();
    }
    
    toggleCustomRuleCollapse(index: number) {
        this.rules[index].collapsed = !this.rules[index].collapsed;
        this.cdr.detectChanges();
    }
    
    getTriggerParamName(rule: Rule): string {
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            const mapping = this.getTriggerMappingByName(rule.triggerSource.mappingName);
            if (mapping) {
                const matchedRule = mapping.rules.find(r => r.value === rule.trigger.ccNumber);
                if (matchedRule && matchedRule.name) {
                    return matchedRule.name;
                }
            }
        }
        if (rule.trigger.type === 'controlChange') {
            const ccNumber = Number(rule.trigger.ccNumber);
            return this.getParamName(rule.trigger.channel, 'cc', ccNumber);
        } else if (rule.trigger.type === 'noteOn') {
            if (rule.trigger.noteMode === 'specific') {
                const noteNumber = Number(rule.trigger.specificNote);
                return this.getParamName(rule.trigger.channel, 'note', noteNumber);
            } else {
                return 'any note';
            }
        }
        return 'unknown';
    }

    getOutputParamName(rule: Rule): string {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                if (rule.output.type === 'cc') {
                    let matchedRule = null;
                    if (rule.output.valueMode === 'constant') {
                        matchedRule = mapping.rules.find(r => 
                            r.type === 'cc' && 
                            r.value === rule.output.ccNumber && 
                            r.dataValue === rule.output.constantValue
                        );
                    }
                    if (!matchedRule) {
                        matchedRule = mapping.rules.find(r => 
                            r.type === 'cc' && 
                            r.value === rule.output.ccNumber
                        );
                    }
                    
                    if (matchedRule && matchedRule.name) {
                        if (matchedRule.dataValue !== undefined) {
                            return `${matchedRule.name} (${matchedRule.dataValue})`;
                        }
                        return matchedRule.name;
                    }
                } else if (rule.output.type === 'note') {
                    let matchedRule = null;
                    if (rule.output.velocityMode === 'constant') {
                        matchedRule = mapping.rules.find(r => 
                            r.type === 'note' && 
                            r.value === rule.output.note && 
                            r.dataValue === rule.output.velocity
                        );
                    }
                    if (!matchedRule) {
                        matchedRule = mapping.rules.find(r => 
                            r.type === 'note' && 
                            r.value === rule.output.note
                        );
                    }
                    
                    if (matchedRule && matchedRule.name) {
                        if (matchedRule.dataValue !== undefined) {
                            return `${matchedRule.name} (vel ${matchedRule.dataValue})`;
                        }
                        return matchedRule.name;
                    }
                } else if (rule.output.type === 'program') {
                    const matchedRule = mapping.rules.find(r => 
                        r.type === 'program' && 
                        r.value === rule.output.program
                    );
                    if (matchedRule && matchedRule.name) {
                        return matchedRule.name;
                    }
                }
            }
        }
        
        if (rule.output.type === 'cc') {
            const ccNumber = Number(rule.output.ccNumber);
            let baseName = this.getParamName(rule.output.channel, 'cc', ccNumber);
            if (rule.output.valueMode === 'constant') {
                baseName += ` (${rule.output.constantValue})`;
            }
            return baseName;
        } else if (rule.output.type === 'note') {
            const noteNumber = Number(rule.output.note);
            let baseName = this.getParamName(rule.output.channel, 'note', noteNumber);
            if (rule.output.velocityMode === 'constant') {
                baseName += ` (vel ${rule.output.velocity})`;
            }
            return baseName;
        } else if (rule.output.type === 'program') {
            return `program ${rule.output.program}`;
        }
        return 'unknown';
    }
    
    generateNameForRule(index: number) {
        if (this.rules[index] && this.rules[index].type === 'standard') {
            const rule = this.rules[index];
            const srcDev = this.getEffectiveTriggerName(rule);
            const dstDev = this.getEffectiveConsumerName(rule);
            const srcParam = this.getTriggerParamName(rule);
            const dstParam = this.getOutputParamName(rule);
            let newName = `[${srcDev}] ${srcParam}`;
            if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
                newName += ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
            } else if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'specific') {
                newName += ` = ${rule.trigger.specificValue}`;
            }
            newName += ` → [${dstDev}] ${dstParam}`;
            if (rule.output.type === 'cc' && rule.output.valueMode === 'constant') {
                newName += ` = ${rule.output.constantValue}`;
            } else if (rule.output.type === 'note' && rule.output.velocityMode === 'constant') {
                newName += ` vel=${rule.output.velocity}`;
            }
            if (rule.trigger.cloneTrigger) {
                newName += ` [+C]`;
            }
            if (rule.output.injectOutput) {
                newName += ` [+I]`;
            }
            this.rules[index].name = newName;
            this.cdr.detectChanges();
        }
    }
    
    generateStreamByterScript() {
        const lines: string[] = [];
        const scriptName = this.fileName.trim();
        if (scriptName) {
            lines.push(`# ${scriptName}`);
        } else {
            lines.push(`# StreamByter Script`);
        }
        lines.push(`# Generated: ${new Date().toLocaleString()}`);
        lines.push('');
        const enabledRules = this.rules.filter(r => r.enabled);
        if (enabledRules.length === 0) {
            lines.push('# No enabled rules');
            this.generatedScript = lines.join('\n');
            this.showGenerated = true;
            this.cdr.detectChanges();
            return;
        }
        let ruleCounter = 1;
        enabledRules.forEach((rule) => {
            if (rule.type === 'custom') {
                lines.push(`# == CUSTOM_RULE ==`);
                if (rule.customCode) {
                    const customLines = rule.customCode.split('\n');
                    for (const customLine of customLines) {
                        lines.push(customLine);
                    }
                }
                lines.push('');
            } else {
                let triggerSourceLine = '';
                if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
                    triggerSourceLine = `# trigger-source: [mapping] "${rule.triggerSource.mappingName}"`;
                } else if (rule.triggerSource.type === 'device') {
                    triggerSourceLine = `# trigger-source: [device] "${rule.triggerSource.value}"`;
                } else if (rule.triggerSource.type === 'channel') {
                    triggerSourceLine = `# trigger-source: [channel] "${rule.triggerSource.value}"`;
                }
                let consumerSourceLine = '';
                if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
                    consumerSourceLine = `# consumer-source: [mapping] "${rule.consumerSource.mappingName}"`;
                } else if (rule.consumerSource.type === 'device') {
                    consumerSourceLine = `# consumer-source: [device] "${rule.consumerSource.value}"`;
                } else if (rule.consumerSource.type === 'channel') {
                    consumerSourceLine = `# consumer-source: [channel] "${rule.consumerSource.value}"`;
                }
                const srcParam = this.getTriggerParamName(rule);
                const dstParam = this.getOutputParamName(rule);
                const srcDev = this.getEffectiveTriggerName(rule);
                const dstDev = this.getEffectiveConsumerName(rule);
                let rangeInfo = '';
                if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
                    rangeInfo = ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
                } else if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'specific') {
                    rangeInfo = ` = ${rule.trigger.specificValue}`;
                }
                const cloneTriggerFlag = rule.trigger.cloneTrigger ? ' [+C]' : '';
                const injectOutputFlag = rule.output.injectOutput ? ' [+I]' : '';
                lines.push(`# == RULE ${ruleCounter}: [${srcDev}] ${srcParam}${rangeInfo} → [${dstDev}] ${dstParam}${cloneTriggerFlag}${injectOutputFlag} ==`);
                if (triggerSourceLine) {
                    lines.push(triggerSourceLine);
                }
                if (consumerSourceLine) {
                    lines.push(consumerSourceLine);
                }
                const ruleLines = this.generateStreamByterIIRule(rule);
                if (ruleLines) {
                    lines.push(...ruleLines);
                }
                lines.push('');
                ruleCounter++;
            }
        });
        this.generatedScript = lines.join('\n');
        this.showGenerated = true;
        this.cdr.detectChanges();
    }
    
    private generateStreamByterIIRule(rule: Rule): string[] {
        const lines: string[] = [];
        const toHex = (value: any, padding: number = 2): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return num.toString(16).toUpperCase().padStart(padding, '0');
        };
        const toChannelHex = (channel: number): string => {
            const channelNum = typeof channel === 'string' ? parseInt(channel, 10) : channel;
            return (channelNum - 1).toString(16).toUpperCase();
        };
        const toHexCompare = (value: any): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return `0x${num.toString(16).toUpperCase()}`;
        };
        
        // IF condition line
        if (rule.trigger.type === 'controlChange') {
            const triggerChannelHex = toChannelHex(rule.trigger.channel);
            const ccHex = toHex(rule.trigger.ccNumber);
            if (rule.trigger.valueMode === 'specific') {
                const valueHex = toHex(rule.trigger.specificValue);
                lines.push(`IF M0 == B${triggerChannelHex} ${ccHex} ${valueHex}`);
            } else if (rule.trigger.valueMode === 'range') {
                const minHex = toHexCompare(rule.trigger.rangeMin);
                const maxHex = toHexCompare(rule.trigger.rangeMax);
                lines.push(`IF M0 == B${triggerChannelHex} ${ccHex}`);
                lines.push(`  IF M2 >= ${minHex}`);
                lines.push(`    IF M2 <= ${maxHex}`);
            } else {
                lines.push(`IF M0 == B${triggerChannelHex} ${ccHex}`);
            }
        } else if (rule.trigger.type === 'noteOn') {
            const triggerChannelHex = toChannelHex(rule.trigger.channel);
            if (rule.trigger.noteMode === 'specific') {
                const noteHex = toHex(rule.trigger.specificNote);
                lines.push(`IF M0 == 9${triggerChannelHex} ${noteHex}`);
            } else {
                lines.push(`IF M0 >= 0x90 && M0 <= 0x9F`);
            }
        }
        
        const indent = (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') ? '  ' : '';
        
        // Check if we need to use inline style (for CC messages only)
        const useInlineStyle = (rule.trigger.cloneTrigger || rule.output.injectOutput) && rule.trigger.type === 'controlChange';
        
        if (useInlineStyle) {
            // INLINE STYLE
            if (rule.trigger.cloneTrigger) {
                const ccHex = toHex(rule.trigger.ccNumber);
                lines.push(`${indent}  BX ${ccHex} = XX ${ccHex} +C`);
            }
            
            const delayFlag = rule.output.delayMs > 0 ? ` +D${rule.output.delayMs}` : '';
            const injectOutputFlag = rule.output.injectOutput ? ' +I' : '';
            
            if (rule.output.type === 'cc') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const ccHex = toHex(rule.output.ccNumber);
                if (rule.output.valueMode === 'constant') {
                    const valueHex = toHex(rule.output.constantValue);
                    lines.push(`${indent}  SND B${outputChannelHex} ${ccHex} ${valueHex}${delayFlag}${injectOutputFlag}`);
                } else {
                    lines.push(`${indent}  SND B${outputChannelHex} ${ccHex} XX${delayFlag}${injectOutputFlag}`);
                }
            } else if (rule.output.type === 'note') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const noteHex = toHex(rule.output.note);
                if (rule.output.velocityMode === 'constant') {
                    const velocityHex = toHex(rule.output.velocity);
                    lines.push(`${indent}  SND 9${outputChannelHex} ${noteHex} ${velocityHex}${delayFlag}${injectOutputFlag}`);
                } else {
                    lines.push(`${indent}  SND 9${outputChannelHex} ${noteHex} XX${delayFlag}${injectOutputFlag}`);
                }
            } else if (rule.output.type === 'program') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const programHex = toHex(rule.output.program);
                lines.push(`${indent}  SND C${outputChannelHex} ${programHex}${delayFlag}${injectOutputFlag}`);
            }
        } else {
            // STANDARD STYLE
            if (rule.output.type === 'cc') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const ccHex = toHex(rule.output.ccNumber);
                lines.push(`${indent}  ASS M0 = B${outputChannelHex}`);
                lines.push(`${indent}  ASS M1 = ${ccHex}`);
                if (rule.output.valueMode === 'constant') {
                    const valueHex = toHex(rule.output.constantValue);
                    lines.push(`${indent}  ASS M2 = ${valueHex}`);
                }
            } else if (rule.output.type === 'note') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const noteHex = toHex(rule.output.note);
                lines.push(`${indent}  ASS M0 = 9${outputChannelHex}`);
                lines.push(`${indent}  ASS M1 = ${noteHex}`);
                if (rule.output.velocityMode === 'constant') {
                    const velocityHex = toHex(rule.output.velocity);
                    lines.push(`${indent}  ASS M2 = ${velocityHex}`);
                }
            } else if (rule.output.type === 'program') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const programHex = toHex(rule.output.program);
                lines.push(`${indent}  ASS M0 = C${outputChannelHex}`);
                lines.push(`${indent}  ASS M1 = ${programHex}`);
            }
            
            const delayFlag = rule.output.delayMs > 0 ? ` +D${rule.output.delayMs}` : '';
            if (rule.output.type === 'program') {
                lines.push(`${indent}  SND M0 M1${delayFlag}`);
            } else {
                lines.push(`${indent}  SND M0 M1 M2${delayFlag}`);
            }
        }
        
        if (rule.trigger.consume === 'eat') {
            lines.push(`${indent}  BLOCK`);
        }
        
        if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
            lines.push(`  END`);
            lines.push(`  END`);
            lines.push(`END`);
        } else {
            lines.push(`END`);
        }
        return lines;
    }
    
    private importSbrFile(file: File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, 'text/xml');
                const dict = xmlDoc.querySelector('dict');
                if (dict) {
                    const keys = dict.querySelectorAll('key');
                    for (let i = 0; i < keys.length; i++) {
                        if (keys[i].textContent === 'StreamByter-Rules') {
                            const stringElement = keys[i].nextElementSibling;
                            if (stringElement && stringElement.tagName === 'string') {
                                const scriptContent = stringElement.textContent || '';
                                this.parseStreamByterScript(scriptContent);
                                return;
                            }
                        }
                    }
                }
            } catch (ex) {
                console.error('Error parsing .sbr file:', ex);
            }
        };
        reader.readAsText(file);
    }
    
    private importJsonFile(file: File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json.rules) {
                    this.rules = this.convertFromExternal(json.rules);
                } else if (json.script) {
                    this.parseStreamByterScript(json.script);
                }
                this.cdr.detectChanges();
            } catch (ex) {
                console.error('Error parsing JSON file:', ex);
            }
        };
        reader.readAsText(file);
    }
    
    private parseStreamByterScript(script: string) {
        this.rules = [];
        this.loadTriggerMappings();
        
        // First, decode HTML entities in the script
        let decodedScript = script
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&amp;/g, '&');
        
        const lines = decodedScript.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            if (line === '# == CUSTOM_RULE ==') {
                i = this.parseCustomRule(lines, i);
                continue;
            }
            
            if (!line.startsWith('# == RULE')) {
                i++;
                continue;
            }
            
            // Parse rule header
            const ruleHeader = this.parseRuleHeader(line, i, lines);
            if (!ruleHeader) {
                i++;
                continue;
            }
            
            const { rule, triggerSourceType, triggerSourceValue, mappingName, consumerSourceType, consumerSourceValue, consumerMappingName, hasConsumerSourceLine, cloneTriggerFlag, injectOutputFlag } = ruleHeader;
            
            // Move past the header lines
            i = ruleHeader.nextIndex;
            if (i >= lines.length) break;
            
            // Get condition line
            let conditionLine = lines[i].trim();
            while (conditionLine === '' && i < lines.length) {
                i++;
                conditionLine = lines[i].trim();
            }
            
            if (!conditionLine) {
                i++;
                continue;
            }
            
            // Determine if this is inline style (has SND with +I or +C)
            const isInline = this.detectInlineStyle(lines, i + 1);
            
            // Determine the type of condition
            const specificMatch = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})\s+([0-9A-F]{2})/i);
            const anyValueMatch = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})$/i);
            
            // Check if this rule has range conditions (nested IF with >= and <=)
            const hasRangeCondition = this.detectRangeCondition(lines, i + 1);
            
            if (specificMatch) {
                // CC with specific value (3 hex values)
                i = this.parseSpecificRule(lines, i, rule, conditionLine, triggerSourceType, triggerSourceValue, mappingName, consumerSourceType, consumerSourceValue, consumerMappingName, hasConsumerSourceLine, isInline);
            } else if (anyValueMatch && hasRangeCondition) {
                // CC with ANY value but has range conditions on M2
                i = this.parseRangeRule(lines, i, rule, conditionLine, triggerSourceType, triggerSourceValue, mappingName, consumerSourceType, consumerSourceValue, consumerMappingName, hasConsumerSourceLine);
            } else if (anyValueMatch) {
                // CC with ANY value (2 hex values) - no range condition
                i = this.parseAnyValueRule(lines, i, rule, conditionLine, triggerSourceType, triggerSourceValue, mappingName, consumerSourceType, consumerSourceValue, consumerMappingName, hasConsumerSourceLine, isInline);
            } else if (conditionLine.match(/IF\s+M0\s*>=\s*0x90\s*&&\s*M0\s*<=\s*0x9F/i)) {
                i = this.parseNoteRule(lines, i, rule, conditionLine, triggerSourceType, triggerSourceValue, mappingName, consumerSourceType, consumerSourceValue, consumerMappingName, hasConsumerSourceLine);
            } else {
                i++;
            }
        }
        
        setTimeout(() => {
            this.rules = [...this.rules];
            this.refreshMaps();
            this.cdr.detectChanges();
            setTimeout(() => {
                this.cdr.detectChanges();
            }, 50);
        }, 100);
    }

    private detectRangeCondition(lines: string[], startIndex: number): boolean {
        let j = startIndex;
        let foundMin = false;
        let foundMax = false;
        
        while (j < lines.length) {
            const nextLine = lines[j].trim();
            if (nextLine === '' || nextLine.startsWith('#')) {
                j++;
                continue;
            }
            
            // Check for >= condition
            if (nextLine.includes('>=') || nextLine.includes('&gt;=')) {
                foundMin = true;
            }
            
            // Check for <= condition
            if (nextLine.includes('<=') || nextLine.includes('&lt;=')) {
                foundMax = true;
            }
            
            // If we found both min and max conditions, it's a range rule
            if (foundMin && foundMax) {
                return true;
            }
            
            // Stop if we hit END (end of this rule)
            if (nextLine === 'END') {
                break;
            }
            
            // If we hit another IF that's not about M2, this might not be a range
            if (nextLine.startsWith('IF') && !nextLine.includes('M2')) {
                break;
            }
            
            j++;
        }
        return false;
    }

    private parseRuleHeader(line: string, index: number, lines: string[]): any {
        let i = index;
        
        // Parse flags from comment line
        let cloneTriggerFlag = false;
        let injectOutputFlag = false;
        if (line.includes('[+C]')) {
            cloneTriggerFlag = true;
        }
        if (line.includes('[+I]')) {
            injectOutputFlag = true;
        }
        
        let triggerSourceType: 'mapping' | 'device' | 'channel' = 'channel';
        let triggerSourceValue: string | number = 1;
        let mappingName: string | null = null;
        
        let consumerSourceType: 'mapping' | 'device' | 'channel' = 'channel';
        let consumerSourceValue: string | number = 1;
        let consumerMappingName: string | null = null;
        let hasConsumerSourceLine = false;
        
        let nextLineIndex = i + 1;
        if (nextLineIndex < lines.length && lines[nextLineIndex].trim().startsWith('# trigger-source:')) {
            const triggerSourceLine = lines[nextLineIndex].trim();
            let match = triggerSourceLine.match(/# trigger-source:\s*\[mapping\]\s*"([^"]+)"/);
            if (match) {
                triggerSourceType = 'mapping';
                mappingName = match[1];
                triggerSourceValue = mappingName;
                i++;
            } else {
                match = triggerSourceLine.match(/# trigger-source:\s*\[device\]\s*"?(\d+)"?/);
                if (match) {
                    triggerSourceType = 'device';
                    triggerSourceValue = parseInt(match[1], 10);
                    i++;
                } else {
                    match = triggerSourceLine.match(/# trigger-source:\s*\[channel\]\s*"?(\d+)"?/);
                    if (match) {
                        triggerSourceType = 'channel';
                        triggerSourceValue = parseInt(match[1], 10);
                        i++;
                    }
                }
            }
        }
        
        nextLineIndex = i + 1;
        if (nextLineIndex < lines.length && lines[nextLineIndex].trim().startsWith('# consumer-source:')) {
            const consumerSourceLine = lines[nextLineIndex].trim();
            let match = consumerSourceLine.match(/# consumer-source:\s*\[mapping\]\s*"([^"]+)"/);
            if (match) {
                consumerSourceType = 'mapping';
                consumerMappingName = match[1];
                consumerSourceValue = consumerMappingName;
                hasConsumerSourceLine = true;
                i++;
            } else {
                match = consumerSourceLine.match(/# consumer-source:\s*\[device\]\s*"?(\d+)"?/);
                if (match) {
                    consumerSourceType = 'device';
                    consumerSourceValue = parseInt(match[1], 10);
                    hasConsumerSourceLine = true;
                    i++;
                } else {
                    match = consumerSourceLine.match(/# consumer-source:\s*\[channel\]\s*"?(\d+)"?/);
                    if (match) {
                        consumerSourceType = 'channel';
                        consumerSourceValue = parseInt(match[1], 10);
                        hasConsumerSourceLine = true;
                        i++;
                    }
                }
            }
        }
        
        const rule = this.createDefaultRule();
        rule.type = 'standard';
        rule.enabled = true;
        rule.trigger.cloneTrigger = cloneTriggerFlag;
        rule.output.injectOutput = injectOutputFlag;
        
        return {
            rule,
            triggerSourceType,
            triggerSourceValue,
            mappingName,
            consumerSourceType,
            consumerSourceValue,
            consumerMappingName,
            hasConsumerSourceLine,
            cloneTriggerFlag,
            injectOutputFlag,
            nextIndex: i + 1
        };
    }

    private detectInlineStyle(lines: string[], startIndex: number): boolean {
        let j = startIndex;
        while (j < lines.length) {
            const nextLine = lines[j].trim();
            if (nextLine === '' || nextLine.startsWith('#')) {
                j++;
                continue;
            }
            // Check for SND line (inline style)
            if (nextLine.startsWith('SND')) {
                // Inline style has direct hex values like "SND B9 00 01 +I" or "SND 90 3C 64 +I"
                // Standard style has "SND M0 M1 M2"
                if (!nextLine.includes('M0') && !nextLine.includes('M1') && !nextLine.includes('M2')) {
                    return true;
                }
            }
            // Stop if we hit END or a new IF
            if (nextLine === 'END' || nextLine.startsWith('IF')) {
                break;
            }
            j++;
        }
        return false;
    }

    /**
     * parses rules where the trigger condition has a specific CC value (3 hex numbers after B).
     * Example trigger: IF M0 == B1 29 01 (CC number 41, value 1)
    */
    private parseSpecificRule(lines: string[], startIndex: number, rule: Rule, conditionLine: string, triggerSourceType: any, triggerSourceValue: any, mappingName: string | null, consumerSourceType: any, consumerSourceValue: any, consumerMappingName: string | null, hasConsumerSourceLine: boolean, isInline: boolean): number {
        const match = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})\s+([0-9A-F]{2})/i);
        if (!match) return startIndex + 1;
        
        const parsedChannel = parseInt(match[1], 16) + 1;
        const triggerCC = parseInt(match[2], 16);
        const specificValue = parseInt(match[3], 16);
        
        rule.trigger.type = 'controlChange';
        rule.trigger.ccNumber = triggerCC;
        rule.trigger.valueMode = 'specific';
        rule.trigger.specificValue = specificValue;
        rule.trigger.consume = 'eat';
        
        // Set trigger source
        this.setTriggerSource(rule, triggerSourceType, triggerSourceValue, mappingName, parsedChannel);
        
        let j = startIndex + 1;
        let foundEnd = false;
        let hasBlock = false;
        let outputFound = false;
        let detectedOutputChannel: number | null = null;
        let detectedOutputType: string | null = null;
        let detectedCcNumber: number | null = null;
        let detectedNoteNumber: number | null = null;
        let detectedProgramNumber: number | null = null;
        let detectedConstantValue: number | null = null;
        let detectedVelocity: number | null = null;
        
        while (j < lines.length && !foundEnd) {
            const currentLine = lines[j].trim();
            const strippedLine = currentLine.replace(/^\s+/, '');
            
            if (strippedLine === '' || strippedLine.startsWith('#')) {
                j++;
                continue;
            }
            
            if (isInline) {
                // Parse inline SND format: SND B9 00 01 +I or SND 90 3C 64 +I
                if (strippedLine.startsWith('SND')) {
                    const parts = strippedLine.split(/\s+/);
                    if (parts.length >= 3) {
                        const typeChannel = parts[1]; // 'B9' or '90' or 'C0'
                        const type = typeChannel[0];  // 'B', '9', or 'C'
                        const channelHex = typeChannel[1]; // '9' or '0'
                        const numHex = parts[2];      // '00' or '3C'
                        const hasPlusI = strippedLine.endsWith('+I');
                        const hasPlusC = strippedLine.endsWith('+C');
                        
                        const channel = parseInt(channelHex, 16) + 1;
                        const num = parseInt(numHex, 16);
                        
                        console.log('Inline SND parsed:', { type, channel, num, parts, hasPlusI });
                        
                        if (type === 'B') {
                            // CC message
                            rule.output.type = 'cc';
                            rule.output.ccNumber = num;
                            rule.output.valueMode = 'constant';
                            if (parts.length >= 4 && parts[3] !== '+I' && parts[3] !== '+C') {
                                rule.output.constantValue = parseInt(parts[3], 16);
                                detectedConstantValue = rule.output.constantValue;
                            } else {
                                rule.output.constantValue = 0;
                            }
                        } else if (type === '9') {
                            // Note message
                            rule.output.type = 'note';
                            rule.output.note = num;
                            rule.output.velocityMode = 'constant';
                            if (parts.length >= 4 && parts[3] !== '+I' && parts[3] !== '+C') {
                                rule.output.velocity = parseInt(parts[3], 16);
                                detectedVelocity = rule.output.velocity;
                            } else {
                                rule.output.velocity = 64;
                            }
                        } else if (type === 'C') {
                            // Program Change
                            rule.output.type = 'program';
                            rule.output.program = num;
                        }
                        
                        rule.output.channel = channel;
                        detectedOutputChannel = channel;
                        
                        if (hasPlusI) {
                            rule.output.injectOutput = true;
                        }
                        if (hasPlusC) {
                            rule.trigger.cloneTrigger = true;
                        }
                        
                        outputFound = true;
                        j++;
                        continue;
                    }
                }
            } else {
                // Parse standard style with ASS lines (keep your existing code)
                const assM0PCMatch = strippedLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                if (assM0PCMatch && !outputFound) {
                    rule.output.type = 'program';
                    rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                    detectedOutputChannel = rule.output.channel;
                    detectedOutputType = 'program';
                    outputFound = true;
                    j++;
                    continue;
                }
                
                const assM0CCMatch = strippedLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                if (assM0CCMatch && !outputFound) {
                    rule.output.type = 'cc';
                    rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                    detectedOutputChannel = rule.output.channel;
                    detectedOutputType = 'cc';
                    outputFound = true;
                    j++;
                    continue;
                }
                
                const assM0NoteMatch = strippedLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                if (assM0NoteMatch && !outputFound) {
                    rule.output.type = 'note';
                    rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                    detectedOutputChannel = rule.output.channel;
                    detectedOutputType = 'note';
                    outputFound = true;
                    j++;
                    continue;
                }
                
                const assM1Match = strippedLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                if (assM1Match && outputFound) {
                    const value = parseInt(assM1Match[1], 16);
                    if (rule.output.type === 'cc') {
                        rule.output.ccNumber = value;
                        detectedCcNumber = value;
                    } else if (rule.output.type === 'program') {
                        rule.output.program = value;
                        detectedProgramNumber = value;
                    } else if (rule.output.type === 'note') {
                        rule.output.note = value;
                        detectedNoteNumber = value;
                    }
                    j++;
                    continue;
                }
                
                const assM2Match = strippedLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                if (assM2Match && outputFound) {
                    const value = parseInt(assM2Match[1], 16);
                    if (rule.output.type === 'cc') {
                        rule.output.valueMode = 'constant';
                        rule.output.constantValue = value;
                        detectedConstantValue = value;
                    } else if (rule.output.type === 'note') {
                        rule.output.velocityMode = 'constant';
                        rule.output.velocity = value;
                        detectedVelocity = value;
                    }
                    j++;
                    continue;
                }
                
                const sndMatch = strippedLine.match(/SND\s+M0\s+M1(?:\s+M2)?(?:\s+\+D(\d+))?/i);
                if (sndMatch && outputFound) {
                    if (sndMatch[1]) {
                        rule.output.delayMs = parseInt(sndMatch[1], 10);
                    }
                    j++;
                    continue;
                }
            }
            
            // Check for BX line (+C)
            const bxMatch = strippedLine.match(/BX\s+([0-9A-F]{2})\s*=\s*XX\s+\1\s+\+C/i);
            if (bxMatch) {
                rule.trigger.cloneTrigger = true;
                j++;
                continue;
            }
            
            if (strippedLine.match(/BLOCK/i)) {
                hasBlock = true;
            }
            
            if (strippedLine.match(/^END$/i)) {
                foundEnd = true;
                break;
            }
            j++;
        }
        
        // Set output values from detected data (for standard style)
        if (detectedOutputType && !isInline) {
            rule.output.type = detectedOutputType as 'cc' | 'program' | 'note';
        }
        if (detectedCcNumber !== null && !isInline) rule.output.ccNumber = detectedCcNumber;
        if (detectedNoteNumber !== null && !isInline) rule.output.note = detectedNoteNumber;
        if (detectedProgramNumber !== null && !isInline) rule.output.program = detectedProgramNumber;
        if (detectedConstantValue !== null && !isInline) {
            rule.output.valueMode = 'constant';
            rule.output.constantValue = detectedConstantValue;
        }
        if (detectedVelocity !== null && !isInline) {
            rule.output.velocityMode = 'constant';
            rule.output.velocity = detectedVelocity;
        }
        
        // Set consumer source
        this.setConsumerSource(rule, hasConsumerSourceLine, consumerSourceType, consumerSourceValue, consumerMappingName, detectedOutputChannel);
        
        rule.trigger.consume = hasBlock ? 'eat' : 'pass';
        
        this.rules.push(rule);
        const ruleIndex = this.rules.length - 1;
        this.generateNameForRule(ruleIndex);
        
        return j;
    }

    private parseAnyValueRule(lines: string[], startIndex: number, rule: Rule, conditionLine: string, triggerSourceType: any, triggerSourceValue: any, mappingName: string | null, consumerSourceType: any, consumerSourceValue: any, consumerMappingName: string | null, hasConsumerSourceLine: boolean, isInline: boolean): number {
        const match = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})$/i);
        if (!match) return startIndex + 1;
        
        const parsedChannel = parseInt(match[1], 16) + 1;
        const triggerCC = parseInt(match[2], 16);
        
        rule.trigger.type = 'controlChange';
        rule.trigger.ccNumber = triggerCC;
        rule.trigger.valueMode = 'any';  // ANY value, not specific or range
        rule.trigger.consume = 'eat';
        
        // Set trigger source
        this.setTriggerSource(rule, triggerSourceType, triggerSourceValue, mappingName, parsedChannel);
        
        let j = startIndex + 1;
        let foundEnd = false;
        let hasBlock = false;
        let outputFound = false;
        let detectedOutputChannel: number | null = null;
        let detectedOutputType: string | null = null;
        let detectedCcNumber: number | null = null;
        let detectedNoteNumber: number | null = null;
        let detectedProgramNumber: number | null = null;
        let detectedConstantValue: number | null = null;
        let detectedVelocity: number | null = null;
        
        while (j < lines.length && !foundEnd) {
            const currentLine = lines[j].trim();
            const strippedLine = currentLine.replace(/^\s+/, '');
            
            if (strippedLine === '' || strippedLine.startsWith('#')) {
                j++;
                continue;
            }
            
            if (isInline) {
                // Parse inline SND format: SND B9 00 01 +I
                if (strippedLine.startsWith('SND')) {
                    const parts = strippedLine.split(/\s+/);
                    if (parts.length >= 3) {
                        const typeChannel = parts[1];
                        const type = typeChannel[0];
                        const channelHex = typeChannel[1];
                        const numHex = parts[2];
                        const hasPlusI = strippedLine.endsWith('+I');
                        const hasPlusC = strippedLine.endsWith('+C');
                        
                        const channel = parseInt(channelHex, 16) + 1;
                        const num = parseInt(numHex, 16);
                        
                        if (type === 'B') {
                            rule.output.type = 'cc';
                            rule.output.ccNumber = num;
                            rule.output.valueMode = 'constant';
                            if (parts.length >= 4 && parts[3] !== '+I' && parts[3] !== '+C') {
                                rule.output.constantValue = parseInt(parts[3], 16);
                                detectedConstantValue = rule.output.constantValue;
                            } else {
                                rule.output.constantValue = 0;
                            }
                        } else if (type === '9') {
                            rule.output.type = 'note';
                            rule.output.note = num;
                            rule.output.velocityMode = 'constant';
                            if (parts.length >= 4 && parts[3] !== '+I' && parts[3] !== '+C') {
                                rule.output.velocity = parseInt(parts[3], 16);
                                detectedVelocity = rule.output.velocity;
                            } else {
                                rule.output.velocity = 64;
                            }
                        } else if (type === 'C') {
                            rule.output.type = 'program';
                            rule.output.program = num;
                        }
                        
                        rule.output.channel = channel;
                        detectedOutputChannel = channel;
                        
                        if (hasPlusI) {
                            rule.output.injectOutput = true;
                        }
                        if (hasPlusC) {
                            rule.trigger.cloneTrigger = true;
                        }
                        
                        outputFound = true;
                        j++;
                        continue;
                    }
                }
            } else {
                // Parse standard style with ASS lines (for ANY value rules without +I)
                const assM0PCMatch = strippedLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                if (assM0PCMatch && !outputFound) {
                    rule.output.type = 'program';
                    rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                    detectedOutputChannel = rule.output.channel;
                    detectedOutputType = 'program';
                    outputFound = true;
                    j++;
                    continue;
                }
                
                const assM0CCMatch = strippedLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                if (assM0CCMatch && !outputFound) {
                    rule.output.type = 'cc';
                    rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                    detectedOutputChannel = rule.output.channel;
                    detectedOutputType = 'cc';
                    outputFound = true;
                    j++;
                    continue;
                }
                
                const assM0NoteMatch = strippedLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                if (assM0NoteMatch && !outputFound) {
                    rule.output.type = 'note';
                    rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                    detectedOutputChannel = rule.output.channel;
                    detectedOutputType = 'note';
                    outputFound = true;
                    j++;
                    continue;
                }
                
                const assM1Match = strippedLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                if (assM1Match && outputFound) {
                    const value = parseInt(assM1Match[1], 16);
                    if (rule.output.type === 'cc') {
                        rule.output.ccNumber = value;
                        detectedCcNumber = value;
                    } else if (rule.output.type === 'program') {
                        rule.output.program = value;
                        detectedProgramNumber = value;
                    } else if (rule.output.type === 'note') {
                        rule.output.note = value;
                        detectedNoteNumber = value;
                    }
                    j++;
                    continue;
                }
                
                const assM2Match = strippedLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                if (assM2Match && outputFound) {
                    const value = parseInt(assM2Match[1], 16);
                    if (rule.output.type === 'cc') {
                        rule.output.valueMode = 'constant';
                        rule.output.constantValue = value;
                        detectedConstantValue = value;
                    } else if (rule.output.type === 'note') {
                        rule.output.velocityMode = 'constant';
                        rule.output.velocity = value;
                        detectedVelocity = value;
                    }
                    j++;
                    continue;
                }
                
                const sndMatch = strippedLine.match(/SND\s+M0\s+M1(?:\s+M2)?(?:\s+\+D(\d+))?/i);
                if (sndMatch && outputFound) {
                    if (sndMatch[1]) {
                        rule.output.delayMs = parseInt(sndMatch[1], 10);
                    }
                    j++;
                    continue;
                }
            }
            
            // Check for BX line (+C)
            const bxMatch = strippedLine.match(/BX\s+([0-9A-F]{2})\s*=\s*XX\s+\1\s+\+C/i);
            if (bxMatch) {
                rule.trigger.cloneTrigger = true;
                j++;
                continue;
            }
            
            if (strippedLine.match(/BLOCK/i)) {
                hasBlock = true;
            }
            
            if (strippedLine.match(/^END$/i)) {
                foundEnd = true;
                break;
            }
            j++;
        }
        
        // Set output values from detected data (for standard style)
        if (detectedOutputType && !isInline) {
            rule.output.type = detectedOutputType as 'cc' | 'program' | 'note';
        }
        if (detectedCcNumber !== null && !isInline) rule.output.ccNumber = detectedCcNumber;
        if (detectedNoteNumber !== null && !isInline) rule.output.note = detectedNoteNumber;
        if (detectedProgramNumber !== null && !isInline) rule.output.program = detectedProgramNumber;
        if (detectedConstantValue !== null && !isInline) {
            rule.output.valueMode = 'constant';
            rule.output.constantValue = detectedConstantValue;
        }
        if (detectedVelocity !== null && !isInline) {
            rule.output.velocityMode = 'constant';
            rule.output.velocity = detectedVelocity;
        }
        
        // Set consumer source
        this.setConsumerSource(rule, hasConsumerSourceLine, consumerSourceType, consumerSourceValue, consumerMappingName, detectedOutputChannel);
        
        rule.trigger.consume = hasBlock ? 'eat' : 'pass';
        
        this.rules.push(rule);
        const ruleIndex = this.rules.length - 1;
        this.generateNameForRule(ruleIndex);
        
        return j;
    }

    private setTriggerSource(rule: Rule, triggerSourceType: any, triggerSourceValue: any, mappingName: string | null, parsedChannel: number): void {
        if (triggerSourceType === 'mapping' && mappingName) {
            const existingMapping = this.triggerMappings.find(m => m.name === mappingName);
            if (existingMapping) {
                rule.triggerSource = {
                    type: 'mapping',
                    value: mappingName,
                    mappingName: mappingName
                };
                rule.trigger.channel = existingMapping.triggerMidiChannel;
            } else {
                rule.triggerSource = { type: 'channel', value: parsedChannel };
                rule.trigger.channel = parsedChannel;
            }
        } else if (triggerSourceType === 'device') {
            rule.triggerSource = { type: 'device', value: triggerSourceValue as number };
            rule.trigger.channel = triggerSourceValue as number;
        } else {
            rule.triggerSource = { type: 'channel', value: triggerSourceValue as number };
            rule.trigger.channel = triggerSourceValue as number;
        }
    }

    private setConsumerSource(rule: Rule, hasConsumerSourceLine: boolean, consumerSourceType: any, consumerSourceValue: any, consumerMappingName: string | null, detectedOutputChannel: number | null): void {
        if (hasConsumerSourceLine && consumerSourceType === 'mapping' && consumerMappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const existingMapping = consumerMappings.find(m => m.name === consumerMappingName);
            if (existingMapping) {
                rule.consumerSource = {
                    type: 'mapping',
                    value: consumerMappingName,
                    mappingName: consumerMappingName
                };
                rule.output.channel = existingMapping.triggerMidiChannel;
                rule.showMappingSelector = true;
                
                // Try to find matching rule in the consumer mapping
                let matchedRule = null;
                if (rule.output.type === 'cc') {
                    if (rule.output.valueMode === 'constant') {
                        matchedRule = existingMapping.rules.find(r => 
                            r.type === 'cc' && 
                            r.value === rule.output.ccNumber && 
                            r.dataValue === rule.output.constantValue
                        );
                    }
                    if (!matchedRule) {
                        matchedRule = existingMapping.rules.find(r => 
                            r.type === 'cc' && 
                            r.value === rule.output.ccNumber
                        );
                    }
                } else if (rule.output.type === 'note') {
                    if (rule.output.velocityMode === 'constant') {
                        matchedRule = existingMapping.rules.find(r => 
                            r.type === 'note' && 
                            r.value === rule.output.note && 
                            r.dataValue === rule.output.velocity
                        );
                    }
                    if (!matchedRule) {
                        matchedRule = existingMapping.rules.find(r => 
                            r.type === 'note' && 
                            r.value === rule.output.note
                        );
                    }
                } else if (rule.output.type === 'program') {
                    matchedRule = existingMapping.rules.find(r => 
                        r.type === 'program' && 
                        r.value === rule.output.program
                    );
                }
                
                if (matchedRule) {
                    (rule as any).selectedMappingRuleKey = `${matchedRule.type}_${matchedRule.value}_${matchedRule.dataValue !== undefined ? matchedRule.dataValue : 'null'}`;
                }
            } else {
                rule.consumerSource = { type: 'channel', value: detectedOutputChannel || 1 };
                rule.output.channel = detectedOutputChannel || 1;
                rule.showMappingSelector = false;
            }
        } else if (hasConsumerSourceLine && consumerSourceType === 'device') {
            rule.consumerSource = { type: 'device', value: consumerSourceValue as number };
            rule.output.channel = consumerSourceValue as number;
            rule.showMappingSelector = false;
        } else if (hasConsumerSourceLine && consumerSourceType === 'channel') {
            rule.consumerSource = { type: 'channel', value: consumerSourceValue as number };
            rule.output.channel = consumerSourceValue as number;
            rule.showMappingSelector = false;
        } else {
            const fallbackChannel = detectedOutputChannel || 1;
            const deviceMap = this.storageService.getDeviceMap();
            const matchingDevice = deviceMap.find(d => d.midiChannel === fallbackChannel);
            if (matchingDevice) {
                rule.consumerSource = { type: 'device', value: fallbackChannel };
            } else {
                rule.consumerSource = { type: 'channel', value: fallbackChannel };
            }
            rule.output.channel = fallbackChannel;
            rule.showMappingSelector = false;
        }
    }

    private parseRangeRule(lines: string[], startIndex: number, rule: Rule, conditionLine: string, triggerSourceType: any, triggerSourceValue: any, mappingName: string | null, consumerSourceType: any, consumerSourceValue: any, consumerMappingName: string | null, hasConsumerSourceLine: boolean): number {
        
        const match = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})$/i);
        if (!match) return startIndex + 1;
        
        const parsedChannel = parseInt(match[1], 16) + 1;
        const triggerCC = parseInt(match[2], 16);
        
        rule.trigger.type = 'controlChange';
        rule.trigger.ccNumber = triggerCC;
        rule.trigger.consume = 'eat';
        
        // Set trigger source
        this.setTriggerSource(rule, triggerSourceType, triggerSourceValue, mappingName, parsedChannel);
        
        let j = startIndex + 1;
        let foundEnd = false;
        let rangeMin: number | null = null;
        let rangeMax: number | null = null;
        let nestedLevel = 1;
        let hasBlock = false;
        let outputFound = false;
        let detectedOutputChannel: number | null = null;
        let detectedOutputType: string | null = null;
        let detectedCcNumber: number | null = null;
        let detectedNoteNumber: number | null = null;
        let detectedProgramNumber: number | null = null;
        let detectedConstantValue: number | null = null;
        let detectedVelocity: number | null = null;
        
        while (j < lines.length && !foundEnd) {
            const currentLine = lines[j].trim();
            const strippedLine = currentLine.replace(/^\s+/, '');
            
            if (strippedLine === '' || strippedLine.startsWith('#')) {
                j++;
                continue;
            }
            
            // Parse min condition (>=) - handle both >= and decoded >=
            const minMatch = strippedLine.match(/IF\s+M2\s*>=?\s*(?:0x)?([0-9A-F]+)/i);
            if (minMatch && rangeMin === null) {
                rangeMin = parseInt(minMatch[1], 16);
                nestedLevel++;
                j++;
                continue;
            }
            
            // Parse max condition (<=) - handle both <= and decoded <=
            const maxMatch = strippedLine.match(/IF\s+M2\s*<=?\s*(?:0x)?([0-9A-F]+)/i);
            if (maxMatch && rangeMax === null) {
                rangeMax = parseInt(maxMatch[1], 16);
                nestedLevel++;
                j++;
                continue;
            }
            
            const assM0PCMatch = strippedLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
            if (assM0PCMatch && !outputFound) {
                rule.output.type = 'program';
                rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                detectedOutputChannel = rule.output.channel;
                detectedOutputType = 'program';
                outputFound = true;
                j++;
                continue;
            }
            
            const assM0CCMatch = strippedLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
            if (assM0CCMatch && !outputFound) {
                rule.output.type = 'cc';
                rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                detectedOutputChannel = rule.output.channel;
                detectedOutputType = 'cc';
                outputFound = true;
                j++;
                continue;
            }
            
            const assM0NoteMatch = strippedLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
            if (assM0NoteMatch && !outputFound) {
                rule.output.type = 'note';
                rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                detectedOutputChannel = rule.output.channel;
                detectedOutputType = 'note';
                outputFound = true;
                j++;
                continue;
            }
            
            const assM1Match = strippedLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
            if (assM1Match && outputFound) {
                const value = parseInt(assM1Match[1], 16);
                if (rule.output.type === 'cc') {
                    rule.output.ccNumber = value;
                    detectedCcNumber = value;
                } else if (rule.output.type === 'program') {
                    rule.output.program = value;
                    detectedProgramNumber = value;
                } else if (rule.output.type === 'note') {
                    rule.output.note = value;
                    detectedNoteNumber = value;
                }
                j++;
                continue;
            }
            
            const assM2Match = strippedLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
            if (assM2Match && outputFound) {
                const value = parseInt(assM2Match[1], 16);
                if (rule.output.type === 'cc') {
                    rule.output.valueMode = 'constant';
                    rule.output.constantValue = value;
                    detectedConstantValue = value;
                } else if (rule.output.type === 'note') {
                    rule.output.velocityMode = 'constant';
                    rule.output.velocity = value;
                    detectedVelocity = value;
                }
                j++;
                continue;
            }
            
            const sndMatch = strippedLine.match(/SND\s+M0\s+M1(?:\s+M2)?(?:\s+\+D(\d+))?/i);
            if (sndMatch && outputFound) {
                if (sndMatch[1]) {
                    rule.output.delayMs = parseInt(sndMatch[1], 10);
                }
                j++;
                continue;
            }
            
            if (strippedLine.match(/BLOCK/i)) {
                hasBlock = true;
            }
            
            if (strippedLine.match(/^END$/i)) {
                nestedLevel--;
                if (nestedLevel === 0) {
                    foundEnd = true;
                    break;
                }
            }
            j++;
        }
        
        if (detectedOutputType) {
            rule.output.type = detectedOutputType as 'cc' | 'program' | 'note';
        }
        if (detectedCcNumber !== null) rule.output.ccNumber = detectedCcNumber;
        if (detectedNoteNumber !== null) rule.output.note = detectedNoteNumber;
        if (detectedProgramNumber !== null) rule.output.program = detectedProgramNumber;
        if (detectedConstantValue !== null) {
            rule.output.valueMode = 'constant';
            rule.output.constantValue = detectedConstantValue;
        }
        if (detectedVelocity !== null) {
            rule.output.velocityMode = 'constant';
            rule.output.velocity = detectedVelocity;
        }
        
        this.setConsumerSource(rule, hasConsumerSourceLine, consumerSourceType, consumerSourceValue, consumerMappingName, detectedOutputChannel);
        
        rule.trigger.consume = hasBlock ? 'eat' : 'pass';
        if (rangeMin !== null && rangeMax !== null) {
            rule.trigger.valueMode = 'range';
            rule.trigger.rangeMin = rangeMin;
            rule.trigger.rangeMax = rangeMax;
        } else {
            rule.trigger.valueMode = 'any';
        }
        
        this.rules.push(rule);
        const ruleIndex = this.rules.length - 1;
        this.generateNameForRule(ruleIndex);
        
        return j;
    }

    private parseNoteRule(lines: string[], startIndex: number, rule: Rule, conditionLine: string, triggerSourceType: any, triggerSourceValue: any, mappingName: string | null, consumerSourceType: any, consumerSourceValue: any, consumerMappingName: string | null, hasConsumerSourceLine: boolean): number {
        rule.trigger.type = 'noteOn';
        rule.trigger.noteMode = 'any';
        rule.trigger.consume = 'eat';
        
        // Set trigger source
        if (triggerSourceType === 'mapping' && mappingName) {
            const existingMapping = this.triggerMappings.find(m => m.name === mappingName);
            if (existingMapping) {
                rule.triggerSource = {
                    type: 'mapping',
                    value: mappingName,
                    mappingName: mappingName
                };
                rule.trigger.channel = existingMapping.triggerMidiChannel;
            } else {
                rule.triggerSource = { type: 'channel', value: triggerSourceValue as number };
                rule.trigger.channel = triggerSourceValue as number;
            }
        } else if (triggerSourceType === 'device') {
            rule.triggerSource = { type: 'device', value: triggerSourceValue as number };
            rule.trigger.channel = triggerSourceValue as number;
        } else {
            rule.triggerSource = { type: 'channel', value: triggerSourceValue as number };
            rule.trigger.channel = triggerSourceValue as number;
        }
        
        let j = startIndex + 1;
        let foundEnd = false;
        let hasBlock = false;
        let outputFound = false;
        let detectedOutputChannel: number | null = null;
        let detectedOutputType: string | null = null;
        let detectedCcNumber: number | null = null;
        let detectedNoteNumber: number | null = null;
        let detectedProgramNumber: number | null = null;
        let detectedConstantValue: number | null = null;
        let detectedVelocity: number | null = null;
        
        while (j < lines.length && !foundEnd) {
            const currentLine = lines[j].trim();
            const strippedLine = currentLine.replace(/^\s+/, '');
            
            if (strippedLine === '' || strippedLine.startsWith('#')) {
                j++;
                continue;
            }
            
            const assM0PCMatch = strippedLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
            if (assM0PCMatch && !outputFound) {
                rule.output.type = 'program';
                rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                detectedOutputChannel = rule.output.channel;
                detectedOutputType = 'program';
                outputFound = true;
                j++;
                continue;
            }
            
            const assM0CCMatch = strippedLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
            if (assM0CCMatch && !outputFound) {
                rule.output.type = 'cc';
                rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                detectedOutputChannel = rule.output.channel;
                detectedOutputType = 'cc';
                outputFound = true;
                j++;
                continue;
            }
            
            const assM0NoteMatch = strippedLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
            if (assM0NoteMatch && !outputFound) {
                rule.output.type = 'note';
                rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                detectedOutputChannel = rule.output.channel;
                detectedOutputType = 'note';
                outputFound = true;
                j++;
                continue;
            }
            
            const assM1Match = strippedLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
            if (assM1Match && outputFound) {
                const value = parseInt(assM1Match[1], 16);
                if (rule.output.type === 'cc') {
                    rule.output.ccNumber = value;
                    detectedCcNumber = value;
                } else if (rule.output.type === 'program') {
                    rule.output.program = value;
                    detectedProgramNumber = value;
                } else if (rule.output.type === 'note') {
                    rule.output.note = value;
                    detectedNoteNumber = value;
                }
                j++;
                continue;
            }
            
            const assM2Match = strippedLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
            if (assM2Match && outputFound) {
                const value = parseInt(assM2Match[1], 16);
                if (rule.output.type === 'cc') {
                    rule.output.valueMode = 'constant';
                    rule.output.constantValue = value;
                    detectedConstantValue = value;
                } else if (rule.output.type === 'note') {
                    rule.output.velocityMode = 'constant';
                    rule.output.velocity = value;
                    detectedVelocity = value;
                }
                j++;
                continue;
            }
            
            if (strippedLine.match(/BLOCK/i)) {
                hasBlock = true;
            }
            
            if (strippedLine.match(/^END$/i)) {
                foundEnd = true;
                break;
            }
            j++;
        }
        
        if (detectedOutputType) {
            rule.output.type = detectedOutputType as 'cc' | 'program' | 'note';
        }
        if (detectedCcNumber !== null) rule.output.ccNumber = detectedCcNumber;
        if (detectedNoteNumber !== null) rule.output.note = detectedNoteNumber;
        if (detectedProgramNumber !== null) rule.output.program = detectedProgramNumber;
        if (detectedConstantValue !== null) {
            rule.output.valueMode = 'constant';
            rule.output.constantValue = detectedConstantValue;
        }
        if (detectedVelocity !== null) {
            rule.output.velocityMode = 'constant';
            rule.output.velocity = detectedVelocity;
        }
        
        this.setConsumerSource(rule, hasConsumerSourceLine, consumerSourceType, consumerSourceValue, consumerMappingName, detectedOutputChannel);
        
        rule.trigger.consume = hasBlock ? 'eat' : 'pass';
        
        this.rules.push(rule);
        const ruleIndex = this.rules.length - 1;
        this.generateNameForRule(ruleIndex);
        
        return j;
    }

    private parseCustomRule(lines: string[], startIndex: number): number {
        let i = startIndex;
        const rule = this.createDefaultRule();
        rule.type = 'custom';
        rule.enabled = true;
        let customCodeLines: string[] = [];
        i++;
        while (i < lines.length) {
            const currentLine = lines[i];
            if (currentLine.trim().startsWith('# == RULE') || 
                currentLine.trim() === '# == CUSTOM_RULE ==') {
                break;
            }
            customCodeLines.push(currentLine);
            i++;
        }
        rule.customCode = customCodeLines.join('\n').trim();
        rule.name = "Custom Rule";
        this.rules.push(rule);
        return i;
    }

    private createDefaultRule(): Rule {
        return {
            name: "Imported Rule",
            enabled: true,
            type: 'standard',
            customCode: '',
            collapsed: true,
            selected: false,
            triggerSource: { type: 'channel', value: 1 },
            consumerSource: { type: 'channel', value: 1 },
            output: {
                type: "cc",
                channel: 1,
                ccNumber: 0,
                valueMode: "trigger",
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: "trigger",
                delayMs: 0,
                injectOutput: false
            },
            trigger: {
                type: "controlChange",
                channel: 1,
                noteMode: "specific",
                specificNote: 60,
                ccNumber: 0,
                valueMode: "any",
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: "eat",
                cloneTrigger: false
            }
        };
    }
    
    private generateActionBasedName(rule: Rule): string {
        const srcDev = this.getEffectiveTriggerName(rule);
        const dstDev = this.getEffectiveConsumerName(rule);
        let srcParam = '';
        if (rule.trigger.type === 'controlChange') {
            srcParam = `CC${rule.trigger.ccNumber}`;
            const mappedName = this.getParamName(rule.trigger.channel, 'cc', rule.trigger.ccNumber);
            if (mappedName && !mappedName.startsWith('CC#')) {
                srcParam = mappedName;
            }
        } else if (rule.trigger.type === 'noteOn') {
            if (rule.trigger.noteMode === 'specific') {
                srcParam = this.getParamName(rule.trigger.channel, 'note', rule.trigger.specificNote);
            } else {
                srcParam = 'any note';
            }
        }
        let dstParam = '';
        if (rule.output.type === 'cc') {
            dstParam = `CC${rule.output.ccNumber}`;
            const mappedName = this.getParamName(rule.output.channel, 'cc', rule.output.ccNumber);
            if (mappedName && !mappedName.startsWith('CC#')) {
                dstParam = mappedName;
            }
        } else if (rule.output.type === 'program') {
            dstParam = `program ${rule.output.program}`;
        } else if (rule.output.type === 'note') {
            dstParam = `note ${rule.output.note}`;
            const mappedName = this.getParamName(rule.output.channel, 'note', rule.output.note);
            if (mappedName && !mappedName.startsWith('Note#')) {
                dstParam = mappedName;
            }
        }
        let result = `[${srcDev}] ${srcParam}`;
        if (rule.trigger.valueMode === 'range') {
            result += ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
        } else if (rule.trigger.valueMode === 'specific') {
            result += ` = ${rule.trigger.specificValue}`;
        }
        result += ` → [${dstDev}] ${dstParam}`;
        if (rule.trigger.cloneTrigger) {
            result += ` [+C]`;
        }
        if (rule.output.injectOutput) {
            result += ` [+I]`;
        }
        return result;
    }
    
    copyToClipboard() {
        navigator.clipboard.writeText(this.generatedScript).then(() => {
        }).catch(() => {
            console.error('Failed to copy script');
        });
    }
    
    private getFormattedDate(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}__${hours}-${minutes}`;
    }
    
    generatePlistContent(script: string): string {
        let escapedScript = script
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>StreamByter-Rules</key>
    <string>${escapedScript}</string>
</dict>
</plist>`;
    }
    
    downloadScript() {
        if (!this.generatedScript) return;
        let finalFileName = this.fileName.trim();
        if (!finalFileName) finalFileName = this.getFormattedDate();
        if (!finalFileName.endsWith('.sbr')) finalFileName += '.sbr';
        const plistContent = this.generatePlistContent(this.generatedScript);
        const blob = new Blob([plistContent], { type: 'application/xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = finalFileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    downloadAsJson() {
        if (!this.generatedScript) return;
        let finalFileName = this.fileName.trim();
        if (!finalFileName) finalFileName = this.getFormattedDate();
        if (!finalFileName.endsWith('.json')) finalFileName += '.json';
        const jsonContent = {
            script: this.generatedScript,
            generated: new Date().toISOString(),
            rulesCount: this.rules.length,
            deviceMap: this.deviceMap
        };
        const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = finalFileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    private convertFromExternal(externalRules: any[]): Rule[] {
        return externalRules.map(ext => ({
            name: ext.name || 'Imported Rule',
            enabled: ext.enabled !== false,
            type: ext.type || 'standard',
            customCode: ext.customCode || '',
            collapsed: ext.collapsed !== undefined ? ext.collapsed : true,
            selected: false,
            triggerSource: ext.triggerSource || { type: 'channel', value: 1 },
            consumerSource: ext.consumerSource || { type: 'channel', value: 1 },
            output: { 
                type: ext.output?.type || 'cc',
                channel: ext.output?.channel || 1,
                ccNumber: ext.output?.ccNumber || 0,
                valueMode: ext.output?.valueMode || 'trigger',
                constantValue: ext.output?.constantValue || 0,
                program: ext.output?.program || 0,
                note: ext.output?.note || 60,
                velocity: ext.output?.velocity || 64,
                velocityMode: ext.output?.velocityMode || 'trigger',
                delayMs: ext.output?.delayMs || 0,
                injectOutput: ext.output?.injectOutput || false
            },
            trigger: {
                type: ext.trigger?.type || 'controlChange',
                channel: ext.trigger?.channel || 1,
                noteMode: ext.trigger?.noteMode || 'specific',
                specificNote: ext.trigger?.specificNote || 60,
                ccNumber: ext.trigger?.ccNumber || 0,
                valueMode: ext.trigger?.valueMode || 'any',
                specificValue: ext.trigger?.specificValue || 0,
                rangeMin: ext.trigger?.rangeMin || 0,
                rangeMax: ext.trigger?.rangeMax || 127,
                consume: ext.trigger?.consume || 'eat',
                cloneTrigger: ext.trigger?.cloneTrigger || false
            }
        }));
    }

    updateSelectedCcName(rule: Rule, ccNumber: number, ccDataValue?: number) {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                let matchedRule;
                if (ccDataValue !== undefined) {
                    matchedRule = mapping.rules.find(r => r.type === 'cc' && r.value === ccNumber && r.dataValue === ccDataValue);
                } else {
                    matchedRule = mapping.rules.find(r => r.type === 'cc' && r.value === ccNumber);
                }
                
                if (matchedRule) {
                    (rule as any).selectedCcName = matchedRule.name;
                }
            }
        }
        this.cdr.detectChanges();
    }

    updateSelectedNoteName(rule: Rule, noteNumber: number) {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                const matchedRule = mapping.rules.find(r => r.type === 'note' && r.value === noteNumber);
                if (matchedRule) {
                    (rule as any).selectedNoteName = matchedRule.name;
                }
            }
        }
        this.cdr.detectChanges();
    }
    
    onDragDrop(event: CdkDragDrop<Rule[]>) {
        moveItemInArray(this.rules, event.previousIndex, event.currentIndex);
        this.cdr.detectChanges();
    }
    
    toggleDragMode() {
        this.dragEnabled = !this.dragEnabled;
        this.cdr.detectChanges();
    }

    deleteSelectedRules() {
        const selectedRules = this.rules.filter(
            r => r.type === 'standard' && r.selected
        );

        if (selectedRules.length === 0) {
            return;
        }

        const confirmed = confirm(
            `Delete ${selectedRules.length} selected rule(s)?`
        );

        if (!confirmed) {
            return;
        }

        this.rules = this.rules.filter(
            rule => !(rule.type === 'standard' && rule.selected)
        );

        this.cdr.detectChanges();
    }
}