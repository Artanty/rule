import { Component } from '@angular/core';

interface ValidationError {
  path: string;
  message: string;
  expected: any;
  actual: any;
}

@Component({
  selector: 'app-validation',
  standalone: false,
  templateUrl: './validation.component.html',
  styleUrl: './validation.component.scss'
})
export class ValidationComponent {
  validationResult: ValidationError[] = [];
  isValid: boolean = false;
  fileName: string = '';
    
  // Ссылка на file input
  fileInputId = 'validationFileInput';
    
  // Эталонные правила
  private readonly GOLDEN_RULES = {
    "rules": [
      {
        "enabled": true,
        "name": "Message #1",
        "valid": true,
        "output": {
          "delay": { "ms": 0 },
          "message": {
            "Protocol": {
              "_0": 176,
              "channel": [{ "source": { "Constant": { "_0": 12 } }, "ops": [] }],
              "data1": [{ "source": { "Constant": { "_0": 127 } }, "ops": [] }],
              "data2": { "source": { "Constant": { "_0": 0 } }, "ops": [] }
            }
          }
        },
        "trigger": {
          "MessageBased": {
            "_0": {
              "variants": {
                "VoiceCategory": {
                  "_0": {
                    "enabledChannels": { "rawValue": 4096 },
                    "variants": {
                      "NoteOn": {
                        "_0": {
                          "displayedRanges": [{ "first": 84, "last": 84 }],
                          "implRanges": [{ "first": 84, "last": 84 }]
                        }
                      }
                    }
                  }
                }
              },
              "passTrough": { "EatMatching": {} }
            }
          }
        }
      }
    ]
  };
    
  triggerFileInput() {
    const input = document.getElementById(this.fileInputId) as HTMLInputElement;
    if (input) input.click();
  }
    
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
        
