import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, TriggerMapping, TriggerRule } from '../services/storage.service';

@Component({
    selector: 'app-trigger-mappings',
    templateUrl: './trigger-mappings.component.html',
    styleUrls: ['./trigger-mappings.component.scss'],
    standalone: false,
})
export class TriggerMappingsComponent implements OnInit {
    mappings: TriggerMapping[] = [];
    selectedMapping: TriggerMapping | null = null;
    isEditing: boolean = false;
    editForm: TriggerMapping = this.createEmptyMapping();
    
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    @Output() mappingSelected = new EventEmitter<TriggerMapping | null>();
    
    constructor(private storageService: StorageService) {}
    
    ngOnInit() {
        this.loadMappings();
    }
    
    loadMappings() {
        this.mappings = this.storageService.getTriggerMappings();
    }
    
    createEmptyMapping(): TriggerMapping {
        return {
            name: '',
            triggerMidiChannel: 1,
            triggerDeviceName: '',
            rules: []
        };
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
            alert('Please enter a mapping name');
            return;
        }
        
        // Check for duplicate name when creating new
        if (!this.selectedMapping && this.storageService.getTriggerMapping(this.editForm.name)) {
            alert('A mapping with this name already exists');
            return;
        }
        
        this.storageService.addTriggerMapping(this.editForm);
        this.loadMappings();
        this.cancelEdit();
    }
    
    deleteMapping(name: string) {
        if (confirm(`Delete trigger mapping "${name}"?`)) {
            this.storageService.deleteTriggerMapping(name);
            this.loadMappings();
            if (this.selectedMapping?.name === name) {
                this.selectMapping(null);
            }
        }
    }
    
    selectMapping(mapping: TriggerMapping | null) {
        this.selectedMapping = mapping;
        this.mappingSelected.emit(mapping);
    }
    
    addRule() {
        const newRule: TriggerRule = {
            name: '',
            value: 0,
            type: 'cc'
        };
        this.editForm.rules.push(newRule);
    }
    
    /**
     * Duplicate a rule with increment option
     * @param index - index of rule to duplicate
     * @param increment - whether to increment values
     */
    duplicateRule(index: number, increment: boolean = false) {
        const originalRule = this.editForm.rules[index];
        const duplicatedRule: TriggerRule = JSON.parse(JSON.stringify(originalRule));
        
        if (increment) {
            // Increment CC value if less than 128
            if (duplicatedRule.type === 'cc' && duplicatedRule.value < 127) {
                duplicatedRule.value = duplicatedRule.value + 1;
            }
            
            // Increment number in rule name if exists
            duplicatedRule.name = this.incrementNumberInName(duplicatedRule.name);
        } else {
            // Just add "copy" suffix
            duplicatedRule.name = `${duplicatedRule.name} (copy)`;
        }
        
        // Insert after the original rule
        this.editForm.rules.splice(index + 1, 0, duplicatedRule);
    }
    
    /**
     * Increment number found at the end of a string
     * Examples: "Knob 1" -> "Knob 2", "Volume 12" -> "Volume 13", "Fader" -> "Fader 2"
     */
    incrementNumberInName(name: string): string {
        // Check if name ends with a number (with optional space before)
        const numberMatch = name.match(/(\d+)$/);
        
        if (numberMatch) {
            // Number found at the end - increment it
            const currentNumber = parseInt(numberMatch[1], 10);
            const newNumber = currentNumber + 1;
            const numberPart = numberMatch[0];
            const nameWithoutNumber = name.slice(0, -numberPart.length);
            return `${nameWithoutNumber}${newNumber}`;
        } else {
            // No number found - append " 2"
            return `${name} 2`;
        }
    }
    
    /**
     * Duplicate and increment all rules from current index to end
     * Useful for creating multiple variations
     */
    duplicateAndIncrementChain(startIndex: number, count: number = 1) {
        let currentIndex = startIndex;
        for (let i = 0; i < count; i++) {
            this.duplicateRule(currentIndex, true);
            currentIndex++; // Move to next rule for subsequent duplicates
        }
    }
    
    removeRule(index: number) {
        this.editForm.rules.splice(index, 1);
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
        a.download = `trigger-mappings-${new Date().toISOString().slice(0, 19)}.json`;
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
                    // Validate and save each mapping
                    for (const mapping of imported) {
                        if (mapping.name && mapping.triggerMidiChannel !== undefined) {
                            this.storageService.addTriggerMapping(mapping);
                        }
                    }
                    this.loadMappings();
                    alert(`Imported ${imported.length} mappings`);
                } else {
                    alert('Invalid file format');
                }
            } catch (ex) {
                alert('Error parsing file');
            }
        };
        reader.readAsText(file);
        input.value = '';
    }
}