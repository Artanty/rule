import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TriggerMapping } from '../../services/storage.service';

@Component({
    selector: 'app-bulk-actions',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './bulk-actions.component.html',
    styleUrls: ['./bulk-actions.component.scss']
})
export class BulkActionsComponent {
    @Input() rulesCount: number = 0;
    @Input() selectedCount: number = 0;
    @Input() triggerMappings: TriggerMapping[] = [];
    @Input() bulkMappingName: string | null = null;

    @Output() selectAll = new EventEmitter<void>();
    @Output() selectRegular = new EventEmitter<void>();
    @Output() selectNone = new EventEmitter<void>();
    @Output() generateNamesForSelected = new EventEmitter<void>();
    @Output() applyBulkMapping = new EventEmitter<void>();
    @Output() deleteSelected = new EventEmitter<void>();
    @Output() bulkMappingNameChange = new EventEmitter<string | null>();

    onBulkMappingNameChange(value: string): void {
        this.bulkMappingNameChange.emit(value || null);
    }
}