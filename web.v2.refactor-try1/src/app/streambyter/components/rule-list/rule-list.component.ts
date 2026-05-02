import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Rule } from '../../models/rule.model';
import { RuleStoreService } from '../../services/rule-store.service';
import { RuleItemComponent } from '../rule-item/rule-item.component';
import { BulkActionsComponent } from '../bulk-actions/bulk-actions.component';

@Component({
    selector: 'app-rule-list',
    templateUrl: './rule-list.component.html',
    styleUrls: ['./rule-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class RuleListComponent implements OnInit, OnDestroy {
    rules: Rule[] = [];
    triggerMappings: any[] = [];
    showDelayInput: boolean = false;
    wideRuleNames: boolean = false;
    
    private subscriptions: Subscription[] = [];
    
    constructor(private ruleStore: RuleStoreService) {}
    
    ngOnInit() {
        this.subscriptions.push(
            this.ruleStore.rules$.subscribe(rules => this.rules = rules),
            this.ruleStore.triggerMappings$.subscribe(mappings => this.triggerMappings = mappings),
            this.ruleStore.uiSettings$.subscribe(settings => {
                this.showDelayInput = settings.showDelayInput;
                this.wideRuleNames = settings.wideRuleNames;
            })
        );
    }
    
    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
    
    getSelectedRulesCount(): number {
        return this.rules.filter(r => r.type === 'standard' && r.selected).length;
    }
    
    selectAllRules() {
        this.ruleStore.selectAllRules();
    }
    
    selectRegularRules() {
        this.ruleStore.selectRegularRules();
    }
    
    selectNoneRules() {
        this.ruleStore.selectNoneRules();
    }
    
    generateNamesForSelected() {
        // This will be handled by parent with nameGenerator service
    }
    
    applyBulkMapping(mappingName: string) {
        // This will be handled by parent
    }
}