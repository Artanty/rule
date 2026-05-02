import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rule } from '../../models/rule.model';
import { StorageService } from '../../../services/storage.service';

@Component({
    selector: 'app-trigger-section',
    templateUrl: './trigger-section.component.html',
    styleUrls: ['./trigger-section.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class TriggerSectionComponent {
    @Input() rule!: Rule;
    @Input() triggerMappings: any[] = [];
    
    @Output() triggerSourceChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() triggerTypeChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() triggerCcChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() triggerNoteChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() triggerValueModeChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() triggerSpecificValueChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() triggerRangeMinChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() triggerRangeMaxChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() triggerConsumeChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() triggerNoteModeChange = new EventEmitter<{ rule: Rule; value: string }>();
    
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    constructor(private storageService: StorageService) {}
    
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
    
    onTriggerSourceChange(value: string) {
        this.triggerSourceChange.emit({ rule: this.rule, value });
    }
    
    onTriggerTypeChange(value: string) {
        this.triggerTypeChange.emit({ rule: this.rule, value });
    }
    
    onTriggerCcChange(value: number) {
        this.triggerCcChange.emit({ rule: this.rule, value });
    }
    
    onTriggerNoteChange(value: number) {
        this.triggerNoteChange.emit({ rule: this.rule, value });
    }
    
    onTriggerValueModeChange(value: string) {
        this.triggerValueModeChange.emit({ rule: this.rule, value });
    }
    
    onTriggerSpecificValueChange(value: number) {
        this.triggerSpecificValueChange.emit({ rule: this.rule, value });
    }
    
    onTriggerRangeMinChange(value: number) {
        this.triggerRangeMinChange.emit({ rule: this.rule, value });
    }
    
    onTriggerRangeMaxChange(value: number) {
        this.triggerRangeMaxChange.emit({ rule: this.rule, value });
    }
    
    onTriggerConsumeChange(value: string) {
        this.triggerConsumeChange.emit({ rule: this.rule, value });
    }
    
    onTriggerNoteModeChange(value: string) {
        this.triggerNoteModeChange.emit({ rule: this.rule, value });
    }
}