    this.fileName = input.files[0].name;
    const file = input.files[0];
    const reader = new FileReader();
        
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        this.validateJson(json);
      } catch (ex) {
        this.validationResult = [{
          path: 'root',
          message: 'Invalid JSON format',
          expected: 'Valid JSON',
          actual: (ex as Error).message
        }];
        this.isValid = false;
      }
    };
        
    reader.readAsText(file);
    input.value = '';
  }
    
  validateJson(json: any) {
    const errors: ValidationError[] = [];
        
    if (!json.rules) {
      errors.push({
        path: 'root',
        message: 'Missing "rules" property',
        expected: 'object with rules array',
        actual: typeof json
      });
      this.validationResult = errors;
      this.isValid = false;
      return;
    }
        
    if (!Array.isArray(json.rules)) {
      errors.push({
        path: 'rules',
        message: 'rules must be an array',
        expected: 'array',
        actual: typeof json.rules
      });
      this.validationResult = errors;
      this.isValid = false;
      return;
    }
        
    json.rules.forEach((rule: any, ruleIndex: number) => {
      this.validateRule(rule, ruleIndex, errors);
    });
        
    this.validationResult = errors;
    this.isValid = errors.length === 0;
  }
    
  validateRule(rule: any, ruleIndex: number, errors: ValidationError[]) {
    const prefix = `rules[${ruleIndex}]`;
        
    if (rule.output?.message) {
      const msg = rule.output.message;
            
      if (msg.Protocol) {
        this.validateProtocol(msg.Protocol, prefix, errors);
      } else if (msg.ProgramChange) {
        this.validateProgramChange(msg.ProgramChange, prefix, errors);
      }
    }
        
    if (rule.trigger?.MessageBased?._0) {
      const mb = rule.trigger.MessageBased._0;
            
      if (mb.variants?.VoiceCategory?._0) {
        const vc = mb.variants.VoiceCategory._0;
                
        if (vc.enabledChannels && typeof vc.enabledChannels.rawValue !== 'number') {
          errors.push({
            path: `${prefix}.trigger.MessageBased._0.variants.VoiceCategory._0.enabledChannels.rawValue`,
            message: 'rawValue must be a number',
            expected: 'number',
            actual: typeof vc.enabledChannels.rawValue
          });
        }
                
        if (vc.variants.NoteOn) {
          this.validateNoteOn(vc.variants.NoteOn, prefix, errors);
        } else if (vc.variants.ControlChange) {
          this.validateControlChange(vc.variants.ControlChange, prefix, errors);
        }
      }
    }
  }
    
  validateProtocol(protocol: any, prefix: string, errors: ValidationError[]) {
    if (protocol._0 !== undefined && typeof protocol._0 !== 'number') {
      errors.push({
        path: `${prefix}.Protocol._0`,
        message: '_0 must be a number',
        expected: 'number (176 or 144)',
        actual: typeof protocol._0
      });
    }
        
    if (protocol.channel && protocol.channel[0]?.source?.Constant?._0 !== undefined) {
      const val = protocol.channel[0].source.Constant._0;
      if (typeof val !== 'number') {
        errors.push({
          path: `${prefix}.Protocol.channel[0].source.Constant._0`,
          message: 'Channel must be a number',
          expected: 'number (0-15)',
          actual: typeof val
        });
      }
    }
        
    if (protocol.data1 && protocol.data1[0]?.source?.Constant?._0 !== undefined) {
      const val = protocol.data1[0].source.Constant._0;
      if (typeof val !== 'number') {
        errors.push({
          path: `${prefix}.Protocol.data1[0].source.Constant._0`,
          message: 'CC/Note number must be a number',
          expected: 'number (0-127)',
          actual: typeof val
        });
      }
    }
        
    if (protocol.data2?.source?.Constant?._0 !== undefined) {
      const val = protocol.data2.source.Constant._0;
      if (typeof val !== 'number') {
        errors.push({
          path: `${prefix}.Protocol.data2.source.Constant._0`,
          message: 'Value must be a number',
          expected: 'number (0-127)',
          actual: typeof val
        });
      }
    }
  }
    
  validateProgramChange(pg: any, prefix: string, errors: ValidationError[]) {
    if (pg.bank?.source?.Constant?._0 !== undefined) {
      const val = pg.bank.source.Constant._0;
      if (typeof val !== 'number') {
        errors.push({
          path: `${prefix}.ProgramChange.bank.source.Constant._0`,
          message: 'Bank must be a number',
          expected: 'number',
          actual: typeof val
        });
      }
    }
        
    if (pg.program?.source?.Constant?._0 !== undefined) {
      const val = pg.program.source.Constant._0;
      if (typeof val !== 'number') {
        errors.push({
          path: `${prefix}.ProgramChange.program.source.Constant._0`,
          message: 'Program must be a number',
          expected: 'number',
          actual: typeof val
        });
      }
    }
        
    if (pg.channel && pg.channel[0]?.source?.Constant?._0 !== undefined) {
      const val = pg.channel[0].source.Constant._0;
      if (typeof val !== 'number') {
        errors.push({
          path: `${prefix}.ProgramChange.channel[0].source.Constant._0`,
          message: 'Channel must be a number',
          expected: 'number (0-15)',
          actual: typeof val
        });
      }
    }
  }
    
  validateNoteOn(noteOn: any, prefix: string, errors: ValidationError[]) {
    const ranges = noteOn._0?.displayedRanges?.[0];
    if (ranges) {
      if (typeof ranges.first !== 'number') {
        errors.push({
          path: `${prefix}.NoteOn._0.displayedRanges[0].first`,
          message: 'Note number must be a number',
          expected: 'number',
          actual: typeof ranges.first
        });
      }
      if (typeof ranges.last !== 'number') {
        errors.push({
          path: `${prefix}.NoteOn._0.displayedRanges[0].last`,
          message: 'Note number must be a number',
          expected: 'number',
          actual: typeof ranges.last
        });
      }
    }
  }
    
  validateControlChange(cc: any, prefix: string, errors: ValidationError[]) {
    const ccNum = cc._0?.displayedRanges?.[0];
    if (ccNum && typeof ccNum.first !== 'number') {
      errors.push({
        path: `${prefix}.ControlChange._0.displayedRanges[0].first`,
        message: 'CC number must be a number',
        expected: 'number',
        actual: typeof ccNum.first
      });
    }
        
    const valueRange = cc._1?.displayedRanges?.[0];
    if (valueRange && typeof valueRange.first !== 'number') {
      errors.push({
        path: `${prefix}.ControlChange._1.displayedRanges[0].first`,
        message: 'Value must be a number',
        expected: 'number',
        actual: typeof valueRange.first
      });
    }
  }
    
  clearValidation() {
    this.validationResult = [];
    this.isValid = false;
    this.fileName = '';
    const input = document.getElementById(this.fileInputId) as HTMLInputElement;
    if (input) input.value = '';
  }
    
  downloadCorrectExample() {
    const blob = new Blob([JSON.stringify(this.GOLDEN_RULES, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'correct-rules-example.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}