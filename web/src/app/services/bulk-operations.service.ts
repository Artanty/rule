import { Injectable } from '@angular/core';
import { Rule } from './rule.service';
import { StorageService, TriggerMapping } from './storage.service';

@Injectable({
    providedIn: 'root'
})
export class BulkOperationsService {

    constructor(private storageService: StorageService) {}

    applyBulkMapping(rules: Rule[], bulkMappingName: string | null): void {
        if (!bulkMappingName) {
            return;
        }

        const selectedRules = rules.filter(r => r.type === 'standard' && r.selected);
        if (selectedRules.length === 0) {
            return;
        }

        const mapping = this.storageService.getTriggerMapping(bulkMappingName);
        if (!mapping) {
            return;
        }

        for (const rule of selectedRules) {
            const currentCCValue = rule.trigger.ccNumber;
            const currentNoteValue = rule.trigger.specificNote;

            rule.triggerSource = {
                type: 'mapping',
                value: mapping.name,
                mappingName: mapping.name
            };
            rule.trigger.channel = mapping.triggerMidiChannel;

            if (rule.trigger.type === 'controlChange') {
                const ccRules = mapping.rules.filter(r => r.type === 'cc');
                const valueExists = ccRules.some(r => r.value === currentCCValue);
                if (valueExists) {
                    rule.trigger.ccNumber = currentCCValue;
                } else if (ccRules.length > 0) {
                    rule.trigger.ccNumber = ccRules[0].value;
                }
            } else if (rule.trigger.type === 'noteOn') {
                const noteRules = mapping.rules.filter(r => r.type === 'note');
                const valueExists = noteRules.some(r => r.value === currentNoteValue);
                if (valueExists) {
                    rule.trigger.specificNote = currentNoteValue;
                } else if (noteRules.length > 0) {
                    rule.trigger.specificNote = noteRules[0].value;
                }
            }
        }
    }

    generateNamesForSelectedRules(rules: Rule[], storageService: StorageService): void {
        const selectedRules = rules.filter(r => r.type === 'standard' && r.selected);
        if (selectedRules.length === 0) {
            return;
        }

        for (const rule of selectedRules) {
            this.generateNameForRule(rule, storageService);
        }
    }

