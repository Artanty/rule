import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, DeviceMapEntry, CcLibraryEntry } from '../services/storage.service';

interface Rule {
    name: string;
    enabled: boolean;
    output: {
        type: 'cc' | 'program' | 'note';
        channel: number;
        ccNumber: number;
        valueMode: 'constant' | 'trigger';
        constantValue: number;
        bank: number;
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
        valueMode: 'specific' | 'any';
        specificValue: number;
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
    
    // MIDI карты из Rules Editor
    deviceMap: DeviceMapEntry[] = [];
    ccLibrary: { [channel: string]: CcLibraryEntry[] } = {};
    
    importFileInputId = 'importRulesInput';
    
    // Доступные каналы для выбора
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    exampleRules: Rule[] = [
        {
            name: "CC to Note",
            enabled: true,
            output: {
                type: "note",
                channel: 1,
                ccNumber: 0,
                valueMode: "constant",
                constantValue: 0,
                bank: 0,
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
                consume: "eat"
            }
        },
        {
            name: "Note Velocity Scale",
            enabled: true,
            output: {
                type: "cc",
                channel: 2,
                ccNumber: 11,
                valueMode: "trigger",
                constantValue: 0,
                bank: 0,
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
                consume: "pass"
            }
        }
    ];
    
    constructor(private storageService: StorageService) {}
    
    ngOnInit() {
        this.loadMidiMaps();
    }
    
    loadMidiMaps() {
        this.deviceMap = this.storageService.getDeviceMap();
        this.ccLibrary = this.storageService.getCcLibrary();
        console.log('Loaded device map:', this.deviceMap);
        console.log('Loaded CC library:', this.ccLibrary);
    }
    
    // ========== Методы для получения имен из карт ==========
    
    getDeviceName(channel: number): string {
        return this.storageService.getDeviceName(channel);
    }
    
    getParamName(channel: number, type: 'cc' | 'note', value: number): string {
        return this.storageService.getParamName(channel, type, value);
    }
    
    // Получаем список опций для CC селекта
    getCcOptions(channel: number, currentValue?: number): { value: number; label: string }[] {
        const chStr = String(channel);
        let entries: CcLibraryEntry[] = [];
        
        if (this.ccLibrary[chStr]) {
            entries = this.ccLibrary[chStr].filter(e => e.type === 'cc');
        }
        
        if (entries.length === 0) {
            // Если нет карты для этого канала, показываем стандартные CC#0-127
            for (let i = 0; i <= 127; i++) {
                entries.push({ name: `CC#${i}`, value: i, type: 'cc' });
            }
        }
        
        return entries.map(e => ({
            value: e.value,
            label: `${e.name} (${e.value})`
        }));
    }
    
    // Получаем список опций для Note селекта
    getNoteOptions(channel: number, currentValue?: number): { value: number; label: string }[] {
        const chStr = String(channel);
        let entries: CcLibraryEntry[] = [];
        
        if (this.ccLibrary[chStr]) {
            entries = this.ccLibrary[chStr].filter(e => e.type === 'note');
        }
        
        if (entries.length === 0) {
            // Если нет карты для этого канала, показываем стандартные Note#0-127
            for (let i = 0; i <= 127; i++) {
                entries.push({ name: `Note#${i}`, value: i, type: 'note' });
            }
        }
        
        return entries.map(e => ({
            value: e.value,
            label: `${e.name} (${e.value})`
        }));
    }
    
    // Обновляем карты (например, после импорта)
    refreshMaps() {
        this.loadMidiMaps();
    }
    
    triggerFileInput() {
        const input = document.getElementById(this.importFileInputId) as HTMLInputElement;
        if (input) input.click();
    }
    
    loadExample() {
        this.rules = JSON.parse(JSON.stringify(this.exampleRules));
    }
    
    clearRules() {
        this.rules = [];
        this.showGenerated = false;
        this.generatedScript = '';
        this.fileName = '';
    }
    
    addRule() {
        const newRule: Rule = {
            name: "New Rule",
            enabled: true,
            output: {
                type: "cc",
                channel: 1,
                ccNumber: 0,
                valueMode: "constant",
                constantValue: 0,
                bank: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: "constant",
                delayMs: 0
            },
            trigger: {
                type: "noteOn",
                channel: 1,
                noteMode: "specific",
                specificNote: 60,
                ccNumber: 0,
                valueMode: "any",
                specificValue: 0,
                consume: "eat"
            }
        };
        this.rules.push(newRule);
    }
    
    deleteRule(index: number) {
        if (confirm(`Delete rule "${this.rules[index].name}"?`)) {
            this.rules.splice(index, 1);
            this.showButtonFeedback('delete', index);
        }
    }
    
    // ========== МЕТОДЫ ГЕНЕРАЦИИ ИМЕН ==========
    
    /**
     * Получение имени параметра из карты (для триггера)
     */
    getTriggerParamName(rule: Rule): string {
        if (rule.trigger.type === 'controlChange') {
            const ccNumber = Number(rule.trigger.ccNumber); // Ensure it's a number
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
    
    /**
     * Получение имени параметра из карты (для выхода)
     */
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
    
    /**
     * Генерация имени для правила
     */
    generateNameForRule(index: number) {
        if (this.rules[index]) {
            const rule = this.rules[index];
            const srcDev = this.getDeviceName(rule.trigger.channel);
            const dstDev = this.getDeviceName(rule.output.channel);
            
            const srcParam = this.getTriggerParamName(rule);
            const dstParam = this.getOutputParamName(rule);
            
            let newName = `[${srcDev}] ${srcParam} → [${dstDev}] ${dstParam}`;
            
            // Add constant value info if needed
            if (rule.output.type === 'cc' && rule.output.valueMode === 'constant') {
                newName += ` = ${rule.output.constantValue}`;
            } else if (rule.output.type === 'note' && rule.output.velocityMode === 'constant') {
                newName += ` vel=${rule.output.velocity}`;
            }
            
            this.rules[index].name = newName;
            this.showButtonFeedback('generate', index);
        }
    }
    
    /**
     * Генерация комментария для правила в скрипте
     */
    generateRuleComment(rule: Rule, index: number): string {
        const srcDev = this.getDeviceName(rule.trigger.channel);
        const dstDev = this.getDeviceName(rule.output.channel);
        
        const srcParam = this.getTriggerParamName(rule);
        const dstParam = this.getOutputParamName(rule);
        
        let action = '→';
        if (rule.output.type === 'cc' && rule.output.valueMode === 'constant') {
            action = ` = ${rule.output.constantValue}`;
        } else if (rule.output.type === 'note' && rule.output.velocityMode === 'constant') {
            action = ` vel=${rule.output.velocity}`;
        }
        
        return `# == RULE ${index + 1}: [${srcDev}] ${srcParam} → [${dstDev}] ${dstParam} ${action} ==`;
    }
    
    /**
     * Дублирование правила
     */
    duplicateRule(index: number) {
        const original = this.rules[index];
        const copy = JSON.parse(JSON.stringify(original));
        copy.name = `${original.name} (copy)`;
        
        this.rules.splice(index + 1, 0, copy);
        this.showButtonFeedback('duplicate', index);
    }
    
    /**
     * Визуальная обратная связь для кнопок
     */
    private showButtonFeedback(action: string, index: number) {
        const cards = document.querySelectorAll('.rule-card');
        const targetCard = cards[index] as HTMLElement;
        
        if (targetCard) {
            let targetButton: HTMLElement | null = null;
            
            if (action === 'generate') {
                targetButton = targetCard.querySelector('.btn-generate') as HTMLElement;
            } else if (action === 'duplicate') {
                targetButton = targetCard.querySelector('.btn-duplicate') as HTMLElement;
            } else if (action === 'delete') {
                targetButton = targetCard.querySelector('.btn-delete') as HTMLElement;
            }
            
            if (targetButton) {
                const originalText = targetButton.textContent || '';
                const feedbackText = action === 'generate' ? '✓ done!' : 
                    action === 'duplicate' ? '✓ copied!' : 
                        action === 'delete' ? '✓ deleted!' : '✓ done!';
                
                targetButton.textContent = feedbackText;
                setTimeout(() => {
                    targetButton!.textContent = originalText;
                }, 800);
            }
        }
    }
    
    // ========== ГЕНЕРАЦИЯ STREAMBYTER SCRIPT ==========
    
    generateStreamByterScript() {
        const lines: string[] = [];
        
        lines.push('# StreamByter Script generated by MIDI Messenger');
        lines.push(`# Generated: ${new Date().toLocaleString()}`);
        lines.push('');
        
        const enabledRules = this.rules.filter(r => r.enabled);
        
        if (enabledRules.length === 0) {
            lines.push('# No enabled rules');
            this.generatedScript = lines.join('\n');
            this.showGenerated = true;
            return;
        }
        
        // RULES section
        enabledRules.forEach((rule, index) => {
            const srcParam = this.getTriggerParamName(rule);
            const dstParam = this.getOutputParamName(rule);
            const srcDev = this.getDeviceName(rule.trigger.channel);
            const dstDev = this.getDeviceName(rule.output.channel);
            
            lines.push(`# == RULE ${index + 1}: [${srcDev}] ${srcParam} → [${dstDev}] ${dstParam} ==`);
            
            const ruleLines = this.generateStreamByterIIRule(rule);
            if (ruleLines) {
                lines.push(...ruleLines);
            }
            
            lines.push('');
        });
        
        this.generatedScript = lines.join('\n');
        this.showGenerated = true;
    }
    
    private generateStreamByterIIRule(rule: Rule): string[] {
        const lines: string[] = [];
        let condition = '';
    
        // Helper function to convert decimal to hex string WITHOUT padding for channel
        const toHex = (value: any, padding: number = 2): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return num.toString(16).toUpperCase().padStart(padding, '0');
        };
    
        // Helper for channel hex (no padding)
        const toChannelHex = (channel: number): string => {
            const channelNum = typeof channel === 'string' ? parseInt(channel, 10) : channel;
            return (channelNum - 1).toString(16).toUpperCase();
        };
    
        // Build the IF condition based on trigger type
        if (rule.trigger.type === 'controlChange') {
            const triggerChannelHex = toChannelHex(rule.trigger.channel);
            const ccHex = toHex(rule.trigger.ccNumber);
        
            if (rule.trigger.valueMode === 'specific') {
                const valueHex = toHex(rule.trigger.specificValue);
                condition = `IF M0 == B${triggerChannelHex} ${ccHex} ${valueHex}`;
            } else {
                condition = `IF M0 == B${triggerChannelHex} ${ccHex}`;
            }
        } 
        else if (rule.trigger.type === 'noteOn') {
            const triggerChannelHex = toChannelHex(rule.trigger.channel);
            if (rule.trigger.noteMode === 'specific') {
                const noteHex = toHex(rule.trigger.specificNote);
                condition = `IF M0 == 9${triggerChannelHex} ${noteHex}`;
            } else {
                condition = `IF M0 >= 0x90 && M0 <= 0x9F`;
            }
        }
    
        if (!condition) return lines;
    
        lines.push(condition);
    
        // Build the SND command for output
        if (rule.output.type === 'cc') {
            const outputChannelHex = toChannelHex(rule.output.channel);
            const ccHex = toHex(rule.output.ccNumber);
        
            lines.push(`  ASS M0 = B${outputChannelHex}`);
            lines.push(`  ASS M1 = ${ccHex}`);
        
            // Only set M2 if constant value, otherwise keep original
            if (rule.output.valueMode === 'constant') {
                const valueHex = toHex(rule.output.constantValue);
                lines.push(`  ASS M2 = ${valueHex}`);
            }
            // If trigger mode, don't set M2 - keep original value
        
        } 
        else if (rule.output.type === 'note') {
            const outputChannelHex = toChannelHex(rule.output.channel);
            const noteHex = toHex(rule.output.note);
        
            lines.push(`  ASS M0 = 9${outputChannelHex}`);
            lines.push(`  ASS M1 = ${noteHex}`);
        
            if (rule.output.velocityMode === 'constant') {
                const velocityHex = toHex(rule.output.velocity);
                lines.push(`  ASS M2 = ${velocityHex}`);
            }
            // If trigger mode, don't set M2 - keep original velocity
        
        } 
        else if (rule.output.type === 'program') {
            const outputChannelHex = toChannelHex(rule.output.channel);
            const programHex = toHex(rule.output.program);
        
            lines.push(`  ASS M0 = C${outputChannelHex}`);
            lines.push(`  ASS M1 = ${programHex}`);
        }
    
        const delayFlag = rule.output.delayMs > 0 ? ` +D${rule.output.delayMs}` : '';
        lines.push(`  SND M0 M1 M2${delayFlag}`);
    
        // Only block if consume is 'eat'
        if (rule.trigger.consume === 'eat') {
            lines.push(`  BLOCK`);
        }
    
        lines.push(`END`);
    
        return lines;
    }
    
    copyToClipboard() {
        navigator.clipboard.writeText(this.generatedScript).then(() => {
            alert('Script copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy script');
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
            alert('Please generate a script first!');
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
            alert('Please generate a script first!');
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
    
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json.rules) {
                    this.rules = this.convertFromExternal(json.rules);
                    alert(`Loaded ${this.rules.length} rules from file!`);
                }
            } catch (ex) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        input.value = '';
    }
    
    private convertFromExternal(externalRules: any[]): Rule[] {
        return externalRules.map(ext => ({
            name: ext.name || 'Imported Rule',
            enabled: ext.enabled !== false,
            output: {
                type: 'cc',
                channel: 1,
                ccNumber: 0,
                valueMode: 'constant',
                constantValue: 0,
                bank: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: 'constant',
                delayMs: 0
            },
            trigger: {
                type: 'noteOn',
                channel: 1,
                noteMode: 'any',
                specificNote: 60,
                ccNumber: 0,
                valueMode: 'any',
                specificValue: 0,
                consume: 'eat'
            }
        }));
    }
}