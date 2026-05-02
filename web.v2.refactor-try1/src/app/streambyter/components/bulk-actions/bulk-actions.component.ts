import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-bulk-actions',
    templateUrl: './bulk-actions.component.html',
    styleUrls: ['./bulk-actions.component.scss'],
    standalone: false,
})
export class BulkActionsComponent {
    @Input() selectedCount: number = 0;
    @Input() triggerMappings: any[] = [];
    
    @Output() selectAll = new EventEmitter<void>();
    @Output() selectRegular = new EventEmitter<void>();
    @Output() selectNone = new EventEmitter<void>();
    @Output() generateNames = new EventEmitter<void>();
    @Output() applyMapping = new EventEmitter<string>();
    
    bulkMappingName: string | null = null;
}