    private generateNameForRule(rule: Rule, storageService: StorageService): void {
        if (rule.type !== 'standard') {
            return;
        }

        const srcDev = this.getEffectiveTriggerName(rule, storageService);
        const dstDev = this.getEffectiveConsumerName(rule, storageService);
        const srcParam = this.getTriggerParamName(rule, storageService);
        const dstParam = this.getOutputParamName(rule, storageService);

        let newName = `[${srcDev}] ${srcParam}`;

        if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
            newName += ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
        } else if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'specific') {
            newName += ` = ${rule.trigger.specificValue}`;
        }

        newName += ` → [${dstDev}] ${dstParam}`;

        if (rule.output.type === 'cc' && rule.output.valueMode === 'constant') {
            newName += ` = ${rule.output.constantValue}`;
        } else if (rule.output.type === 'note' && rule.output.velocityMode === 'constant') {
            newName += ` vel=${rule.output.velocity}`;
        }

        if (rule.trigger.cloneTrigger) {
            newName += ` [+C]`;
        }

        if (rule.output.injectOutput) {
            newName += ` [+I]`;
        }

        rule.name = newName;
    }

    private getEffectiveTriggerName(rule: Rule, storageService: StorageService): string {
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            return rule.triggerSource.mappingName;
        } else if (rule.triggerSource.type === 'device') {
            const deviceName = storageService.getDeviceName(rule.trigger.channel);
            return deviceName !== `ch${rule.trigger.channel}` ? deviceName : `Device ${rule.trigger.channel}`;
        } else if (rule.triggerSource.type === 'channel') {
            return `Channel ${rule.trigger.channel}`;
        }
        return `Channel ${rule.trigger.channel}`;
    }

    private getEffectiveConsumerName(rule: Rule, storageService: StorageService): string {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            return rule.consumerSource.mappingName;
        } else if (rule.consumerSource.type === 'device') {
            const deviceName = storageService.getDeviceName(rule.output.channel);
            return deviceName !== `ch${rule.output.channel}` ? deviceName : `Device ${rule.output.channel}`;
        } else if (rule.consumerSource.type === 'channel') {
            return `Channel ${rule.output.channel}`;
        }
        return `Channel ${rule.output.channel}`;
    }

    private getTriggerParamName(rule: Rule, storageService: StorageService): string {
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            const mapping = storageService.getTriggerMapping(rule.triggerSource.mappingName);
            if (mapping) {
                const matchedRule = mapping.rules.find(r => r.value === rule.trigger.ccNumber);
                if (matchedRule && matchedRule.name) {
                    return matchedRule.name;
                }
            }
        }

        if (rule.trigger.type === 'controlChange') {
            const ccNumber = Number(rule.trigger.ccNumber);
            return storageService.getParamName(rule.trigger.channel, 'cc', ccNumber);
        } else if (rule.trigger.type === 'noteOn') {
            if (rule.trigger.noteMode === 'specific') {
                const noteNumber = Number(rule.trigger.specificNote);
                return storageService.getParamName(rule.trigger.channel, 'note', noteNumber);
            } else {
                return 'any note';
            }
        }
        return 'unknown';
    }

    private getOutputParamName(rule: Rule, storageService: StorageService): string {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const mapping = storageService.getConsumerMapping(rule.consumerSource.mappingName);
            if (mapping) {
                if (rule.output.type === 'cc') {
                    let matchedRule = null;
                    if (rule.output.valueMode === 'constant') {
                        matchedRule = mapping.rules.find(r =>
                            r.type === 'cc' &&
                            r.value === rule.output.ccNumber &&
                            r.dataValue === rule.output.constantValue
                        );
                    }
                    if (!matchedRule) {
                        matchedRule = mapping.rules.find(r =>
                            r.type === 'cc' &&
                            r.value === rule.output.ccNumber
                        );
                    }

                    if (matchedRule && matchedRule.name) {
                        if (matchedRule.dataValue !== undefined) {
                            return `${matchedRule.name} (${matchedRule.dataValue})`;
                        }
                        return matchedRule.name;
                    }
                } else if (rule.output.type === 'note') {
                    let matchedRule = null;
                    if (rule.output.velocityMode === 'constant') {
                        matchedRule = mapping.rules.find(r =>
                            r.type === 'note' &&
                            r.value === rule.output.note &&
                            r.dataValue === rule.output.velocity
                        );
                    }
                    if (!matchedRule) {
                        matchedRule = mapping.rules.find(r =>
                            r.type === 'note' &&
                            r.value === rule.output.note
                        );
                    }

                    if (matchedRule && matchedRule.name) {
                        if (matchedRule.dataValue !== undefined) {
                            return `${matchedRule.name} (vel ${matchedRule.dataValue})`;
                        }
                        return matchedRule.name;
                    }
                } else if (rule.output.type === 'program') {
                    const matchedRule = mapping.rules.find(r =>
                        r.type === 'program' &&
                        r.value === rule.output.program
                    );
                    if (matchedRule && matchedRule.name) {
                        return matchedRule.name;
                    }
                }
            }
        }

        if (rule.output.type === 'cc') {
            const ccNumber = Number(rule.output.ccNumber);
            let baseName = storageService.getParamName(rule.output.channel, 'cc', ccNumber);
            if (rule.output.valueMode === 'constant') {
                baseName += ` (${rule.output.constantValue})`;
            }
            return baseName;
        } else if (rule.output.type === 'note') {
            const noteNumber = Number(rule.output.note);
            let baseName = storageService.getParamName(rule.output.channel, 'note', noteNumber);
            if (rule.output.velocityMode === 'constant') {
                baseName += ` (vel ${rule.output.velocity})`;
            }
            return baseName;
        } else if (rule.output.type === 'program') {
            return `program ${rule.output.program}`;
        }
        return 'unknown';
    }
}