import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, DeviceMapEntry, CcLibraryEntry } from '../services/storage.service';

interface Rule {
    name: string;
    enabled: boolean;
    type: 'standard' | 'custom';
    customCode?: string;
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
    
    // MIDI карты из Rules Editor
    deviceMap: DeviceMapEntry[] = [];
    ccLibrary: { [channel: string]: CcLibraryEntry[] } = {};
    
    importFileInputId = 'importRulesInput';
    
    // Доступные каналы для выбора
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    // Override trigger channel
    overrideTriggerChannel: number | null = null;
    // Store original trigger channel for display in comments
    originalTriggerChannel: Map<number, number> = new Map();
    
    exampleRules: Rule[] = [
        {
            name: "CC to Note",
            enabled: true,
            type: 'standard',
            customCode: '',
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
                rangeMin: 0,
                rangeMax: 127,
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
        this.overrideTriggerChannel = null;
        this.originalTriggerChannel.clear();
        this.fileName = '';
    }
    
    clearRules() {
        this.rules = [];
        this.showGenerated = false;
        this.generatedScript = '';
        this.fileName = '';
        this.overrideTriggerChannel = null;
        this.originalTriggerChannel.clear();
    }
    
    addRule() {
        const newRule: Rule = {
            name: "New Rule",
            enabled: true,
            type: 'standard',
            customCode: '',
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
    }
    
    addCustomRule() {
        const newRule: Rule = {
            name: "Custom Rule",
            enabled: true,
            type: 'custom',
            customCode: '# Write your custom StreamByter code here\n# Example:\n# IF M0 == B0 07\n#   SND M0 M1 7F\n# END',
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
        if (this.rules[index] && this.rules[index].type === 'standard') {
            const rule = this.rules[index];
            const srcDev = this.getDeviceName(rule.trigger.channel);
            const dstDev = this.getDeviceName(rule.output.channel);
            
            const srcParam = this.getTriggerParamName(rule);
            const dstParam = this.getOutputParamName(rule);
            
            let newName = `[${srcDev}] ${srcParam} → [${dstDev}] ${dstParam}`;
            
            // Add range or specific value info if needed
            if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
                newName += ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
            } else if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'specific') {
                newName += ` = ${rule.trigger.specificValue}`;
            }
            
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
        
        // Add range information to comment if applicable
        let rangeInfo = '';
        if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
            rangeInfo = ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
        } else if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'specific') {
            rangeInfo = ` = ${rule.trigger.specificValue}`;
        }
        
        return `# == RULE ${index + 1}: [${srcDev}] ${srcParam}${rangeInfo} → [${dstDev}] ${dstParam} ${action} ==`;
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
        const cards = document.querySelectorAll('.rule-item');
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
    
    // ========== ИМПОРТ ИЗ ФАЙЛОВ ==========
    
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        
        const file = input.files[0];
        const fileName = file.name;
        
        // Extract base filename without extension for the script name input
        const baseFileName = fileName.replace(/\.(sbr|json)$/i, '');
        this.fileName = baseFileName;
        
        if (fileName.endsWith('.sbr')) {
            this.importSbrFile(file);
        } else if (fileName.endsWith('.json')) {
            this.importJsonFile(file);
        } else {
            alert('Please select a .sbr or .json file');
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
                                this.parseStreamByterScript(scriptContent);
                                alert(`Successfully imported ${this.rules.length} rules from .sbr file!`);
                                return;
                            }
                        }
                    }
                }
                throw new Error('Could not find StreamByter-Rules in plist');
            } catch (ex) {
                console.error('Error parsing .sbr file:', ex);
                alert('Error parsing .sbr file. Make sure it\'s a valid StreamByter preset file.');
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
                    alert(`Loaded ${this.rules.length} rules from JSON file!`);
                } else if (json.script) {
                    this.parseStreamByterScript(json.script);
                    alert(`Successfully imported ${this.rules.length} rules from JSON script!`);
                } else {
                    alert('Invalid JSON format');
                }
            } catch (ex) {
                alert('Error parsing JSON file');
            }
        };
        reader.readAsText(file);
    }
    
    private parseStreamByterScript(script: string) {
        this.rules = [];
        let overrideOriginalChannel: number | null = null;
        let overrideNewChannel: number | null = null;

        const lines = script.split('\n');

        // Parse override information from header FIRST
        for (const line of lines) {
            const overrideMatch = line.match(/# Override trigger channel: \[(\d+)->(\d+)\]/);
            if (overrideMatch) {
                overrideOriginalChannel = parseInt(overrideMatch[1], 10);
                overrideNewChannel = parseInt(overrideMatch[2], 10);
                this.overrideTriggerChannel = overrideNewChannel;
                break;
            }
        }
    
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
        
            // Check for CUSTOM_RULE marker
            if (line === '# == CUSTOM_RULE ==') {
                const rule = this.createDefaultRule();
                rule.type = 'custom';
                rule.enabled = true;
            
                // Collect all lines until next rule marker or end of file
                let customCodeLines: string[] = [];
                i++;
            
                while (i < lines.length) {
                    const currentLine = lines[i];
                    // Stop if we encounter another rule marker
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
        
            // Check for range condition with nested IF (hex values)
            const rangeMatch = line.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})/i);
            if (rangeMatch) {
                const rule = this.createDefaultRule();
                rule.type = 'standard';
                const parsedChannel = parseInt(rangeMatch[1], 16) + 1;
                const triggerCC = parseInt(rangeMatch[2], 16);
            
                rule.trigger.type = 'controlChange';
                rule.trigger.ccNumber = triggerCC;
                // Default to 'eat', will be updated if BLOCK is found
                rule.trigger.consume = 'eat';
            
                // If we have an override and the parsed channel matches the overridden channel
                if (overrideOriginalChannel !== null && overrideNewChannel !== null && parsedChannel === overrideNewChannel) {
                    rule.trigger.channel = overrideOriginalChannel;
                } else {
                    rule.trigger.channel = parsedChannel;
                }
            
                let j = i + 1;
                let foundEnd = false;
                let rangeMin: number | null = null;
                let rangeMax: number | null = null;
                let nestedLevel = 1;
                let hasBlock = false;
            
                // Parse nested IF statements for range
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                
                    // Check for M2 >= value (supports both decimal and hex)
                    const minMatch = currentLine.match(/IF\s+M2\s*>=\s*(?:0x)?([0-9A-F]+)/i);
                    if (minMatch && rangeMin === null) {
                        rangeMin = parseInt(minMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                
                    // Check for M2 <= value (supports both decimal and hex)
                    const maxMatch = currentLine.match(/IF\s+M2\s*<=\s*(?:0x)?([0-9A-F]+)/i);
                    if (maxMatch && rangeMax === null) {
                        rangeMax = parseInt(maxMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                
                    // Parse output assignments
                    const assM0Match = currentLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0Match) {
                        rule.output.channel = parseInt(assM0Match[1], 16) + 1;
                    }
                
                    const assM1Match = currentLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        rule.output.type = 'cc';
                    }
                
                    const assM2Match = currentLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        rule.output.valueMode = 'constant';
                        rule.output.constantValue = parseInt(assM2Match[1], 16);
                    }
                
                    // Check for BLOCK command
                    if (currentLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                
                    // Count END statements
                    if (currentLine.match(/^END$/i)) {
                        nestedLevel--;
                        if (nestedLevel === 0) {
                            foundEnd = true;
                            break;
                        }
                    }
                
                    j++;
                }
            
                // Set consume based on whether BLOCK was found
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
            
                // Set range values if found
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
        
            // Check for simple condition with specific value (hex)
            const ifMatch = line.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})\s+([0-9A-F]{2})/i);
            if (ifMatch) {
                const rule = this.createDefaultRule();
                rule.type = 'standard';
                const parsedChannel = parseInt(ifMatch[1], 16) + 1;
                const triggerCC = parseInt(ifMatch[2], 16);
                const specificValue = parseInt(ifMatch[3], 16);
            
                rule.trigger.type = 'controlChange';
                rule.trigger.ccNumber = triggerCC;
                rule.trigger.valueMode = 'specific';
                rule.trigger.specificValue = specificValue;
                // Default to 'eat', will be updated if BLOCK is found
                rule.trigger.consume = 'eat';
            
                // If we have an override and the parsed channel matches the overridden channel
                if (overrideOriginalChannel !== null && overrideNewChannel !== null && parsedChannel === overrideNewChannel) {
                    rule.trigger.channel = overrideOriginalChannel;
                } else {
                    rule.trigger.channel = parsedChannel;
                }
            
                let j = i + 1;
                let foundEnd = false;
                let hasBlock = false;
            
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                
                    const assM0Match = currentLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0Match) {
                        rule.output.channel = parseInt(assM0Match[1], 16) + 1;
                    }
                
                    const assM1Match = currentLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        rule.output.type = 'cc';
                    }
                
                    const assM2Match = currentLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        rule.output.valueMode = 'constant';
                        rule.output.constantValue = parseInt(assM2Match[1], 16);
                    }
                
                    // Check for BLOCK command
                    if (currentLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                
                    if (currentLine.match(/^END$/i)) {
                        foundEnd = true;
                        break;
                    }
                
                    j++;
                }
            
                // Set consume based on whether BLOCK was found
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
            
                rule.name = this.generateActionBasedName(rule);
                this.rules.push(rule);
                i = j;
                continue;
            }
        
            // Check for simple condition (any value)
            const anyMatch = line.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})$/i);
            if (anyMatch && !line.includes('0x') && !line.match(/B[0-9A-F]\s+[0-9A-F]{2}\s+[0-9A-F]{2}/)) {
                const rule = this.createDefaultRule();
                rule.type = 'standard';
                const parsedChannel = parseInt(anyMatch[1], 16) + 1;
                const triggerCC = parseInt(anyMatch[2], 16);
            
                rule.trigger.type = 'controlChange';
                rule.trigger.ccNumber = triggerCC;
                rule.trigger.valueMode = 'any';
                // Default to 'eat', will be updated if BLOCK is found
                rule.trigger.consume = 'eat';
            
                // If we have an override and the parsed channel matches the overridden channel
                if (overrideOriginalChannel !== null && overrideNewChannel !== null && parsedChannel === overrideNewChannel) {
                    rule.trigger.channel = overrideOriginalChannel;
                } else {
                    rule.trigger.channel = parsedChannel;
                }
            
                let j = i + 1;
                let foundEnd = false;
                let hasBlock = false;
            
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                
                    const assM0Match = currentLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0Match) {
                        rule.output.channel = parseInt(assM0Match[1], 16) + 1;
                    }
                
                    const assM1Match = currentLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        rule.output.ccNumber = parseInt(assM1Match[1], 16);
                        rule.output.type = 'cc';
                    }
                
                    const assM2Match = currentLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        rule.output.valueMode = 'constant';
                        rule.output.constantValue = parseInt(assM2Match[1], 16);
                    }
                
                    // Check for BLOCK command
                    if (currentLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                
                    if (currentLine.match(/^END$/i)) {
                        foundEnd = true;
                        break;
                    }
                
                    j++;
                }
            
                // Set consume based on whether BLOCK was found
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
            
                rule.name = this.generateActionBasedName(rule);
                this.rules.push(rule);
                i = j;
            }
        
            i++;
        }

        if (this.rules.length === 0) {
            alert('No rules could be parsed from the script. The script may use unsupported syntax.');
        }
    }
    
    private createDefaultRule(): Rule {
        return {
            name: "Imported Rule",
            enabled: true,
            type: 'standard',
            customCode: '',
            output: {
                type: "cc",
                channel: 1,
                ccNumber: 0,
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
        const srcDev = this.getDeviceName(rule.trigger.channel);
        const dstDev = this.getDeviceName(rule.output.channel);
        
        let srcParam = `CC${rule.trigger.ccNumber}`;
        let dstParam = `CC${rule.output.ccNumber}`;
        
        if (rule.trigger.type === 'controlChange') {
            const mappedName = this.getParamName(rule.trigger.channel, 'cc', rule.trigger.ccNumber);
            if (mappedName && !mappedName.startsWith('CC#')) {
                srcParam = mappedName;
            }
        }
        
        if (rule.output.type === 'cc') {
            const mappedName = this.getParamName(rule.output.channel, 'cc', rule.output.ccNumber);
            if (mappedName && !mappedName.startsWith('CC#')) {
                dstParam = mappedName;
            }
        }
        
        let result = `[${srcDev}] ${srcParam} → [${dstDev}] ${dstParam}`;
        
        // Add range info if applicable
        if (rule.trigger.valueMode === 'range') {
            result += ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
        } else if (rule.trigger.valueMode === 'specific') {
            result += ` = ${rule.trigger.specificValue}`;
        }
        
        return result;
    }
    
    // ========== ГЕНЕРАЦИЯ STREAMBYTER SCRIPT ==========
    
    generateStreamByterScript() {
        const lines: string[] = [];
        
        // Use filename as first line if provided, otherwise use default
        const scriptName = this.fileName.trim();
        if (scriptName) {
            lines.push(`# ${scriptName}`);
        } else {
            lines.push(`# StreamByter Script`);
        }
        
        lines.push(`# Generated: ${new Date().toLocaleString()}`);
        
        if (this.overrideTriggerChannel !== null && this.rules.length > 0) {
            // Show original channel from first rule (assuming all rules have same original channel)
            const originalChannel = this.rules[0].trigger.channel;
            lines.push(`# Override trigger channel: [${originalChannel}->${this.overrideTriggerChannel}]`);
        }
        
        lines.push('');
        
        const enabledRules = this.rules.filter(r => r.enabled);
        
        if (enabledRules.length === 0) {
            lines.push('# No enabled rules');
            this.generatedScript = lines.join('\n');
            this.showGenerated = true;
            return;
        }
        
        // RULES section
        let ruleCounter = 1;
        enabledRules.forEach((rule) => {
            if (rule.type === 'custom') {
                // Handle custom rule
                lines.push(`# == CUSTOM_RULE ==`);
                if (rule.customCode) {
                    // Split custom code by lines and add each line
                    const customLines = rule.customCode.split('\n');
                    for (const customLine of customLines) {
                        lines.push(customLine);
                    }
                }
                lines.push('');
            } else {
                // Handle standard rule
                const srcParam = this.getTriggerParamName(rule);
                const dstParam = this.getOutputParamName(rule);
                const srcDev = this.getDeviceName(rule.trigger.channel);
                const dstDev = this.getDeviceName(rule.output.channel);
                
                let rangeInfo = '';
                if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
                    rangeInfo = ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
                } else if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'specific') {
                    rangeInfo = ` = ${rule.trigger.specificValue}`;
                }
            
                lines.push(`# == RULE ${ruleCounter}: [${srcDev}] ${srcParam}${rangeInfo} → [${dstDev}] ${dstParam} ==`);
                
                // Apply override ONLY for the actual MIDI condition
                const processedRule = this.applyOverrideToRule(rule);
                const ruleLines = this.generateStreamByterIIRule(processedRule);
                if (ruleLines) {
                    lines.push(...ruleLines);
                }
                
                lines.push('');
                ruleCounter++;
            }
        });
        
        this.generatedScript = lines.join('\n');
        this.showGenerated = true;
    }
    
    private applyOverrideToRule(rule: Rule): Rule {
        if (this.overrideTriggerChannel === null) {
            return rule;
        }
        
        // Create a deep copy of the rule with overridden trigger channel
        const overriddenRule: Rule = JSON.parse(JSON.stringify(rule));
        overriddenRule.trigger.channel = this.overrideTriggerChannel;
        return overriddenRule;
    }
    
    private generateStreamByterIIRule(rule: Rule): string[] {
        const lines: string[] = [];
        
        // Helper function to convert decimal to hex string
        const toHex = (value: any, padding: number = 2): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return num.toString(16).toUpperCase().padStart(padding, '0');
        };
        
        // Helper for channel hex (no padding)
        const toChannelHex = (channel: number): string => {
            const channelNum = typeof channel === 'string' ? parseInt(channel, 10) : channel;
            return (channelNum - 1).toString(16).toUpperCase();
        };
        
        // Helper to convert decimal to hex for comparison (with 0x prefix for StreamByter)
        const toHexCompare = (value: any): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return `0x${num.toString(16).toUpperCase()}`;
        };
        
        // Build the IF condition based on trigger type
        if (rule.trigger.type === 'controlChange') {
            const triggerChannelHex = toChannelHex(rule.trigger.channel);
            const ccHex = toHex(rule.trigger.ccNumber);
            
            if (rule.trigger.valueMode === 'specific') {
                const valueHex = toHex(rule.trigger.specificValue);
                lines.push(`IF M0 == B${triggerChannelHex} ${ccHex} ${valueHex}`);
            } else if (rule.trigger.valueMode === 'range') {
                // Use hex values for comparison with 0x prefix
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
        
        // Build the SND command for output
        if (rule.output.type === 'cc') {
            const outputChannelHex = toChannelHex(rule.output.channel);
            const ccHex = toHex(rule.output.ccNumber);
            
            // Add indentation based on nesting level
            const indent = (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') ? '  ' : '';
            lines.push(`${indent}  ASS M0 = B${outputChannelHex}`);
            lines.push(`${indent}  ASS M1 = ${ccHex}`);
            
            // Only set M2 if constant value, otherwise keep original
            if (rule.output.valueMode === 'constant') {
                const valueHex = toHex(rule.output.constantValue);
                lines.push(`${indent}  ASS M2 = ${valueHex}`);
            }
            
        } 
        else if (rule.output.type === 'note') {
            const outputChannelHex = toChannelHex(rule.output.channel);
            const noteHex = toHex(rule.output.note);
            
            const indent = (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') ? '  ' : '';
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
            
            const indent = (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') ? '  ' : '';
            lines.push(`${indent}  ASS M0 = C${outputChannelHex}`);
            lines.push(`${indent}  ASS M1 = ${programHex}`);
        }
        
        const delayFlag = rule.output.delayMs > 0 ? ` +D${rule.output.delayMs}` : '';
        const indent = (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') ? '  ' : '';
        lines.push(`${indent}  SND M0 M1 M2${delayFlag}`);
        
        // Only block if consume is 'eat'
        if (rule.trigger.consume === 'eat') {
            lines.push(`${indent}  BLOCK`);
        }
        
        // Close all IF statements in reverse order
        if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
            lines.push(`  END`);
            lines.push(`  END`);
            lines.push(`END`);
        } else {
            lines.push(`END`);
        }
        
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
            // Use date as fallback if no name provided
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
    
    private convertFromExternal(externalRules: any[]): Rule[] {
        return externalRules.map(ext => ({
            name: ext.name || 'Imported Rule',
            enabled: ext.enabled !== false,
            type: ext.type || 'standard',
            customCode: ext.customCode || '',
            output: {
                type: ext.output?.type || 'cc',
                channel: ext.output?.channel || 1,
                ccNumber: ext.output?.ccNumber || 0,
                valueMode: ext.output?.valueMode || 'trigger',
                constantValue: ext.output?.constantValue || 0,
                bank: ext.output?.bank || 0,
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