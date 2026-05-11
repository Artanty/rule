import { Injectable } from '@angular/core';
import { Rule } from './rule.service';

@Injectable({
    providedIn: 'root'
})
export class ScriptGeneratorService {

    generateScript(rules: Rule[], fileName: string = ''): string {
        const lines: string[] = [];
        const scriptName = fileName.trim();
        if (scriptName) {
            lines.push(`# ${scriptName}`);
        } else {
            lines.push(`# StreamByter Script`);
        }
        lines.push(`# Generated: ${new Date().toLocaleString()}`);
        lines.push('');

        const enabledRules = rules.filter(r => r.enabled);
        if (enabledRules.length === 0) {
            lines.push('# No enabled rules');
            return lines.join('\n');
        }

        let ruleCounter = 1;
        enabledRules.forEach((rule) => {
            if (rule.type === 'custom') {
                lines.push(`# == CUSTOM_RULE ==`);
                if (rule.customCode) {
                    const customLines = rule.customCode.split('\n');
                    for (const customLine of customLines) {
                        lines.push(customLine);
                    }
                }
                lines.push('');
            } else {
                const ruleLines = this.generateRule(rule, ruleCounter);
                lines.push(...ruleLines);
                lines.push('');
                ruleCounter++;
            }
        });

        return lines.join('\n');
    }

