import { Injectable } from '@angular/core';
import { Rule, createDefaultRule } from '../models/rule.model';
import { StorageService, TriggerMapping } from '../../services/storage.service';

@Injectable({
    providedIn: 'root'
})
export class RuleParserService {
    constructor(private storageService: StorageService) {}

    parseStreamByterScript(script: string, triggerMappings: TriggerMapping[]): Rule[] {
        const rules: Rule[] = [];
        const lines = script.split('\n');
        
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (line === '') {
                i++;
                continue;
            }
            
            // Check for CUSTOM_RULE marker
            if (line === '# == CUSTOM_RULE ==') {
                const rule = createDefaultRule();
                rule.type = 'custom';
                rule.enabled = true;
                
                let customCodeLines: string[] = [];
                i++;
                
                while (i < lines.length) {
                    const currentLine = lines[i];
                    if (currentLine.trim().startsWith('# == RULE') || 
                        currentLine.trim() === '# == CUSTOM_RULE ==') {
                        break;
                    }
                    customCodeLines.push(currentLine);
                    i++;
                }
                
                rule.customCode = customCodeLines.join('\n').trim();
                rule.name = "Custom Rule";
                rules.push(rule);
                continue;
            }
            
            // Check for RULE marker
            if (!line.startsWith('# == RULE')) {
                i++;
                continue;
            }
            
            // Parse trigger source type
            let triggerSourceType: 'mapping' | 'device' | 'channel' = 'channel';
            let triggerSourceValue: string | number = 1;
            let mappingName: string | null = null;
            
            // Parse consumer source type
            let consumerSourceType: 'mapping' | 'device' | 'channel' = 'channel';
            let consumerSourceValue: string | number = 1;
            let consumerMappingName: string | null = null;
            let hasConsumerSourceLine = false;
            
            // Detected values
            let detectedOutputChannel: number | null = null;
            let detectedOutputType: string | null = null;
            let detectedCcNumber: number | null = null;
            let detectedNoteNumber: number | null = null;
            let detectedProgramNumber: number | null = null;
            let detectedConstantValue: number | null = null;
            let detectedVelocity: number | null = null;
            
            // Look ahead for trigger-source line
            let nextLineIndex = i + 1;
            if (nextLineIndex < lines.length && lines[nextLineIndex].trim().startsWith('# trigger-source:')) {
                const triggerSourceLine = lines[nextLineIndex].trim();
                let match = triggerSourceLine.match(/# trigger-source:\s*\[mapping\]\s*"([^"]+)"/);
                if (match) {
                    triggerSourceType = 'mapping';
                    mappingName = match[1];
                    triggerSourceValue = mappingName;
                    i++;
                } else {
                    match = triggerSourceLine.match(/# trigger-source:\s*\[device\]\s*"?(\d+)"?/);
                    if (match) {
                        triggerSourceType = 'device';
                        triggerSourceValue = parseInt(match[1], 10);
                        i++;
                    } else {
                        match = triggerSourceLine.match(/# trigger-source:\s*\[channel\]\s*"?(\d+)"?/);
                        if (match) {
                            triggerSourceType = 'channel';
                            triggerSourceValue = parseInt(match[1], 10);
                            i++;
                        }
                    }
                }
            }
            
            // Look ahead for consumer-source line
            nextLineIndex = i + 1;
            if (nextLineIndex < lines.length && lines[nextLineIndex].trim().startsWith('# consumer-source:')) {
                const consumerSourceLine = lines[nextLineIndex].trim();
                let match = consumerSourceLine.match(/# consumer-source:\s*\[mapping\]\s*"([^"]+)"/);
                if (match) {
                    consumerSourceType = 'mapping';
                    consumerMappingName = match[1];
                    consumerSourceValue = consumerMappingName;
                    hasConsumerSourceLine = true;
                    i++;
                } else {
                    match = consumerSourceLine.match(/# consumer-source:\s*\[device\]\s*"?(\d+)"?/);
                    if (match) {
                        consumerSourceType = 'device';
                        consumerSourceValue = parseInt(match[1], 10);
                        hasConsumerSourceLine = true;
                        i++;
                    } else {
                        match = consumerSourceLine.match(/# consumer-source:\s*\[channel\]\s*"?(\d+)"?/);
                        if (match) {
                            consumerSourceType = 'channel';
                            consumerSourceValue = parseInt(match[1], 10);
                            hasConsumerSourceLine = true;
                            i++;
                        }
                    }
                }
            }
            
            i++;
            if (i >= lines.length) break;
            
            // Get the condition line
            let conditionLine = lines[i].trim();
            while (conditionLine === '' && i < lines.length) {
                i++;
                conditionLine = lines[i].trim();
            }
            
            // Create a new rule
            const rule = createDefaultRule();
            rule.type = 'standard';
            rule.enabled = true;
            
            // Parse IF condition
            const rangeMatch = conditionLine.match(/IF\s+M0\s*==\s*B([0-9A-F])\s+([0-9A-F]{2})/i);
            if (rangeMatch) {
                const parsedChannel = parseInt(rangeMatch[1], 16) + 1;
                const triggerCC = parseInt(rangeMatch[2], 16);
                rule.trigger.type = 'controlChange';
                rule.trigger.ccNumber = triggerCC;
                rule.trigger.consume = 'eat';
                
                // Set trigger source
                if (triggerSourceType === 'mapping' && mappingName) {
                    const existingMapping = triggerMappings.find(m => m.name === mappingName);
                    if (existingMapping) {
                        rule.triggerSource = {
                            type: 'mapping',
                            value: mappingName,
                            mappingName: mappingName
                        };
                        rule.trigger.channel = existingMapping.triggerMidiChannel;
                    } else {
                        rule.triggerSource = { type: 'channel', value: parsedChannel };
                        rule.trigger.channel = parsedChannel;
                    }
                } else if (triggerSourceType === 'device') {
                    rule.triggerSource = { type: 'device', value: triggerSourceValue as number };
                    rule.trigger.channel = triggerSourceValue as number;
                } else {
                    rule.triggerSource = { type: 'channel', value: triggerSourceValue as number };
                    rule.trigger.channel = triggerSourceValue as number;
                }
                
                // Parse nested IF statements to find output
                let j = i + 1;
                let foundEnd = false;
                let rangeMin: number | null = null;
                let rangeMax: number | null = null;
                let nestedLevel = 1;
                let hasBlock = false;
                let outputFound = false;
                
                while (j < lines.length && !foundEnd) {
                    const currentLine = lines[j].trim();
                    const strippedLine = currentLine.replace(/^\s+/, '');
                    
                    // Look for Program Change output (C)
                    const assM0PCMatch = strippedLine.match(/ASS\s+M0\s*=\s*C([0-9A-F])/i);
                    if (assM0PCMatch && !outputFound) {
                        rule.output.type = 'program';
                        rule.output.channel = parseInt(assM0PCMatch[1], 16) + 1;
                        detectedOutputChannel = rule.output.channel;
                        detectedOutputType = 'program';
                        outputFound = true;
                        
                        const sameLineM1Match = strippedLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                        if (sameLineM1Match) {
                            const programValue = parseInt(sameLineM1Match[1], 16);
                            rule.output.program = programValue;
                            detectedProgramNumber = programValue;
                        }
                        j++;
                        continue;
                    }
                    
                    // Look for CC output (B)
                    const assM0CCMatch = strippedLine.match(/ASS\s+M0\s*=\s*B([0-9A-F])/i);
                    if (assM0CCMatch && !outputFound) {
                        rule.output.type = 'cc';
                        rule.output.channel = parseInt(assM0CCMatch[1], 16) + 1;
                        detectedOutputChannel = rule.output.channel;
                        detectedOutputType = 'cc';
                        outputFound = true;
                        j++;
                        continue;
                    }
                    
                    // Look for Note output (9)
                    const assM0NoteMatch = strippedLine.match(/ASS\s+M0\s*=\s*9([0-9A-F])/i);
                    if (assM0NoteMatch && !outputFound) {
                        rule.output.type = 'note';
                        rule.output.channel = parseInt(assM0NoteMatch[1], 16) + 1;
                        detectedOutputChannel = rule.output.channel;
                        detectedOutputType = 'note';
                        outputFound = true;
                        j++;
                        continue;
                    }
                    
                    // Look for ASS M1
                    const assM1Match = strippedLine.match(/ASS\s+M1\s*=\s*([0-9A-F]{2})/i);
                    if (assM1Match) {
                        const value = parseInt(assM1Match[1], 16);
                        if (rule.output.type === 'cc') {
                            rule.output.ccNumber = value;
                            detectedCcNumber = value;
                        } else if (rule.output.type === 'program') {
                            rule.output.program = value;
                            detectedProgramNumber = value;
                        } else if (rule.output.type === 'note') {
                            rule.output.note = value;
                            detectedNoteNumber = value;
                        }
                    }
                    
                    // Look for ASS M2
                    const assM2Match = strippedLine.match(/ASS\s+M2\s*=\s*([0-9A-F]{2})/i);
                    if (assM2Match) {
                        const value = parseInt(assM2Match[1], 16);
                        if (rule.output.type === 'cc') {
                            rule.output.valueMode = 'constant';
                            rule.output.constantValue = value;
                            detectedConstantValue = value;
                        } else if (rule.output.type === 'note') {
                            rule.output.velocityMode = 'constant';
                            rule.output.velocity = value;
                            detectedVelocity = value;
                        }
                    }
                    
                    // Check for range conditions
                    const minMatch = strippedLine.match(/IF\s+M2\s*>=\s*(?:0x)?([0-9A-F]+)/i);
                    if (minMatch && rangeMin === null) {
                        rangeMin = parseInt(minMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                    
                    const maxMatch = strippedLine.match(/IF\s+M2\s*<=\s*(?:0x)?([0-9A-F]+)/i);
                    if (maxMatch && rangeMax === null) {
                        rangeMax = parseInt(maxMatch[1], 16);
                        nestedLevel++;
                        j++;
                        continue;
                    }
                    
                    // Check for BLOCK
                    if (strippedLine.match(/BLOCK/i)) {
                        hasBlock = true;
                    }
                    
                    // Check for END
                    if (strippedLine.match(/^END$/i)) {
                        nestedLevel--;
                        if (nestedLevel === 0) {
                            foundEnd = true;
                            break;
                        }
                    }
                    
                    j++;
                }
                
                // Set output values from detected data
                if (detectedOutputType) {
                    rule.output.type = detectedOutputType as 'cc' | 'program' | 'note';
                }
                if (detectedCcNumber !== null) rule.output.ccNumber = detectedCcNumber;
                if (detectedNoteNumber !== null) rule.output.note = detectedNoteNumber;
                if (detectedProgramNumber !== null) rule.output.program = detectedProgramNumber;
                if (detectedConstantValue !== null) {
                    rule.output.valueMode = 'constant';
                    rule.output.constantValue = detectedConstantValue;
                }
                if (detectedVelocity !== null) {
                    rule.output.velocityMode = 'constant';
                    rule.output.velocity = detectedVelocity;
                }
                
                // Set consumer source
                if (hasConsumerSourceLine && consumerSourceType === 'mapping' && consumerMappingName) {
                    const consumerMappings = this.storageService.getConsumerMappings();
                    const existingMapping = consumerMappings.find(m => m.name === consumerMappingName);
                    if (existingMapping) {
                        rule.consumerSource = {
                            type: 'mapping',
                            value: consumerMappingName,
                            mappingName: consumerMappingName
                        };
                        rule.output.channel = existingMapping.triggerMidiChannel;
                        rule.showMappingSelector = true;
                        
                        // Try to find matching rule
                        let matchedRule = null;
                        if (detectedOutputType === 'cc' && detectedCcNumber !== null) {
                            matchedRule = existingMapping.rules.find(r => 
                                r.type === 'cc' && r.value === detectedCcNumber
                            );
                        } else if (detectedOutputType === 'note' && detectedNoteNumber !== null) {
                            matchedRule = existingMapping.rules.find(r => 
                                r.type === 'note' && r.value === detectedNoteNumber
                            );
                        } else if (detectedOutputType === 'program' && detectedProgramNumber !== null) {
                            matchedRule = existingMapping.rules.find(r => 
                                r.type === 'program' && r.value === detectedProgramNumber
                            );
                        }
                        
                        if (matchedRule) {
                            rule.selectedMappingRuleKey = `${matchedRule.type}_${matchedRule.value}_${matchedRule.dataValue !== undefined ? matchedRule.dataValue : 'null'}`;
                        }
                    } else {
                        rule.consumerSource = { type: 'channel', value: detectedOutputChannel || 1 };
                        rule.output.channel = detectedOutputChannel || 1;
                        rule.showMappingSelector = false;
                    }
                } else if (hasConsumerSourceLine && consumerSourceType === 'device') {
                    rule.consumerSource = { type: 'device', value: consumerSourceValue as number };
                    rule.output.channel = consumerSourceValue as number;
                    rule.showMappingSelector = false;
                } else if (hasConsumerSourceLine && consumerSourceType === 'channel') {
                    rule.consumerSource = { type: 'channel', value: consumerSourceValue as number };
                    rule.output.channel = consumerSourceValue as number;
                    rule.showMappingSelector = false;
                } else {
                    const fallbackChannel = detectedOutputChannel || 1;
                    const deviceMap = this.storageService.getDeviceMap();
                    const matchingDevice = deviceMap.find(d => d.midiChannel === fallbackChannel);
                    if (matchingDevice) {
                        rule.consumerSource = { type: 'device', value: fallbackChannel };
                    } else {
                        rule.consumerSource = { type: 'channel', value: fallbackChannel };
                    }
                    rule.output.channel = fallbackChannel;
                    rule.showMappingSelector = false;
                }
                
                rule.trigger.consume = hasBlock ? 'eat' : 'pass';
                if (rangeMin !== null && rangeMax !== null) {
                    rule.trigger.valueMode = 'range';
                    rule.trigger.rangeMin = rangeMin;
                    rule.trigger.rangeMax = rangeMax;
                } else {
                    rule.trigger.valueMode = 'any';
                }
                
                rules.push(rule);
                i = j;
                continue;
            }
            
            i++;
        }
        
        console.log(`Parsed ${rules.length} rules from script`);
        return rules;
    }

    generateStreamByterScript(rules: Rule[], fileName: string): string {
        // Implementation here (can reuse from your existing code)
        const lines: string[] = [];
        lines.push(`# ${fileName || 'StreamByter Script'}`);
        lines.push(`# Generated: ${new Date().toLocaleString()}`);
        lines.push('');
        
        const enabledRules = rules.filter(r => r.enabled);
        
        if (enabledRules.length === 0) {
            lines.push('# No enabled rules');
            return lines.join('\n');
        }
        
        let ruleCounter = 1;
        for (const rule of enabledRules) {
            if (rule.type === 'custom') {
                lines.push(`# == CUSTOM_RULE ==`);
                if (rule.customCode) {
                    lines.push(rule.customCode);
                }
                lines.push('');
            } else {
                // Generate rule header
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
                
                lines.push(`# == RULE ${ruleCounter}: [${srcDev}] ${srcParam}${rangeInfo} → [${dstDev}] ${dstParam} ==`);
                
                // Add source lines
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
                
                // Generate MIDI condition
                const ruleLines = this.generateStreamByterIIRule(rule);
                lines.push(...ruleLines);
                lines.push('');
                ruleCounter++;
            }
        }
        
        return lines.join('\n');
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
    
    private generateStreamByterIIRule(rule: Rule): string[] {
        const lines: string[] = [];
        const toHex = (value: any, padding: number = 2): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return num.toString(16).toUpperCase().padStart(padding, '0');
        };
        const toChannelHex = (channel: number): string => {
            return (channel - 1).toString(16).toUpperCase();
        };
        const toHexCompare = (value: any): string => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value;
            return `0x${num.toString(16).toUpperCase()}`;
        };
        
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
}