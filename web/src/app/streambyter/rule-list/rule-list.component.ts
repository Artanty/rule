import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Rule } from '../../services/rule.service';

@Component({
    selector: 'app-rule-list',
    standalone: true,
    imports: [CommonModule, FormsModule, DragDropModule],
    templateUrl: './rule-list.component.html',
    styleUrls: ['./rule-list.component.scss']
})
export class RuleListComponent {
    @Input() rules: Rule[] = [];
    @Input() dragEnabled: boolean = true;
    @Input() wideRuleNames: boolean = false;
    @Input() showDelayInput: boolean = false;

    @Output() ruleChange = new EventEmitter<{ index: number; rule: Rule }>();
    @Output() ruleDelete = new EventEmitter<number>();
    @Output() ruleDuplicate = new EventEmitter<number>();
    @Output() ruleToggleEnabled = new EventEmitter<number>();
    @Output() ruleToggleCollapsed = new EventEmitter<number>();
    @Output() rulesReorder = new EventEmitter<Rule[]>();
    @Output() generateName = new EventEmitter<number>();

    onDragDrop(event: CdkDragDrop<Rule[]>): void {
        if (!this.dragEnabled) return;

        moveItemInArray(this.rules, event.previousIndex, event.currentIndex);
        this.rulesReorder.emit([...this.rules]);
    }

    onRuleChange(index: number, rule: Rule): void {
        this.ruleChange.emit({ index, rule });
    }

    onDelete(index: number): void {
        this.ruleDelete.emit(index);
    }

    onDuplicate(index: number): void {
        this.ruleDuplicate.emit(index);
    }

    onToggleEnabled(index: number): void {
        this.ruleToggleEnabled.emit(index);
    }

    onToggleCollapsed(index: number): void {
        this.ruleToggleCollapsed.emit(index);
    }

    onGenerateName(index: number): void {
        this.generateName.emit(index);
    }
}