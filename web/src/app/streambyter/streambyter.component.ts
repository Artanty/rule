import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, DeviceMapEntry, CcLibraryEntry, TriggerMapping } from '../services/storage.service';

interface Rule {
    name: string;
    enabled: boolean;
    type: 'standard' | 'custom';
    customCode?: string;
    collapsed?: boolean;
    selected?: boolean;
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
    
    // UI Toggles
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
            triggerSource: {
                type: 'device',
                value: 1
            },
            consumerSource: {
                type: 'channel',
                value: 1
            },
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
                delayMs: 0
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
                consume: "eat"
            }
        },
        {
            name: "Note Velocity Scale",
            enabled: true,
            type: 'standard',
            customCode: '',
            collapsed: true,
            selected: false,
            triggerSource: {
                type: 'channel',
                value: 2
            },
            consumerSource: {
                type: 'channel',
                value: 2
            },
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
                delayMs: 0
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
                consume: "pass"
            }
        }
    ];
    
    triggerMappings: TriggerMapping[] = [];
    openMappingsEditor: boolean = false;
    bulkMappingName: string | null = null;
    
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
            rule.triggerSource = {
                type: 'device',
                value: channel
            };
            rule.trigger.channel = channel;
        } else if (selectedValue.startsWith('channel:')) {
            const channel = parseInt(selectedValue.substring('channel:'.length), 10);
            rule.triggerSource = {
                type: 'channel',
                value: channel
            };
            rule.trigger.channel = channel;
        }
        this.cdr.detectChanges();
    }
    
    onConsumerSourceChange(rule: Rule, selectedValue: string) {
        const currentCCValue = rule.output.ccNumber;
        const currentNoteValue = rule.output.note;
        const currentProgramValue = rule.output.program;
        
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
                
                if (rule.output.type === 'cc') {
                    const ccRules = mapping.rules.filter(r => r.type === 'cc');
                    const valueExists = ccRules.some(r => r.value === currentCCValue);
                    if (valueExists) {
                        rule.output.ccNumber = currentCCValue;
                    } else if (ccRules.length > 0) {
                        rule.output.ccNumber = ccRules[0].value;
                    }
                } else if (rule.output.type === 'note') {
                    const noteRules = mapping.rules.filter(r => r.type === 'note');
                    const valueExists = noteRules.some(r => r.value === currentNoteValue);
                    if (valueExists) {
                        rule.output.note = currentNoteValue;
                    } else if (noteRules.length > 0) {
                        rule.output.note = noteRules[0].value;
                    }
                } else if (rule.output.type === 'program') {
                    const programRules = mapping.rules.filter(r => r.type === 'program');
                    const valueExists = programRules.some(r => r.value === currentProgramValue);
                    if (valueExists) {
                        rule.output.program = currentProgramValue;
                    } else if (programRules.length > 0) {
                        rule.output.program = programRules[0].value;
                    }
                }
            }
        } else if (selectedValue.startsWith('device:')) {
            const channel = parseInt(selectedValue.substring('device:'.length), 10);
            rule.consumerSource = {
                type: 'device',
                value: channel
            };
            rule.output.channel = channel;
        } else if (selectedValue.startsWith('channel:')) {
            const channel = parseInt(selectedValue.substring('channel:'.length), 10);
            rule.consumerSource = {
                type: 'channel',
                value: channel
            };
            rule.output.channel = channel;
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
    
    getConsumerCcOptionsFromMapping(mapping: TriggerMapping, currentValue?: number): { value: number; label: string }[] {
        const ccRules = mapping.rules.filter(r => r.type === 'cc');
        if (ccRules.length === 0) {
            return [{ value: 0, label: 'No CC rules in mapping' }];
        }
        return ccRules.map(rule => ({
            value: rule.value,
            label: `${rule.name} (${rule.value})`
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
    
    getConsumerProgramOptionsFromMapping(mapping: TriggerMapping, currentValue?: number): { value: number; label: string }[] {
        const programRules = mapping.rules.filter(r => r.type === 'program');
        if (programRules.length === 0) {
            return [{ value: 0, label: 'No program rules in mapping' }];
        }
        return programRules.map(rule => ({
            value: rule.value,
            label: `${rule.name} (${rule.value})`
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
        if (rule && rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                return this.getConsumerCcOptionsFromMapping(mapping, currentValue);
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
    
    getOutputNoteOptions(channel: number, currentValue?: number, rule?: Rule): { value: number; label: string }[] {
        if (rule && rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                return this.getConsumerNoteOptionsFromMapping(mapping, currentValue);
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
    
    getOutputProgramOptions(rule?: Rule): { value: number; label: string }[] {
        if (rule && rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                return this.getConsumerProgramOptionsFromMapping(mapping);
            }
        }
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
            triggerSource: {
                type: 'channel',
                value: 1
            },
            consumerSource: {
                type: 'channel',
                value: 1
            },
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
                delayMs: 0
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
                consume: "eat"
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
            triggerSource: {
                type: 'channel',
                value: 1
            },
            consumerSource: {
                type: 'channel',
                value: 1
            },
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
                delayMs: 0
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
                consume: "eat"
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
                    const matchedRule = mapping.rules.find(r => r.type === 'cc' && r.value === rule.output.ccNumber);
                    if (matchedRule && matchedRule.name) {
                        return matchedRule.name;
                    }
                } else if (rule.output.type === 'note') {
                    const matchedRule = mapping.rules.find(r => r.type === 'note' && r.value === rule.output.note);
                    if (matchedRule && matchedRule.name) {
                        return matchedRule.name;
                    }
                } else if (rule.output.type === 'program') {
                    const matchedRule = mapping.rules.find(r => r.type === 'program' && r.value === rule.output.program);
                    if (matchedRule && matchedRule.name) {
                        return matchedRule.name;
                    }
                }
            }
        }
        if (rule.output.type === 'cc') {
            const ccNumber = Number(rule.output.ccNumber);
            return this.getParamName(rule.output.channel, 'cc', ccNumber);
        } else if (rule.output.type === 'note') {
            const noteNumber = Number(rule.output.note);
            return this.getParamName(rule.output.channel, 'note', noteNumber);
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
                lines.push(`# == RULE ${ruleCounter}: [${srcDev}] ${srcParam}${rangeInfo} → [${dstDev}] ${dstParam} ==`);
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
        const lines = script.split('\n');
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            if (line === '# == CUSTOM_RULE ==') {
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
                continue;
            }
            if (!line.startsWith('# == RULE')) {
                i++;
                continue;
            }
    
            let triggerSourceType: 'mapping' | 'device' | 'channel' = 'channel';
            let triggerSourceValue: string | number = 1;
            let mappingName: string | null = null;
        
            let consumerSourceType: 'mapping' | 'device' | 'channel' = 'channel';
            let consumerSourceValue: string | number = 1;
            let consumerMappingName: string | null = null;
            let hasConsumerSourceLine = false;  // NEW FLAG
    
            let detectedOutputChannel: number | null = null;
            let detectedOutputType: string | null = null;
    
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
    
            i++;
            if (i >= lines.length) break;
        
            // Skip empty lines
            let conditionLine = lines[i].trim();
            while (conditionLine === '' && i < lines.length) {
                i++;
                conditionLine = lines[i].trim();
            }
    
            // Check for range condition with nested IF
            const rangeMatch = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})/i);
            if (rangeMatch) {
                const rule = this.createDefaultRule();
                rule.type = 'standard';
                rule.enabled = true;
                const parsedChannel = parseInt(rangeMatch[1], 16) + 1;
                const triggerCC = parseInt(rangeMatch[2], 16);
                rule.trigger.type = 'controlChange';
                rule.trigger.ccNumber = triggerCC;
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
    
                // Parse nested IF statements to find output
                let j = i + 1;
                let foundEnd = false;
                let rangeMin: number | null = null;
                let rangeMax: number | null = null;
                let nestedLevel = 1;
                let hasBlock = false;
                let outputFound = false;
    
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                    const strippedLine = currentLine.replace(/^\s+/, '');
                
                    // Look for output channel in ASS M0 command
                    const assM0Match = strippedLine.match(/ASS\s+M0\s*=\s*([BC9])([0-9A-F])/i);
                    if (assM0Match && !outputFound) {
                        const typeChar = assM0Match[1].toUpperCase();
                        const channelHex = assM0Match[2];
                        detectedOutputChannel = parseInt(channelHex, 16) + 1;
                        if (typeChar === 'B') detectedOutputType = 'cc';
                        else if (typeChar === 'C') detectedOutputType = 'program';
                        else if (typeChar === '9') detectedOutputType = 'note';
                        outputFound = true;
                    }
    
                    const minMatch = strippedLine.match(/IF\s+M2\s*>=\s*(?:0x)?([0-9A-F]+)/i);
                    if (minMatch && rangeMin === null) {
                        rangeMin = parseInt(minMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                
                    const maxMatch = strippedLine.match(/IF\s+M2\s*<=\s*(?:0x)?([0-9A-F]+)/i);
                    if (maxMatch && rangeMax === null) {
                        rangeMax = parseInt(maxMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                
                    const assM0CCMatch = strippedLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0CCMatch && !outputFound) {
                        rule.output.type = 'cc';
                        rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                        detectedOutputChannel = rule.output.channel;
                        outputFound = true;
                    }
                
                    const assM0PCMatch = strippedLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                    if (assM0PCMatch && !outputFound) {
                        rule.output.type = 'program';
                        rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                        detectedOutputChannel = rule.output.channel;
                        outputFound = true;
                    }
                
                    const assM0NoteMatch = strippedLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                    if (assM0NoteMatch && !outputFound) {
                        rule.output.type = 'note';
                        rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                        detectedOutputChannel = rule.output.channel;
                        outputFound = true;
                    }
                
                    const assM1Match = strippedLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'program') {
                            rule.output.program = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.note = parseInt(assM1Match[1], 16);
                        }
                    }
                
                    const assM2Match = strippedLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = parseInt(assM2Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = parseInt(assM2Match[1], 16);
                        }
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
    
                // Set consumer source based on whether we had a consumer-source line
                if (hasConsumerSourceLine) {
                    // Use the parsed consumer source from the file
                    if (consumerSourceType === 'mapping' && consumerMappingName) {
                        const consumerMappings = this.storageService.getConsumerMappings();
                        const existingMapping = consumerMappings.find(m => m.name === consumerMappingName);
                        if (existingMapping) {
                            rule.consumerSource = {
                                type: 'mapping',
                                value: consumerMappingName,
                                mappingName: consumerMappingName
                            };
                            rule.output.channel = existingMapping.triggerMidiChannel;
                        } else {
                            const fallbackChannel = detectedOutputChannel || 1;
                            rule.consumerSource = { type: 'channel', value: fallbackChannel };
                            rule.output.channel = fallbackChannel;
                        }
                    } else if (consumerSourceType === 'device') {
                        rule.consumerSource = { type: 'device', value: consumerSourceValue as number };
                        rule.output.channel = consumerSourceValue as number;
                    } else {
                        rule.consumerSource = { type: 'channel', value: consumerSourceValue as number };
                        rule.output.channel = consumerSourceValue as number;
                    }
                } else {
                    // No consumer-source line - use detected output channel from the script
                    const fallbackChannel = detectedOutputChannel || 1;
                    const deviceMap = this.storageService.getDeviceMap();
                    const matchingDevice = deviceMap.find(d => d.midiChannel === fallbackChannel);
                    if (matchingDevice) {
                        rule.consumerSource = { type: 'device', value: fallbackChannel };
                    } else {
                        rule.consumerSource = { type: 'channel', value: fallbackChannel };
                    }
                    rule.output.channel = fallbackChannel;
                    if (detectedOutputType && rule.output.type === 'cc') {
                        rule.output.type = detectedOutputType as 'cc' | 'program' | 'note';
                    }
                }
    
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
                if (rangeMin !== null && rangeMax !== null) {
                    rule.trigger.valueMode = 'range';
                    rule.trigger.rangeMin = rangeMin;
                    rule.trigger.rangeMax = rangeMax;
                } else {
                    rule.trigger.valueMode = 'any';
                }
                rule.name = this.generateActionBasedName(rule);
                this.rules.push(rule);
                i = j;
                continue;
            }
    
            // Similar fixes for Note On and specific value conditions...
            // (Add hasConsumerSourceLine flag to those as well)
        
            i++;
        }
    
        if (this.rules.length === 0) {
            console.log('No rules could be parsed from the script');
        }
    
        // Force UI update
        setTimeout(() => {
            this.rules = [...this.rules];
            this.refreshMaps();
            this.cdr.detectChanges();
            setTimeout(() => {
                this.cdr.detectChanges();
            }, 50);
        }, 100);
    }
    
    private createDefaultRule(): Rule {
        return {
            name: "Imported Rule",
            enabled: true,
            type: 'standard',
            customCode: '',
            collapsed: true,
            selected: false,
            triggerSource: {
                type: 'channel',
                value: 1
            },
            consumerSource: {
                type: 'channel',
                value: 1
            },
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
                delayMs: 0
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
                consume: "eat"
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
                delayMs: ext.output?.delayMs || 0
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
                consume: ext.trigger?.consume || 'eat'
            }
        }));
    }
}