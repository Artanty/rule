import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StorageService, DeviceMapEntry, CcLibraryEntry, TriggerMapping } from '../services/storage.service';
import { RuleStoreService } from './services/rule-store.service';
import { RuleParserService } from './services/rule-parser.service';
import { RuleNameGeneratorService } from './services/rule-name-generator.service';
import { Rule, createDefaultRule } from './models/rule.model';

@Component({
    selector: 'app-streambyter',
    templateUrl: './streambyter.component.html',
    styleUrls: ['./streambyter.component.scss'],
    standalone: false,
})
export class StreambyterComponent implements OnInit, OnDestroy {
    generatedScript: string = '';
    showGenerated: boolean = false;
    fileName: string = '';
    
    // UI Toggles
    showDelayInput: boolean = false;
    wideRuleNames: boolean = false;
    
    triggerMappings: TriggerMapping[] = [];
    consumerMappings: TriggerMapping[] = [];
    deviceMap: DeviceMapEntry[] = [];
    ccLibrary: { [channel: string]: CcLibraryEntry[] } = {};
    
    openMappingsEditor: boolean = false;
    importFileInputId = 'importRulesInput';
    
    private subscriptions: Subscription[] = [];
    
    constructor(
        private storageService: StorageService,
        private cdr: ChangeDetectorRef,
        public ruleStore: RuleStoreService,
        private ruleParser: RuleParserService,
        private nameGenerator: RuleNameGeneratorService
    ) {}
    
    ngOnInit() {
        this.loadMidiMaps();
        this.loadTriggerMappings();
        this.loadConsumerMappings();
        
        // Update UI settings in store
        this.ruleStore.setUiSettings({
            showDelayInput: this.showDelayInput,
            wideRuleNames: this.wideRuleNames
        });
        
        // Load example rules on init
        this.loadExample();
    }
    
    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
    
    loadMidiMaps() {
        this.deviceMap = this.storageService.getDeviceMap();
        this.ccLibrary = this.storageService.getCcLibrary();
    }
    
    loadTriggerMappings() {
        this.triggerMappings = this.storageService.getTriggerMappings();
        this.ruleStore.setTriggerMappings(this.triggerMappings);
    }
    
    loadConsumerMappings() {
        this.consumerMappings = this.storageService.getConsumerMappings();
    }
    
    refreshMaps() {
        this.loadMidiMaps();
        this.loadTriggerMappings();
        this.loadConsumerMappings();
        this.cdr.detectChanges();
    }
    
    generateStreamByterScript() {
        const rules = this.ruleStore.getRules();
        this.generatedScript = this.ruleParser.generateStreamByterScript(rules, this.fileName);
        this.showGenerated = true;
        this.cdr.detectChanges();
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
                                const rules = this.ruleParser.parseStreamByterScript(scriptContent, this.triggerMappings);
                                this.ruleStore.loadRules(rules);
                                this.cdr.detectChanges();
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
                    this.ruleStore.loadRules(json.rules);
                } else if (json.script) {
                    const rules = this.ruleParser.parseStreamByterScript(json.script, this.triggerMappings);
                    this.ruleStore.loadRules(rules);
                }
                this.cdr.detectChanges();
            } catch (ex) {
                console.error('Error parsing JSON file:', ex);
            }
        };
        reader.readAsText(file);
    }
    
    loadExample() {
        const exampleRules: Rule[] = [
            {
                name: "CC to Note",
                enabled: true,
                type: 'standard',
                customCode: '',
                collapsed: true,
                selected: false,
                showMappingSelector: false,
                selectedMappingRuleKey: undefined,
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
                showMappingSelector: false,
                selectedMappingRuleKey: undefined,
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
        this.ruleStore.loadRules(exampleRules);
        this.fileName = '';
    }
    
    clearRules() {
        this.ruleStore.clearRules();
        this.showGenerated = false;
        this.generatedScript = '';
        this.fileName = '';
    }
    
    addRule() {
        this.ruleStore.addRule();
    }
    
    addCustomRule() {
        this.ruleStore.addCustomRule();
    }
    
    generateNamesForSelected() {
        this.ruleStore.generateNamesForSelected(this.nameGenerator);
    }
    
    applyBulkMapping(mappingName: string) {
        if (!mappingName || mappingName === 'null') return;
        const mapping = this.triggerMappings.find(m => m.name === mappingName);
        if (!mapping) return;
        
        const rules = this.ruleStore.getRules();
        for (let i = 0; i < rules.length; i++) {
            if (rules[i].type === 'standard' && rules[i].selected) {
                this.ruleStore.updateTriggerSource(i, `mapping:${mapping.name}`, this.triggerMappings);
            }
        }
    }
    
    onShowDelayInputChange() {
        this.ruleStore.setUiSettings({
            showDelayInput: this.showDelayInput,
            wideRuleNames: this.wideRuleNames
        });
    }
    
    onWideRuleNamesChange() {
        this.ruleStore.setUiSettings({
            showDelayInput: this.showDelayInput,
            wideRuleNames: this.wideRuleNames
        });
    }
    
    copyToClipboard() {
        navigator.clipboard.writeText(this.generatedScript).then(() => {
            // Success - silent
        }).catch(() => {
            console.error('Failed to copy script');
        });
    }
    
    downloadScript() {
        if (!this.generatedScript) return;
        let finalFileName = this.fileName.trim() || this.getFormattedDate();
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
        let finalFileName = this.fileName.trim() || this.getFormattedDate();
        if (!finalFileName.endsWith('.json')) finalFileName += '.json';
        const jsonContent = {
            script: this.generatedScript,
            generated: new Date().toISOString(),
            rulesCount: this.ruleStore.getRules().length,
            deviceMap: this.deviceMap
        };
        const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = finalFileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    private generatePlistContent(script: string): string {
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
    
    private getFormattedDate(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}__${hours}-${minutes}`;
    }
    
    triggerFileInput() {
        const input = document.getElementById(this.importFileInputId) as HTMLInputElement;
        if (input) input.click();
    }
    getSelectedRulesCount(): number {
        return this.ruleStore.getSelectedRulesCount();
    }
}