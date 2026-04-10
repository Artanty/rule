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
    
    // ========== НОВЫЕ МЕТОДЫ ==========
    
    /**
     * Генерация умного имени на основе настроек правила
     */
    generateSmartName(rule: Rule): string {
        const targetDev = this.getDeviceName(rule.output.channel);
        let targetParam = '';
        
        if (rule.output.type === 'cc') {
            targetParam = this.getParamName(rule.output.channel, 'cc', rule.output.ccNumber);
        } else if (rule.output.type === 'program') {
            targetParam = `Program ${rule.output.program}`;
        } else if (rule.output.type === 'note') {
            targetParam = this.getParamName(rule.output.channel, 'note', rule.output.note);
        } else {
            targetParam = 'message';
        }
        
        const srcDev = this.getDeviceName(rule.trigger.channel);
        
        // Добавляем информацию о значении/velocity если нужно
        let valueInfo = '';
        if (rule.output.type === 'cc' && rule.output.valueMode === 'constant') {
            valueInfo = ` = ${rule.output.constantValue}`;
        } else if (rule.output.type === 'note' && rule.output.velocityMode === 'constant') {
            valueInfo = ` vel=${rule.output.velocity}`;
        }
        
        return `set [${targetDev}] ${targetParam}${valueInfo} from [${srcDev}]`;
    }
    
    /**
     * Генерация имени на основе действия (более детальная)
     */
    generateActionBasedName(rule: Rule): string {
        const parts: string[] = [];
        
        // Что делает (действие)
        if (rule.output.type === 'cc') {
            const paramName = this.getParamName(rule.output.channel, 'cc', rule.output.ccNumber);
            parts.push(`${paramName}`);
            if (rule.output.valueMode === 'constant') {
                parts.push(`=${rule.output.constantValue}`);
            } else {
                parts.push(`← trigger`);
            }
        } else if (rule.output.type === 'note') {
            const paramName = this.getParamName(rule.output.channel, 'note', rule.output.note);
            parts.push(`${paramName}`);
            if (rule.output.velocityMode === 'constant') {
                parts.push(`vel=${rule.output.velocity}`);
            } else {
                parts.push(`vel←trigger`);
            }
        } else if (rule.output.type === 'program') {
            parts.push(`PGM${rule.output.program}`);
            if (rule.output.bank > 0) parts.push(`bank${rule.output.bank}`);
        }
        
        // Когда срабатывает (триггер)
        if (rule.trigger.type === 'noteOn') {
            if (rule.trigger.noteMode === 'specific') {
                const noteName = this.getParamName(rule.trigger.channel, 'note', rule.trigger.specificNote);
                parts.unshift(`${noteName}→`);
            } else {
                parts.unshift(`Any Note→`);
            }
        } else if (rule.trigger.type === 'controlChange') {
            const ccName = this.getParamName(rule.trigger.channel, 'cc', rule.trigger.ccNumber);
            if (rule.trigger.valueMode === 'specific') {
                parts.unshift(`${ccName}=${rule.trigger.specificValue}→`);
            } else {
                parts.unshift(`${ccName}→`);
            }
        }
        
        // Добавляем устройство если разное
        const srcDev = this.getDeviceName(rule.trigger.channel);
        const dstDev = this.getDeviceName(rule.output.channel);
        
        if (srcDev !== dstDev) {
            parts.unshift(`[${srcDev}→${dstDev}]`);
        }
        
        let result = parts.join(' ');
        // Ограничиваем длину имени
        if (result.length > 60) {
            result = result.substring(0, 57) + '...';
        }
        return result;
    }
    
    /**
     * Генерация имени для правила по индексу
     */
    generateNameForRule(index: number) {
        if (this.rules[index]) {
            // Используем action-based name для более информативного имени
            const newName = this.generateActionBasedName(this.rules[index]);
            this.rules[index].name = newName;
            this.showButtonFeedback('generate', index);
        }
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
        // Находим карточку правила
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
    
    // ========== КОНЕЦ НОВЫХ МЕТОДОВ ==========
    
    generateStreamByterScript() {
        const lines: string[] = [];
        
        lines.push('# StreamByter Script generated by MIDI Messenger');
        lines.push(`# Generated: ${new Date().toLocaleString()}`);
        lines.push(`# Total rules: ${this.rules.length}`);
        lines.push('');
        
        // Добавляем информацию о MIDI картах в комментарии
        if (this.deviceMap.length > 0) {
            lines.push('# ========== MIDI DEVICE MAP ==========');
            this.deviceMap.forEach(device => {
                lines.push(`# ${device.device} -> Channel ${device.midiChannel}`);
            });
            lines.push('');
        }
        
        const enabledRules = this.rules.filter(r => r.enabled);
        
        if (enabledRules.length === 0) {
            lines.push('# No enabled rules');
            this.generatedScript = lines.join('\n');
            this.showGenerated = true;
            return;
        }
        
        // INITIALIZATION section (IF LOAD)
        lines.push('# ========== INITIALIZATION ==========');
        lines.push('IF LOAD');
        
        enabledRules.forEach((rule, index) => {
            const triggerDev = this.getDeviceName(rule.trigger.channel);
            const outputDev = this.getDeviceName(rule.output.channel);
            lines.push(`  # Rule ${index + 1}: ${rule.name} (${triggerDev} -> ${outputDev})`);
            lines.push(`  ASS K${index} = 0`);
        });
        
        lines.push('END');
        lines.push('');
        
        // RULES section
        enabledRules.forEach((rule, index) => {
            const triggerDev = this.getDeviceName(rule.trigger.channel);
            const outputDev = this.getDeviceName(rule.output.channel);
            
            lines.push(`# ========== RULE ${index + 1}: ${rule.name} ==========`);
            lines.push(`# ${triggerDev} -> ${outputDev}`);
            
            const ruleLine = this.generateStreamByterIRule(rule);
            if (ruleLine) {
                lines.push(ruleLine);
            }
            
            lines.push('');
        });
        
        this.generatedScript = lines.join('\n');
        this.showGenerated = true;
    }
    
    private generateStreamByterIRule(rule: Rule): string {
        let triggerPattern = '';
        
        if (rule.trigger.type === 'noteOn') {
            const channelNibble = (rule.trigger.channel - 1).toString(16).toUpperCase();
            triggerPattern = `9${channelNibble}`;
            
            if (rule.trigger.noteMode === 'specific') {
                const noteHex = rule.trigger.specificNote.toString(16).toUpperCase().padStart(2, '0');
                triggerPattern += ` ${noteHex}`;
            } else {
                triggerPattern += ` XX`;
            }
            
            triggerPattern += ` XX`;
        } 
        else if (rule.trigger.type === 'controlChange') {
            const channelNibble = (rule.trigger.channel - 1).toString(16).toUpperCase();
            triggerPattern = `B${channelNibble}`;
            
            const ccHex = rule.trigger.ccNumber.toString(16).toUpperCase().padStart(2, '0');
            triggerPattern += ` ${ccHex}`;
            
            if (rule.trigger.valueMode === 'specific') {
                const valueHex = rule.trigger.specificValue.toString(16).toUpperCase().padStart(2, '0');
                triggerPattern += ` ${valueHex}`;
            } else {
                triggerPattern += ` XX`;
            }
        }
        
        let outputPattern = '';
        let flags = '';
        
        if (rule.output.type === 'cc') {
            const channelNibble = (rule.output.channel - 1).toString(16).toUpperCase();
            outputPattern = `B${channelNibble}`;
            
            const ccHex = rule.output.ccNumber.toString(16).toUpperCase().padStart(2, '0');
            outputPattern += ` ${ccHex}`;
            
            if (rule.output.valueMode === 'constant') {
                const valueHex = rule.output.constantValue.toString(16).toUpperCase().padStart(2, '0');
                outputPattern += ` ${valueHex}`;
            } else {
                outputPattern += ` XX`;
            }
        } 
        else if (rule.output.type === 'note') {
            const channelNibble = (rule.output.channel - 1).toString(16).toUpperCase();
            outputPattern = `9${channelNibble}`;
            
            const noteHex = rule.output.note.toString(16).toUpperCase().padStart(2, '0');
            outputPattern += ` ${noteHex}`;
            
            if (rule.output.velocityMode === 'constant') {
                const velocityHex = rule.output.velocity.toString(16).toUpperCase().padStart(2, '0');
                outputPattern += ` ${velocityHex}`;
            } else {
                outputPattern += ` XX`;
            }
        } 
        else if (rule.output.type === 'program') {
            const channelNibble = (rule.output.channel - 1).toString(16).toUpperCase();
            outputPattern = `C${channelNibble}`;
            
            const programHex = rule.output.program.toString(16).toUpperCase().padStart(2, '0');
            outputPattern += ` ${programHex}`;
        }
        
        if (rule.trigger.consume === 'eat') {
            flags = ' +B';
        }
        
        if (rule.output.delayMs > 0) {
            flags += ` +D${rule.output.delayMs}`;
        }
        
        if (rule.trigger.valueMode === 'any' && rule.output.valueMode === 'trigger') {
            flags += ' +C';
        }
        
        return `${triggerPattern} = ${outputPattern}${flags}`;
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