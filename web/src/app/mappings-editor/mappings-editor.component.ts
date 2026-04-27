import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, TriggerMapping, TriggerRule } from '../services/storage.service';

@Component({
    selector: 'app-mappings-editor',
    templateUrl: './mappings-editor.component.html',
    styleUrls: ['./mappings-editor.component.scss'],
    standalone: false,
})
export class MappingsEditorComponent implements OnInit {
    @Input() type: 'producer' | 'consumer' = 'producer';
    @Output() mappingsChanged = new EventEmitter<void>();
    
    mappings: TriggerMapping[] = [];
    selectedMapping: TriggerMapping | null = null;
    isEditing: boolean = false;
    editForm: TriggerMapping = this.createEmptyMapping();
    
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    ruleTypes = ['cc', 'note', 'program'];
    
    constructor(private storageService: StorageService) {}
    
    ngOnInit() {
        this.loadMappings();
    }
    
    loadMappings() {
        if (this.type === 'producer') {
            this.mappings = this.storageService.getTriggerMappings();
        } else {
            this.mappings = this.storageService.getConsumerMappings();
        }
    }
    
    createEmptyMapping(): TriggerMapping {
        return {
            name: '',
            triggerMidiChannel: 1,
            triggerDeviceName: '',
            rules: []
        };
    }
    
    getTitle(): string {
        return this.type === 'producer' ? '🎯 Producer Mappings (Trigger)' : '📥 Consumer Mappings (Output)';
    }
    
    startNewMapping() {
        this.editForm = this.createEmptyMapping();
        this.isEditing = true;
        this.selectedMapping = null;
    }
    
    editMapping(mapping: TriggerMapping) {
        this.editForm = JSON.parse(JSON.stringify(mapping));
        this.isEditing = true;
        this.selectedMapping = null;
    }
    
    cancelEdit() {
        this.isEditing = false;
        this.editForm = this.createEmptyMapping();
    }
    
    saveMapping() {
        if (!this.editForm.name.trim()) {
            return;
        }
        
        if (this.type === 'producer') {
            this.storageService.addTriggerMapping(this.editForm);
        } else {
            this.storageService.addConsumerMapping(this.editForm);
        }
        
        this.loadMappings();
        this.cancelEdit();
        this.mappingsChanged.emit();
    }
    
    deleteMapping(name: string) {
        if (confirm(`Delete mapping "${name}"?`)) {
            if (this.type === 'producer') {
                this.storageService.deleteTriggerMapping(name);
            } else {
                this.storageService.deleteConsumerMapping(name);
            }
            this.loadMappings();
            if (this.selectedMapping?.name === name) {
                this.selectedMapping = null;
            }
            this.mappingsChanged.emit();
        }
    }
    
    selectMapping(mapping: TriggerMapping | null) {
        this.selectedMapping = mapping;
    }
    
    addRule() {
        const newRule: TriggerRule = {
            name: '',
            value: 0,
            type: 'cc'
        };
        this.editForm.rules.push(newRule);
    }
    
    removeRule(index: number) {
        this.editForm.rules.splice(index, 1);
    }
    
    duplicateRule(index: number, increment: boolean = false) {
        const originalRule = this.editForm.rules[index];
        const duplicatedRule: TriggerRule = JSON.parse(JSON.stringify(originalRule));
        
        if (increment) {
            if (duplicatedRule.type === 'cc' && duplicatedRule.value < 127) {
                duplicatedRule.value = duplicatedRule.value + 1;
            } else if (duplicatedRule.type === 'program' && duplicatedRule.value < 127) {
                duplicatedRule.value = duplicatedRule.value + 1;
            }
            duplicatedRule.name = this.incrementNumberInName(duplicatedRule.name);
        } else {
            duplicatedRule.name = `${duplicatedRule.name} (copy)`;
        }
        
        this.editForm.rules.splice(index + 1, 0, duplicatedRule);
    }
    
    incrementNumberInName(name: string): string {
        const numberMatch = name.match(/(\d+)$/);
        if (numberMatch) {
            const currentNumber = parseInt(numberMatch[1], 10);
            const newNumber = currentNumber + 1;
            const numberPart = numberMatch[0];
            const nameWithoutNumber = name.slice(0, -numberPart.length);
            return `${nameWithoutNumber}${newNumber}`;
        } else {
            return `${name} 2`;
        }
    }
    
    moveRuleUp(index: number) {
        if (index > 0) {
            const temp = this.editForm.rules[index];
            this.editForm.rules[index] = this.editForm.rules[index - 1];
            this.editForm.rules[index - 1] = temp;
        }
    }
    
    moveRuleDown(index: number) {
        if (index < this.editForm.rules.length - 1) {
            const temp = this.editForm.rules[index];
            this.editForm.rules[index] = this.editForm.rules[index + 1];
            this.editForm.rules[index + 1] = temp;
        }
    }
    
    exportMappings() {
        const data = JSON.stringify(this.mappings, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${this.type}-mappings-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    importMappings(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                if (Array.isArray(imported)) {
                    for (const mapping of imported) {
                        if (mapping.name && mapping.triggerMidiChannel !== undefined) {
                            if (mapping.rules) {
                                for (const rule of mapping.rules) {
                                    if (rule.type !== 'cc' && rule.type !== 'note' && rule.type !== 'program') {
                                        rule.type = 'cc';
                                    }
                                }
                            }
                            if (this.type === 'producer') {
                                // Producer mappings only allow cc and note
                                if (mapping.rules) {
                                    mapping.rules = mapping.rules.filter((r: TriggerRule) => r.type !== 'program');
                                }
                                this.storageService.addTriggerMapping(mapping);
                            } else {
                                this.storageService.addConsumerMapping(mapping);
                            }
                        }
                    }
                    this.loadMappings();
                    this.mappingsChanged.emit();
                }
            } catch (ex) {
                console.error('Error parsing file:', ex);
            }
        };
        reader.readAsText(file);
        input.value = '';
    }
}