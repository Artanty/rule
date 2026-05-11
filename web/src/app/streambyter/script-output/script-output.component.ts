import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../../services/file.service';

@Component({
    selector: 'app-script-output',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './script-output.component.html',
    styleUrls: ['./script-output.component.scss']
})
export class ScriptOutputComponent {
    @Input() generatedScript: string = '';
    @Input() fileName: string = '';
    @Input() showGenerated: boolean = false;

    @Output() copyToClipboard = new EventEmitter<void>();
    @Output() downloadScript = new EventEmitter<void>();
    @Output() downloadAsJson = new EventEmitter<void>();

    constructor(private fileService: FileService) {}

    async onCopyToClipboard(): Promise<void> {
        try {
            await this.fileService.copyToClipboard(this.generatedScript);
            // Could emit a success event or show a toast
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
        this.copyToClipboard.emit();
    }
}