import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rule } from '../../models/rule.model';
import { ConsumerMappingSelectorComponent } from '../consumer-mapping-selector/consumer-mapping-selector.component';
import { StorageService } from '../../../services/storage.service';

@Component({
    selector: 'app-output-section',
    templateUrl: './output-section.component.html',
    styleUrls: ['./output-section.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class OutputSectionComponent {
    @Input() rule!: Rule;
    @Input() showDelayInput: boolean = false;
    
    @Output() consumerSourceChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() mappingRuleSelected = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() outputTypeChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() outputCcChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() outputNoteChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() outputProgramChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() outputValueModeChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() outputConstantValueChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() outputVelocityModeChange = new EventEmitter<{ rule: Rule; value: string }>();
    @Output() outputVelocityChange = new EventEmitter<{ rule: Rule; value: number }>();
    @Output() outputDelayChange = new EventEmitter<{ rule: Rule; value: number }>();
    
    channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    constructor(private storageService: StorageService) {}
    
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
    
    getConsumerSourceOptions(): { value: string; label: string }[] {
        const options: { value: string; label: string }[] = [];
        
        const consumerMappings = this.storageService.getConsumerMappings();
        for (const mapping of consumerMappings) {
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
    
    getOutputCcOptions(): { value: number; label: string }[] {
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `CC#${i}` });
        }
        return options;
    }
    
    getOutputNoteOptions(): { value: number; label: string }[] {
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `Note#${i}` });
        }
        return options;
    }
    
    getOutputProgramOptions(): { value: number; label: string }[] {
        const options: { value: number; label: string }[] = [];
        for (let i = 0; i <= 127; i++) {
            options.push({ value: i, label: `Program ${i}` });
        }
        return options;
    }
    
    onConsumerSourceChange(value: string) {
        this.consumerSourceChange.emit({ rule: this.rule, value });
    }
    
    onMappingRuleSelected(value: string) {
        this.mappingRuleSelected.emit({ rule: this.rule, value });
    }
    
    onOutputTypeChange(value: string) {
        this.outputTypeChange.emit({ rule: this.rule, value });
    }
    
    onOutputCcChange(value: number) {
        this.outputCcChange.emit({ rule: this.rule, value });
    }
    
    onOutputNoteChange(value: number) {
        this.outputNoteChange.emit({ rule: this.rule, value });
    }
    
    onOutputProgramChange(value: number) {
        this.outputProgramChange.emit({ rule: this.rule, value });
    }
    
    onOutputValueModeChange(value: string) {
        this.outputValueModeChange.emit({ rule: this.rule, value });
    }
    
    onOutputConstantValueChange(value: number) {
        this.outputConstantValueChange.emit({ rule: this.rule, value });
    }
    
    onOutputVelocityModeChange(value: string) {
        this.outputVelocityModeChange.emit({ rule: this.rule, value });
    }
    
    onOutputVelocityChange(value: number) {
        this.outputVelocityChange.emit({ rule: this.rule, value });
    }
    
    onOutputDelayChange(value: number) {
        this.outputDelayChange.emit({ rule: this.rule, value });
    }
}