import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-toolbar',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
    @Input() rulesCount: number = 0;
    @Input() fileName: string = '';
    @Input() dragEnabled: boolean = true;
    @Input() showDelayInput: boolean = false;
    @Input() wideRuleNames: boolean = false;

    @Output() importClick = new EventEmitter<void>();
    @Output() loadExample = new EventEmitter<void>();
    @Output() clearRules = new EventEmitter<void>();
    @Output() addRule = new EventEmitter<void>();
    @Output() addCustomRule = new EventEmitter<void>();
    @Output() refreshMaps = new EventEmitter<void>();
    @Output() toggleDragMode = new EventEmitter<void>();
    @Output() generateScript = new EventEmitter<void>();
    @Output() fileNameChange = new EventEmitter<string>();
    @Output() showDelayInputChange = new EventEmitter<boolean>();
    @Output() wideRuleNamesChange = new EventEmitter<boolean>();

    importFileInputId = 'importRulesInput';

    onFileNameChange(value: string): void {
        this.fileNameChange.emit(value);
    }

    onShowDelayInputChange(checked: boolean): void {
        this.showDelayInputChange.emit(checked);
    }

    onWideRuleNamesChange(checked: boolean): void {
        this.wideRuleNamesChange.emit(checked);
    }

    triggerFileInput(): void {
        const input = document.getElementById(this.importFileInputId) as HTMLInputElement;
        if (input) input.click();
    }
}