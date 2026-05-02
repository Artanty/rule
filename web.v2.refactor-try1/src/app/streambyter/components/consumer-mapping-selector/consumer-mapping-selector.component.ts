import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rule } from '../../models/rule.model';
import { StorageService } from '../../../services/storage.service';

@Component({
    selector: 'app-consumer-mapping-selector',
    templateUrl: './consumer-mapping-selector.component.html',
    styleUrls: ['./consumer-mapping-selector.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class ConsumerMappingSelectorComponent {
    @Input() rule!: Rule;
    @Output() mappingRuleSelected = new EventEmitter<{ rule: Rule; value: string }>();
    
    constructor(private storageService: StorageService) {}
    
    getMappingRuleOptions(): { value: string; label: string }[] {
        if (this.rule.consumerSource.type === 'mapping' && this.rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === this.rule.consumerSource.mappingName);
            if (mapping && mapping.rules) {
                return mapping.rules.map(r => {
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
    
    onMappingRuleSelected(value: string) {
        this.mappingRuleSelected.emit({ rule: this.rule, value });
    }
}