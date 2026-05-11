import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

export interface Rule {
    name: string;
    enabled: boolean;
    type: 'standard' | 'custom';
    customCode?: string;
    collapsed?: boolean;
    selected?: boolean;
    showMappingSelector?: boolean;
    selectedMappingRuleKey?: any;
    triggerSource: {
        type: 'mapping' | 'device' | 'channel';
        value: string | number;
        mappingName?: string;
    };
    consumerSource: {
        type: 'mapping' | 'device' | 'channel';
        value: string | number;
        mappingName?: string;
    };
    output: {
        type: 'cc' | 'program' | 'note';
        channel: number;
        ccNumber: number;
        valueMode: 'constant' | 'trigger';
        constantValue: number;
        program: number;
        note: number;
        velocity: number;
        velocityMode: 'constant' | 'trigger';
        delayMs: number;
        injectOutput?: boolean;
    };
    trigger: {
        type: 'noteOn' | 'controlChange';
        channel: number;
        noteMode: 'specific' | 'any';
        specificNote: number;
        ccNumber: number;
        valueMode: 'specific' | 'any' | 'range';
        specificValue: number;
        rangeMin: number;
        rangeMax: number;
        consume: 'eat' | 'pass';
        cloneTrigger?: boolean;
    };
}

@Injectable({
    providedIn: 'root'
})
export class RuleService {
    private rules: Rule[] = [];

    constructor(private storageService: StorageService) {}

    getRules(): Rule[] {
        return this.rules;
    }

    setRules(rules: Rule[]): void {
        this.rules = rules;
    }

    addRule(rule: Rule): void {
        this.rules.push(rule);
    }

    updateRule(index: number, rule: Rule): void {
        if (index >= 0 && index < this.rules.length) {
            this.rules[index] = rule;
        }
    }

    deleteRule(index: number): void {
        if (index >= 0 && index < this.rules.length) {
            this.rules.splice(index, 1);
        }
    }

    duplicateRule(index: number): Rule | null {
        if (index >= 0 && index < this.rules.length) {
            const original = this.rules[index];
            const copy = JSON.parse(JSON.stringify(original));
            copy.name = `${original.name} (copy)`;
            copy.selected = false;
            copy.collapsed = true;
            return copy;
        }
        return null;
    }

    createDefaultRule(): Rule {
        return {
            name: "New Rule",
            enabled: true,
            type: 'standard',
            customCode: '',
            collapsed: true,
            selected: false,
            triggerSource: { type: 'channel', value: 1 },
            consumerSource: { type: 'channel', value: 1 },
            output: {
                type: "cc",
                channel: 1,
                ccNumber: 0,
                valueMode: "constant",
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: "constant",
                delayMs: 0,
                injectOutput: false
            },
            trigger: {
                type: "controlChange",
                channel: 1,
                noteMode: "specific",
                specificNote: 60,
                ccNumber: 0,
                valueMode: "any",
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: "eat",
                cloneTrigger: false
            }
        };
    }

    createCustomRule(): Rule {
        return {
            name: "Custom Rule",
            enabled: true,
            type: 'custom',
            customCode: '# Write your custom StreamByter code here\n# Example:\n# IF M0 == B0 07\n#   SND M0 M1 7F\n# END',
            collapsed: true,
            selected: false,
            triggerSource: { type: 'channel', value: 1 },
            consumerSource: { type: 'channel', value: 1 },
            output: {
                type: "cc",
                channel: 1,
                ccNumber: 0,
                valueMode: "constant",
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: "constant",
                delayMs: 0,
                injectOutput: false
            },
            trigger: {
                type: "controlChange",
                channel: 1,
                noteMode: "specific",
                specificNote: 60,
                ccNumber: 0,
                valueMode: "any",
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: "eat",
                cloneTrigger: false
            }
        };
    }

    getSelectedRules(): Rule[] {
        return this.rules.filter(r => r.selected);
    }

    getSelectedCount(): number {
        return this.getSelectedRules().length;
    }

    selectAll(): void {
        this.rules.forEach(rule => {
            if (rule.type === 'standard') {
                rule.selected = true;
            }
        });
    }

    selectRegular(): void {
        this.rules.forEach(rule => {
            if (rule.type === 'standard') {
                rule.selected = true;
            } else {
                rule.selected = false;
            }
        });
    }

    selectNone(): void {
        this.rules.forEach(rule => rule.selected = false);
    }

    deleteSelected(): void {
        this.rules = this.rules.filter(rule => !rule.selected);
    }

    toggleRuleEnabled(index: number): void {
        if (index >= 0 && index < this.rules.length) {
            this.rules[index].enabled = !this.rules[index].enabled;
        }
    }

    toggleRuleCollapsed(index: number): void {
        if (index >= 0 && index < this.rules.length) {
            this.rules[index].collapsed = !this.rules[index].collapsed;
        }
    }
}