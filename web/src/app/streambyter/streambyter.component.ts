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
        
        // Add trigger mappings
        for (const mapping of this.triggerMappings) {
            options.push({ 
                value: `mapping:${mapping.name}`, 
                label: `📌 ${mapping.name} (Ch${mapping.triggerMidiChannel})`,
                type: 'mapping',
                data: mapping
            });
        }
        
        // Add device mappings
        const deviceMap = this.storageService.getDeviceMap();
        for (const device of deviceMap) {
            options.push({
                value: `device:${device.midiChannel}`,
                label: `🎛️ ${device.device} (Ch${device.midiChannel})`,
                type: 'device',
                data: device.midiChannel
            });
        }
        
        // Add pure MIDI channels
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
        // Store current values before change
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
            
                // Try to preserve existing value
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
            // Store the current CC/Note value before changing
            const currentCCValue = rule.trigger.ccNumber;
            const currentNoteValue = rule.trigger.specificNote;
        
            rule.triggerSource = {
                type: 'mapping',
                value: mapping.name,
                mappingName: mapping.name
            };
            rule.trigger.channel = mapping.triggerMidiChannel;
        
            // Try to preserve existing value if it exists in the new mapping
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
            const dstDev = this.getDeviceName(rule.output.channel);
            
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
                // Add trigger source mapping line with quotes around values
                let triggerSourceLine = '';
                if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
                    triggerSourceLine = `# trigger-source: [mapping] "${rule.triggerSource.mappingName}"`;
                } else if (rule.triggerSource.type === 'device') {
                    triggerSourceLine = `# trigger-source: [device] "${rule.triggerSource.value}"`;
                } else if (rule.triggerSource.type === 'channel') {
                    triggerSourceLine = `# trigger-source: [channel] "${rule.triggerSource.value}"`;
                }
                
                const srcParam = this.getTriggerParamName(rule);
                const dstParam = this.getOutputParamName(rule);
                const srcDev = this.getEffectiveTriggerName(rule);
                const dstDev = this.getDeviceName(rule.output.channel);
            
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
        } 
        else if (rule.trigger.type === 'noteOn') {
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
        } 
        else if (rule.output.type === 'note') {
            const outputChannelHex = toChannelHex(rule.output.channel);
            const noteHex = toHex(rule.output.note);
            
            lines.push(`${indent}  ASS M0 = 9${outputChannelHex}`);
            lines.push(`${indent}  ASS M1 = ${noteHex}`);
            
            if (rule.output.velocityMode === 'constant') {
                const velocityHex = toHex(rule.output.velocity);
                lines.push(`${indent}  ASS M2 = ${velocityHex}`);
            }
        } 
        else if (rule.output.type === 'program') {
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

        // Ensure trigger mappings are loaded
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
        
            // Check if this is a rule line (starts with # == RULE)
            if (!line.startsWith('# == RULE')) {
                i++;
                continue;
            }
        
            // Parse rule comment to get the display name
            const ruleMatch = line.match(/# == RULE \d+: \[([^\]]+)\]/);
        
            // Look ahead for trigger-source line (it could be on the next line)
            let triggerSourceType: 'mapping' | 'device' | 'channel' = 'channel';
            let triggerSourceValue: string | number = 1;
            let mappingName: string | null = null;
        
            // Check next line for trigger-source
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (nextLine.startsWith('# trigger-source:')) {
                    console.log('Found trigger-source line:', nextLine);
                
                    // Parse [mapping] "name" - with quotes
                    let match = nextLine.match(/# trigger-source:\s*\[mapping\]\s*"([^"]+)"/);
                    if (match) {
                        triggerSourceType = 'mapping';
                        mappingName = match[1];
                        triggerSourceValue = mappingName;
                        console.log('Parsed mapping name:', mappingName);
                        i++; // Skip the trigger-source line
                    } else {
                        // Parse [device] "number" or [device] number
                        match = nextLine.match(/# trigger-source:\s*\[device\]\s*"?(\d+)"?/);
                        if (match) {
                            triggerSourceType = 'device';
                            triggerSourceValue = parseInt(match[1], 10);
                            console.log('Parsed device channel:', triggerSourceValue);
                            i++; // Skip the trigger-source line
                        } else {
                            // Parse [channel] "number" or [channel] number
                            match = nextLine.match(/# trigger-source:\s*\[channel\]\s*"?(\d+)"?/);
                            if (match) {
                                triggerSourceType = 'channel';
                                triggerSourceValue = parseInt(match[1], 10);
                                console.log('Parsed channel:', triggerSourceValue);
                                i++; // Skip the trigger-source line
                            }
                        }
                    }
                }
            }
        
            // Move to the next line to find the actual MIDI condition
            i++;
            if (i >= lines.length) break;
        
            const conditionLine = lines[i].trim();
        
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
            
                // Set trigger source based on parsed data
                if (triggerSourceType === 'mapping' && mappingName) {
                    const existingMapping = this.triggerMappings.find(m => m.name === mappingName);
                    if (existingMapping) {
                        rule.triggerSource = {
                            type: 'mapping',
                            value: mappingName,
                            mappingName: mappingName
                        };
                        rule.trigger.channel = existingMapping.triggerMidiChannel;
                        console.log('Set trigger source to mapping:', mappingName);
                    } else {
                        rule.triggerSource = {
                            type: 'channel',
                            value: parsedChannel
                        };
                        rule.trigger.channel = parsedChannel;
                        console.log('Mapping not found, fallback to channel:', parsedChannel);
                    }
                } else if (triggerSourceType === 'device') {
                    rule.triggerSource = {
                        type: 'device',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                } else {
                    rule.triggerSource = {
                        type: 'channel',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                }
            
                let j = i + 1;
                let foundEnd = false;
                let rangeMin: number | null = null;
                let rangeMax: number | null = null;
                let nestedLevel = 1;
                let hasBlock = false;
            
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                
                    const minMatch = currentLine.match(/IF\s+M2\s*>=\s*(?:0x)?([0-9A-F]+)/i);
                    if (minMatch && rangeMin === null) {
                        rangeMin = parseInt(minMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                
                    const maxMatch = currentLine.match(/IF\s+M2\s*<=\s*(?:0x)?([0-9A-F]+)/i);
                    if (maxMatch && rangeMax === null) {
                        rangeMax = parseInt(maxMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                
                    const assM0CCMatch = currentLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0CCMatch) {
                        rule.output.type = 'cc';
                        rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                    }
                
                    const assM0PCMatch = currentLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                    if (assM0PCMatch) {
                        rule.output.type = 'program';
                        rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                    }
                
                    const assM0NoteMatch = currentLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                    if (assM0NoteMatch) {
                        rule.output.type = 'note';
                        rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                    }
                
                    const assM1Match = currentLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'program') {
                            rule.output.program = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.note = parseInt(assM1Match[1], 16);
                        }
                    }
                
                    const assM2Match = currentLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = parseInt(assM2Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = parseInt(assM2Match[1], 16);
                        }
                    }
                
                    if (currentLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                
                    if (currentLine.match(/^END$/i)) {
                        nestedLevel--;
                        if (nestedLevel === 0) {
                            foundEnd = true;
                            break;
                        }
                    }
                
                    j++;
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
        
            // Check for specific value condition (non-range)
            const specificMatch = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})\s+([0-9A-F]{2})/i);
            if (specificMatch) {
                const rule = this.createDefaultRule();
                rule.type = 'standard';
                rule.enabled = true;
                const parsedChannel = parseInt(specificMatch[1], 16) + 1;
                const triggerCC = parseInt(specificMatch[2], 16);
                const specificValue = parseInt(specificMatch[3], 16);
            
                rule.trigger.type = 'controlChange';
                rule.trigger.ccNumber = triggerCC;
                rule.trigger.valueMode = 'specific';
                rule.trigger.specificValue = specificValue;
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
                        rule.triggerSource = {
                            type: 'channel',
                            value: parsedChannel
                        };
                        rule.trigger.channel = parsedChannel;
                    }
                } else if (triggerSourceType === 'device') {
                    rule.triggerSource = {
                        type: 'device',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                } else {
                    rule.triggerSource = {
                        type: 'channel',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                }
            
                let j = i + 1;
                let foundEnd = false;
                let hasBlock = false;
            
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                
                    const assM0CCMatch = currentLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0CCMatch) {
                        rule.output.type = 'cc';
                        rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                    }
                
                    const assM0PCMatch = currentLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                    if (assM0PCMatch) {
                        rule.output.type = 'program';
                        rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                    }
                
                    const assM0NoteMatch = currentLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                    if (assM0NoteMatch) {
                        rule.output.type = 'note';
                        rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                    }
                
                    const assM1Match = currentLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'program') {
                            rule.output.program = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.note = parseInt(assM1Match[1], 16);
                        }
                    }
                
                    const assM2Match = currentLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = parseInt(assM2Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = parseInt(assM2Match[1], 16);
                        }
                    }
                
                    if (currentLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                
                    if (currentLine.match(/^END$/i)) {
                        foundEnd = true;
                        break;
                    }
                
                    j++;
                }
            
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
                rule.name = this.generateActionBasedName(rule);
                this.rules.push(rule);
                i = j;
                continue;
            }
        
            // Check for any value condition (no specific value, no range)
            const anyMatch = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})$/i);
            if (anyMatch && !conditionLine.includes('0x')) {
                const rule = this.createDefaultRule();
                rule.type = 'standard';
                rule.enabled = true;
                const parsedChannel = parseInt(anyMatch[1], 16) + 1;
                const triggerCC = parseInt(anyMatch[2], 16);
            
                rule.trigger.type = 'controlChange';
                rule.trigger.ccNumber = triggerCC;
                rule.trigger.valueMode = 'any';
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
                        rule.triggerSource = {
                            type: 'channel',
                            value: parsedChannel
                        };
                        rule.trigger.channel = parsedChannel;
                    }
                } else if (triggerSourceType === 'device') {
                    rule.triggerSource = {
                        type: 'device',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                } else {
                    rule.triggerSource = {
                        type: 'channel',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                }
            
                let j = i + 1;
                let foundEnd = false;
                let hasBlock = false;
            
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                
                    const assM0CCMatch = currentLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0CCMatch) {
                        rule.output.type = 'cc';
                        rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                    }
                
                    const assM0PCMatch = currentLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                    if (assM0PCMatch) {
                        rule.output.type = 'program';
                        rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                    }
                
                    const assM0NoteMatch = currentLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                    if (assM0NoteMatch) {
                        rule.output.type = 'note';
                        rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                    }
                
                    const assM1Match = currentLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'program') {
                            rule.output.program = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.note = parseInt(assM1Match[1], 16);
                        }
                    }
                
                    const assM2Match = currentLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = parseInt(assM2Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = parseInt(assM2Match[1], 16);
                        }
                    }
                
                    if (currentLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                
                    if (currentLine.match(/^END$/i)) {
                        foundEnd = true;
                        break;
                    }
                
                    j++;
                }
            
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
                rule.name = this.generateActionBasedName(rule);
                this.rules.push(rule);
                i = j;
                continue;
            }
        
            // Check for Note On condition
            const noteMatch = conditionLine.match(/IF\s+M0\s*>=\s*0x90\s*&&\s*M0\s*<=\s*0x9F/i);
            if (noteMatch) {
                const rule = this.createDefaultRule();
                rule.type = 'standard';
                rule.enabled = true;
            
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
                        rule.triggerSource = {
                            type: 'channel',
                            value: triggerSourceValue as number
                        };
                        rule.trigger.channel = triggerSourceValue as number;
                    }
                } else if (triggerSourceType === 'device') {
                    rule.triggerSource = {
                        type: 'device',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                } else {
                    rule.triggerSource = {
                        type: 'channel',
                        value: triggerSourceValue as number
                    };
                    rule.trigger.channel = triggerSourceValue as number;
                }
            
                let j = i + 1;
                let foundEnd = false;
                let hasBlock = false;
            
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                
                    const assM0CCMatch = currentLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0CCMatch) {
                        rule.output.type = 'cc';
                        rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                    }
                
                    const assM0PCMatch = currentLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                    if (assM0PCMatch) {
                        rule.output.type = 'program';
                        rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                    }
                
                    const assM0NoteMatch = currentLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                    if (assM0NoteMatch) {
                        rule.output.type = 'note';
                        rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                    }
                
                    const assM1Match = currentLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'program') {
                            rule.output.program = parseInt(assM1Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.note = parseInt(assM1Match[1], 16);
                        }
                    }
                
                    const assM2Match = currentLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        if (rule.output.type === 'cc') {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = parseInt(assM2Match[1], 16);
                        } else if (rule.output.type === 'note') {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = parseInt(assM2Match[1], 16);
                        }
                    }
                
                    if (currentLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                
                    if (currentLine.match(/^END$/i)) {
                        foundEnd = true;
                        break;
                    }
                
                    j++;
                }
            
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
                rule.name = this.generateActionBasedName(rule);
                this.rules.push(rule);
                i = j;
                continue;
            }
        
            i++;
        }

        if (this.rules.length === 0) {
            console.log('No rules could be parsed from the script');
        }
    
        // Force UI update
        setTimeout(() => {
            this.refreshMaps();
            this.cdr.detectChanges();
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
        const dstDev = this.getDeviceName(rule.output.channel);
        
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
            // Silent success
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
        if (!this.generatedScript) {
            return;
        }
        
        let finalFileName = this.fileName.trim();
        if (!finalFileName) {
            finalFileName = this.getFormattedDate();
        }
        
        if (!finalFileName.endsWith('.sbr')) {
            finalFileName += '.sbr';
        }
        
        const plistContent = this.generatePlistContent(this.generatedScript);
        
        const blob = new Blob([plistContent], { type: 'application/xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = finalFileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    downloadAsJson() {
        if (!this.generatedScript) {
            return;
        }
        
        let finalFileName = this.fileName.trim();
        if (!finalFileName) {
            finalFileName = this.getFormattedDate();
        }
        
        if (!finalFileName.endsWith('.json')) {
            finalFileName += '.json';
        }
        
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