    private generateRule(rule: Rule, ruleCounter: number): string[] {
        const lines: string[] = [];

        // Add rule header with source information
        const srcDev = this.getEffectiveTriggerName(rule);
        const dstDev = this.getEffectiveConsumerName(rule);
        const srcParam = this.getTriggerParamName(rule);
        const dstParam = this.getOutputParamName(rule);

        let rangeInfo = '';
        if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
            rangeInfo = ` [${rule.trigger.rangeMin}-${rule.trigger.rangeMax}]`;
        } else if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'specific') {
            rangeInfo = ` = ${rule.trigger.specificValue}`;
        }

        const cloneTriggerFlag = rule.trigger.cloneTrigger ? ' [+C]' : '';
        const injectOutputFlag = rule.output.injectOutput ? ' [+I]' : '';

        lines.push(`# == RULE ${ruleCounter}: [${srcDev}] ${srcParam}${rangeInfo} → [${dstDev}] ${dstParam}${cloneTriggerFlag}${injectOutputFlag} ==`);

        // Add source comments if available
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            lines.push(`# trigger-source: [mapping] "${rule.triggerSource.mappingName}"`);
        } else if (rule.triggerSource.type === 'device') {
            lines.push(`# trigger-source: [device] "${rule.triggerSource.value}"`);
        } else if (rule.triggerSource.type === 'channel') {
            lines.push(`# trigger-source: [channel] "${rule.triggerSource.value}"`);
        }

        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            lines.push(`# consumer-source: [mapping] "${rule.consumerSource.mappingName}"`);
        } else if (rule.consumerSource.type === 'device') {
            lines.push(`# consumer-source: [device] "${rule.consumerSource.value}"`);
        } else if (rule.consumerSource.type === 'channel') {
            lines.push(`# consumer-source: [channel] "${rule.consumerSource.value}"`);
        }

        // Generate the actual rule code
        const ruleCode = this.generateStreamByterIIRule(rule);
        lines.push(...ruleCode);

        return lines;
    }

    private generateStreamByterIIRule(rule: Rule): string[] {
        const lines: string[] = [];
        const toHex = (value: any, padding: number = 2): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return num.toString(16).toUpperCase().padStart(padding, '0');
        };
        const toChannelHex = (channel: number): string => {
            const channelNum = typeof channel === 'string' ? parseInt(channel, 10) : channel;
            return (channelNum - 1).toString(16).toUpperCase();
        };

        // IF condition line
        if (rule.trigger.type === 'controlChange') {
            const triggerChannelHex = toChannelHex(rule.trigger.channel);
            const ccHex = toHex(rule.trigger.ccNumber);
            if (rule.trigger.valueMode === 'specific') {
                const valueHex = toHex(rule.trigger.specificValue);
                lines.push(`IF M0 == B${triggerChannelHex} ${ccHex} ${valueHex}`);
            } else if (rule.trigger.valueMode === 'range') {
                const minHex = toHexCompare(rule.trigger.rangeMin);
                const maxHex = toHexCompare(rule.trigger.rangeMax);
                lines.push(`IF M0 == B${triggerChannelHex} ${ccHex}`);
                lines.push(`  IF M2 >= ${minHex}`);
                lines.push(`    IF M2 <= ${maxHex}`);
            } else {
                lines.push(`IF M0 == B${triggerChannelHex} ${ccHex}`);
            }
        } else if (rule.trigger.type === 'noteOn') {
            const triggerChannelHex = toChannelHex(rule.trigger.channel);
            if (rule.trigger.noteMode === 'specific') {
                const noteHex = toHex(rule.trigger.specificNote);
                lines.push(`IF M0 == 9${triggerChannelHex} ${noteHex}`);
            } else {
                lines.push(`IF M0 >= 0x90 && M0 <= 0x9F`);
            }
        }

        const indent = (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') ? '  ' : '';

        // Check if we need to use inline style
        const useInlineStyle = (rule.trigger.cloneTrigger || rule.output.injectOutput) && rule.trigger.type === 'controlChange';

        if (useInlineStyle) {
            // INLINE STYLE
            if (rule.trigger.cloneTrigger) {
                const ccHex = toHex(rule.trigger.ccNumber);
                lines.push(`${indent}  BX ${ccHex} = XX ${ccHex} +C`);
            }

            const delayFlag = rule.output.delayMs > 0 ? ` +D${rule.output.delayMs}` : '';
            const injectOutputFlag = rule.output.injectOutput ? ' +I' : '';

            if (rule.output.type === 'cc') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const ccHex = toHex(rule.output.ccNumber);
                if (rule.output.valueMode === 'constant') {
                    const valueHex = toHex(rule.output.constantValue);
                    lines.push(`${indent}  SND B${outputChannelHex} ${ccHex} ${valueHex}${delayFlag}${injectOutputFlag}`);
                } else {
                    lines.push(`${indent}  SND B${outputChannelHex} ${ccHex} XX${delayFlag}${injectOutputFlag}`);
                }
            } else if (rule.output.type === 'note') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const noteHex = toHex(rule.output.note);
                if (rule.output.velocityMode === 'constant') {
                    const velocityHex = toHex(rule.output.velocity);
                    lines.push(`${indent}  SND 9${outputChannelHex} ${noteHex} ${velocityHex}${delayFlag}${injectOutputFlag}`);
                } else {
                    lines.push(`${indent}  SND 9${outputChannelHex} ${noteHex} XX${delayFlag}${injectOutputFlag}`);
                }
            } else if (rule.output.type === 'program') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const programHex = toHex(rule.output.program);
                lines.push(`${indent}  SND C${outputChannelHex} ${programHex}${delayFlag}${injectOutputFlag}`);
            }
        } else {
            // STANDARD STYLE
            if (rule.output.type === 'cc') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const ccHex = toHex(rule.output.ccNumber);
                lines.push(`${indent}  ASS M0 = B${outputChannelHex}`);
                lines.push(`${indent}  ASS M1 = ${ccHex}`);
                if (rule.output.valueMode === 'constant') {
                    const valueHex = toHex(rule.output.constantValue);
                    lines.push(`${indent}  ASS M2 = ${valueHex}`);
                }
            } else if (rule.output.type === 'note') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const noteHex = toHex(rule.output.note);
                lines.push(`${indent}  ASS M0 = 9${outputChannelHex}`);
                lines.push(`${indent}  ASS M1 = ${noteHex}`);
                if (rule.output.velocityMode === 'constant') {
                    const velocityHex = toHex(rule.output.velocity);
                    lines.push(`${indent}  ASS M2 = ${velocityHex}`);
                }
            } else if (rule.output.type === 'program') {
                const outputChannelHex = toChannelHex(rule.output.channel);
                const programHex = toHex(rule.output.program);
                lines.push(`${indent}  ASS M0 = C${outputChannelHex}`);
                lines.push(`${indent}  ASS M1 = ${programHex}`);
            }

            const delayFlag = rule.output.delayMs > 0 ? ` +D${rule.output.delayMs}` : '';
            if (rule.output.type === 'program') {
                lines.push(`${indent}  SND M0 M1${delayFlag}`);
            } else {
                lines.push(`${indent}  SND M0 M1 M2${delayFlag}`);
            }
        }

        if (rule.trigger.consume === 'eat') {
            lines.push(`${indent}  BLOCK`);
        }

        if (rule.trigger.type === 'controlChange' && rule.trigger.valueMode === 'range') {
            lines.push(`  END`);
            lines.push(`  END`);
            lines.push(`END`);
        } else {
            lines.push(`END`);
        }

        return lines;
    }

    private getEffectiveTriggerName(rule: Rule): string {
        // This would need access to storage service, simplified for now
        if (rule.triggerSource.type === 'mapping' && rule.triggerSource.mappingName) {
            return rule.triggerSource.mappingName;
        } else if (rule.triggerSource.type === 'device') {
            return `Device ${rule.trigger.channel}`;
        } else if (rule.triggerSource.type === 'channel') {
            return `Channel ${rule.trigger.channel}`;
        }
        return `Channel ${rule.trigger.channel}`;
    }

    private getEffectiveConsumerName(rule: Rule): string {
        // This would need access to storage service, simplified for now
        if (rule.consumerSource.type === 'mapping' && rule.consumerSource.mappingName) {
            return rule.consumerSource.mappingName;
        } else if (rule.consumerSource.type === 'device') {
            return `Device ${rule.output.channel}`;
        } else if (rule.consumerSource.type === 'channel') {
            return `Channel ${rule.output.channel}`;
        }
        return `Channel ${rule.output.channel}`;
    }

    private getTriggerParamName(rule: Rule): string {
        // This would need access to storage service, simplified for now
        if (rule.trigger.type === 'controlChange') {
            return `CC ${rule.trigger.ccNumber}`;
        } else if (rule.trigger.type === 'noteOn') {
            if (rule.trigger.noteMode === 'specific') {
                return `Note ${rule.trigger.specificNote}`;
            } else {
                return 'any note';
            }
        }
        return 'unknown';
    }

    private getOutputParamName(rule: Rule): string {
        // This would need access to storage service, simplified for now
        if (rule.output.type === 'cc') {
            return `CC ${rule.output.ccNumber}`;
        } else if (rule.output.type === 'note') {
            return `Note ${rule.output.note}`;
        } else if (rule.output.type === 'program') {
            return `Program ${rule.output.program}`;
        }
        return 'unknown';
    }
}

function toHexCompare(value: any): string {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return `0x${num.toString(16).toUpperCase()}`;
}