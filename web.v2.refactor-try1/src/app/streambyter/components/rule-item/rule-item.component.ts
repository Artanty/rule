import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Rule } from '../../models/rule.model';
import { RuleStoreService } from '../../services/rule-store.service';
import { StorageService } from '../../../services/storage.service';
import { TriggerRule } from '../../../services/storage.service';

@Component({
    selector: 'app-rule-item',
    templateUrl: './rule-item.component.html',
    styleUrls: ['./rule-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class RuleItemComponent implements OnInit, OnDestroy {
    @Input() index!: number;
    
    rule!: Rule;
    triggerMappings: any[] = [];
    consumerMappings: any[] = [];
    showDelayInput: boolean = false;
    wideRuleNames: boolean = false;
    
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    private subscriptions: Subscription[] = [];
    
    constructor(
        private ruleStore: RuleStoreService,
        private storageService: StorageService
    ) {}
    
    ngOnInit() {
        this.subscriptions.push(
            this.ruleStore.rules$.subscribe(rules => {
                if (rules[this.index]) {
                    this.rule = rules[this.index];
                }
            }),
            this.ruleStore.triggerMappings$.subscribe(mappings => {
                this.triggerMappings = mappings;
            }),
            this.ruleStore.uiSettings$.subscribe(settings => {
                this.showDelayInput = settings.showDelayInput;
                this.wideRuleNames = settings.wideRuleNames;
            })
        );
        this.consumerMappings = this.storageService.getConsumerMappings();
    }
    
    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
    
    getCurrentTriggerSourceValue(): string {
        if (this.rule.triggerSource.type === 'mapping' && this.rule.triggerSource.mappingName) {
            return `mapping:${this.rule.triggerSource.mappingName}`;
        } else if (this.rule.triggerSource.type === 'device') {
            return `device:${this.rule.triggerSource.value}`;
        } else if (this.rule.triggerSource.type === 'channel') {
            return `channel:${this.rule.triggerSource.value}`;
        }
        return `channel:${this.rule.trigger.channel}`;
    }
    
    getCurrentConsumerSourceValue(): string {
        if (this.rule.consumerSource.type === 'mapping' && this.rule.consumerSource.mappingName) {
            return `mapping:${this.rule.consumerSource.mappingName}`;
        } else if (this.rule.consumerSource.type === 'device') {
            return `device:${this.rule.consumerSource.value}`;
        } else if (this.rule.consumerSource.type === 'channel') {
            return `channel:${this.rule.consumerSource.value}`;
        }
        return `channel:${this.rule.output.channel}`;
    }
    
    getTriggerSourceOptions(): { value: string; label: string }[] {
        const options: { value: string; label: string }[] = [
            { value: 'null', label: 'None (use device map)' }
        ];
        
        for (const mapping of this.triggerMappings) {
            options.push({ 
                value: `mapping:${mapping.name}`, 
                label: `📌 ${mapping.name} (Ch${mapping.triggerMidiChannel})` 
            });
        }
        
        const deviceMap = this.storageService.getDeviceMap();
        for (const device of deviceMap) {
            options.push({
                value: `device:${device.midiChannel}`,
                label: `🎛️ ${device.device} (Ch${device.midiChannel})`
            });
        }
        
        for (const ch of this.channels) {
            options.push({
                value: `channel:${ch}`,
                label: `🎹 Channel ${ch}`
            });
        }
        
        return options;
    }
    
    getConsumerSourceOptions(): { value: string; label: string }[] {
        const options: { value: string; label: string }[] = [];
        
        for (const mapping of this.consumerMappings) {
            options.push({ 
                value: `mapping:${mapping.name}`, 
                label: `📌 ${mapping.name} (Ch${mapping.triggerMidiChannel})` 
            });
        }
        
        const deviceMap = this.storageService.getDeviceMap();
        for (const device of deviceMap) {
            options.push({
                value: `device:${device.midiChannel}`,
                label: `🎛️ ${device.device} (Ch${device.midiChannel})`
            });
        }
        
        for (const ch of this.channels) {
            options.push({
                value: `channel:${ch}`,
                label: `🎹 Channel ${ch}`
            });
        }
        
        return options;
    }
    
    getMappingRuleOptions(): { value: string; label: string }[] {
        if (this.rule.consumerSource.type === 'mapping' && this.rule.consumerSource.mappingName) {
            const mapping = this.consumerMappings.find(m => m.name === this.rule.consumerSource.mappingName);
            if (mapping && mapping.rules) {
                return mapping.rules.map((r: TriggerRule) => {
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
                    return { value: key, label: label };
                });
            }
        }
        return [];
    }
    
    getCcOptions(): { value: number; label: string }[] {
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `CC#${i}` });
        }
        return options;
    }
    
    getNoteOptions(): { value: number; label: string }[] {
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `Note#${i}` });
        }
        return options;
    }
    
    getOutputCcOptions(): { value: number; label: string }[] {
        if (this.rule.showMappingSelector && this.rule.consumerSource.type === 'mapping') {
            const mapping = this.consumerMappings.find(m => m.name === this.rule.consumerSource.mappingName);
            if (mapping) {
                const ccRules = mapping.rules.filter((r: TriggerRule) => r.type === 'cc');
                if (ccRules.length > 0) {
                    return ccRules.map((rule: TriggerRule) => ({
                        value: rule.value,
                        label: `${rule.name} (${rule.value})${rule.dataValue !== undefined ? ` → ${rule.dataValue}` : ''}`
                    }));
                }
            }
        }
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `CC#${i}` });
        }
        return options;
    }
    
    getOutputNoteOptions(): { value: number; label: string }[] {
        if (this.rule.showMappingSelector && this.rule.consumerSource.type === 'mapping') {
            const mapping = this.consumerMappings.find(m => m.name === this.rule.consumerSource.mappingName);
            if (mapping) {
                const noteRules = mapping.rules.filter((r: TriggerRule) => r.type === 'note');
                if (noteRules.length > 0) {
                    return noteRules.map((rule: TriggerRule) => ({
                        value: rule.value,
                        label: `${rule.name} (${rule.value})${rule.dataValue !== undefined ? ` → vel ${rule.dataValue}` : ''}`
                    }));
                }
            }
        }
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `Note#${i}` });
        }
        return options;
    }
    
    getOutputProgramOptions(): { value: number; label: string }[] {
        if (this.rule.showMappingSelector && this.rule.consumerSource.type === 'mapping') {
            const mapping = this.consumerMappings.find(m => m.name === this.rule.consumerSource.mappingName);
            if (mapping) {
                const programRules = mapping.rules.filter((r: TriggerRule) => r.type === 'program');
                if (programRules.length > 0) {
                    return programRules.map((rule: TriggerRule) => ({
                        value: rule.value,
                        label: `${rule.name} (${rule.value})`
                    }));
                }
            }
        }
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `Program ${i}` });
        }
        return options;
    }
    
    getSelectedRulesCount(): number {
        return this.ruleStore.getRules().filter(r => r.type === 'standard' && r.selected).length;
    }
    
    // Update methods
    updateRuleName(value: string) {
        this.ruleStore.updateRuleField(this.index, 'name', value);
    }
    
    updateRuleEnabled(value: boolean) {
        this.ruleStore.updateRuleField(this.index, 'enabled', value);
    }
    
    updateRuleSelected(value: boolean) {
        this.ruleStore.updateRuleField(this.index, 'selected', value);
    }
    
    updateCustomCode(value: string) {
        this.ruleStore.updateRuleField(this.index, 'customCode', value);
    }
    
    updateTriggerType(value: string) {
        this.ruleStore.updateTriggerField(this.index, 'type', value);
    }
    
    updateTriggerCc(value: number) {
        this.ruleStore.updateTriggerField(this.index, 'ccNumber', value);
    }
    
    updateTriggerNote(value: number) {
        this.ruleStore.updateTriggerField(this.index, 'specificNote', value);
    }
    
    updateTriggerValueMode(value: string) {
        this.ruleStore.updateTriggerField(this.index, 'valueMode', value);
    }
    
    updateTriggerSpecificValue(value: number) {
        this.ruleStore.updateTriggerField(this.index, 'specificValue', value);
    }
    
    updateTriggerRangeMin(value: number) {
        this.ruleStore.updateTriggerField(this.index, 'rangeMin', value);
    }
    
    updateTriggerRangeMax(value: number) {
        this.ruleStore.updateTriggerField(this.index, 'rangeMax', value);
    }
    
    updateTriggerConsume(value: string) {
        this.ruleStore.updateTriggerField(this.index, 'consume', value);
    }
    
    updateTriggerNoteMode(value: string) {
        this.ruleStore.updateTriggerField(this.index, 'noteMode', value);
    }
    
    updateTriggerSource(value: string) {
        this.ruleStore.updateTriggerSource(this.index, value, this.triggerMappings);
    }
    
    updateConsumerSource(value: string) {
        this.ruleStore.updateConsumerSource(this.index, value, this.consumerMappings);
    }
    
    updateMappingRuleSelected(value: string) {
        if (value && this.rule.consumerSource.type === 'mapping') {
            const mapping = this.consumerMappings.find(m => m.name === this.rule.consumerSource.mappingName);
            if (mapping) {
                const [type, valueStr, dataValueStr] = value.split('_');
                const val = parseInt(valueStr, 10);
                const dataValue = dataValueStr !== 'null' ? parseInt(dataValueStr, 10) : undefined;
                const selectedRule = mapping.rules.find((r: TriggerRule) => 
                    r.type === type && r.value === val && (dataValue !== undefined ? r.dataValue === dataValue : true)
                );
                if (selectedRule) {
                    if (selectedRule.type === 'cc') {
                        this.ruleStore.updateOutputField(this.index, 'type', 'cc');
                        this.ruleStore.updateOutputField(this.index, 'ccNumber', selectedRule.value);
                        if (selectedRule.dataValue !== undefined) {
                            this.ruleStore.updateOutputField(this.index, 'valueMode', 'constant');
                            this.ruleStore.updateOutputField(this.index, 'constantValue', selectedRule.dataValue);
                        }
                    } else if (selectedRule.type === 'note') {
                        this.ruleStore.updateOutputField(this.index, 'type', 'note');
                        this.ruleStore.updateOutputField(this.index, 'note', selectedRule.value);
                        if (selectedRule.dataValue !== undefined) {
                            this.ruleStore.updateOutputField(this.index, 'velocityMode', 'constant');
                            this.ruleStore.updateOutputField(this.index, 'velocity', selectedRule.dataValue);
                        }
                    } else if (selectedRule.type === 'program') {
                        this.ruleStore.updateOutputField(this.index, 'type', 'program');
                        this.ruleStore.updateOutputField(this.index, 'program', selectedRule.value);
                    }
                    this.ruleStore.updateRuleField(this.index, 'selectedMappingRuleKey', value);
                }
            }
        }
    }
    
    updateOutputType(value: string) {
        this.ruleStore.updateOutputField(this.index, 'type', value);
    }
    
    updateOutputCc(value: number) {
        this.ruleStore.updateOutputField(this.index, 'ccNumber', value);
    }
    
    updateOutputNote(value: number) {
        this.ruleStore.updateOutputField(this.index, 'note', value);
    }
    
    updateOutputProgram(value: number) {
        this.ruleStore.updateOutputField(this.index, 'program', value);
    }
    
    updateOutputValueMode(value: string) {
        this.ruleStore.updateOutputField(this.index, 'valueMode', value);
    }
    
    updateOutputConstantValue(value: number) {
        this.ruleStore.updateOutputField(this.index, 'constantValue', value);
    }
    
    updateOutputVelocityMode(value: string) {
        this.ruleStore.updateOutputField(this.index, 'velocityMode', value);
    }
    
    updateOutputVelocity(value: number) {
        this.ruleStore.updateOutputField(this.index, 'velocity', value);
    }
    
    updateOutputDelay(value: number) {
        this.ruleStore.updateOutputField(this.index, 'delayMs', value);
    }
    
    onDuplicate() {
        this.ruleStore.duplicateRule(this.index);
    }
    
    onDelete() {
        if (confirm(`Delete rule "${this.rule.name}"?`)) {
            this.ruleStore.deleteRule(this.index);
        }
    }
    
    onToggleCollapse() {
        this.ruleStore.toggleCustomCollapse(this.index);
    }
    
    onGenerateName() {
        this.ruleStore.generateNameForRule(this.index, this.ruleStore);
    }
}