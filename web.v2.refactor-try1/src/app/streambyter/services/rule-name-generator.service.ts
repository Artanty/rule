import { Injectable } from '@angular/core';
import { Rule } from '../models/rule.model';
import { StorageService } from '../../services/storage.service';

@Injectable({
    providedIn: 'root'
})
export class RuleNameGeneratorService {
    constructor(private storageService: StorageService) {}

    generateName(rule: Rule): string {
        const srcDev = this.getEffectiveTriggerName(rule);
        const dstDev = this.getEffectiveConsumerName(rule);
        const srcParam = this.getTriggerParamName(rule);
        const dstParam = this.getOutputParamName(rule);
        
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
        
        return newName;
    }

    private getEffectiveTriggerName(rule: Rule): string {
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            return rule.triggerSource.mappingName;
        } else if (rule.triggerSource.type === 'device') {
            const deviceName = this.storageService.getDeviceName(rule.trigger.channel);
            return deviceName !== `ch${rule.trigger.channel}` ? deviceName : `Device ${rule.trigger.channel}`;
        } else if (rule.triggerSource.type === 'channel') {
            return `Channel ${rule.trigger.channel}`;
        }
        return `Channel ${rule.trigger.channel}`;
    }

    private getEffectiveConsumerName(rule: Rule): string {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            return rule.consumerSource.mappingName;
        } else if (rule.consumerSource.type === 'device') {
            const deviceName = this.storageService.getDeviceName(rule.output.channel);
            return deviceName !== `ch${rule.output.channel}` ? deviceName : `Device ${rule.output.channel}`;
        } else if (rule.consumerSource.type === 'channel') {
            return `Channel ${rule.output.channel}`;
        }
        return `Channel ${rule.output.channel}`;
    }

    private getTriggerParamName(rule: Rule): string {
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            const mapping = this.storageService.getTriggerMappings().find(m => m.name === rule.triggerSource.mappingName);
            if (mapping) {
                const matchedRule = mapping.rules.find(r => r.value === rule.trigger.ccNumber);
                if (matchedRule && matchedRule.name) {
                    return matchedRule.name;
                }
            }
        }
        
        if (rule.trigger.type === 'controlChange') {
            return this.storageService.getParamName(rule.trigger.channel, 'cc', rule.trigger.ccNumber);
        } else if (rule.trigger.type === 'noteOn') {
            if (rule.trigger.noteMode === 'specific') {
                return this.storageService.getParamName(rule.trigger.channel, 'note', rule.trigger.specificNote);
            } else {
                return 'any note';
            }
        }
        return 'unknown';
    }

    private getOutputParamName(rule: Rule): string {
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            const consumerMappings = this.storageService.getConsumerMappings();
            const mapping = consumerMappings.find(m => m.name === rule.consumerSource.mappingName);
            if (mapping) {
                if (rule.output.type === 'cc') {
                    const matchedRule = mapping.rules.find(r => r.type === 'cc' && r.value === rule.output.ccNumber);
                    if (matchedRule && matchedRule.name) return matchedRule.name;
                } else if (rule.output.type === 'note') {
                    const matchedRule = mapping.rules.find(r => r.type === 'note' && r.value === rule.output.note);
                    if (matchedRule && matchedRule.name) return matchedRule.name;
                } else if (rule.output.type === 'program') {
                    const matchedRule = mapping.rules.find(r => r.type === 'program' && r.value === rule.output.program);
                    if (matchedRule && matchedRule.name) return matchedRule.name;
                }
            }
        }
        
        if (rule.output.type === 'cc') {
            return this.storageService.getParamName(rule.output.channel, 'cc', rule.output.ccNumber);
        } else if (rule.output.type === 'note') {
            return this.storageService.getParamName(rule.output.channel, 'note', rule.output.note);
        } else if (rule.output.type === 'program') {
            return `program ${rule.output.program}`;
        }
        return 'unknown';
    }
}