import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Интерфейсы (те же самые)
interface DeviceMapEntry {
  device: string;
  midiChannel: number;
}

interface CcLibraryEntry {
  name: string;
  value: number;
  type: 'cc' | 'note';
}

interface CcLibrary {
  [channel: string]: CcLibraryEntry[];
}

interface RuleOutput {
  type: 'cc' | 'program' | 'note';
  channel: number;
  ccNumber: number;
  valueMode: 'constant' | 'trigger';
  constantValue: number;
  bank: number;
  program: number;
  note: number;
  velocity: number;
  velocityMode: 'constant' | 'trigger';
  delayMs: number;
}

interface RuleTrigger {
  type: 'noteOn' | 'controlChange';
  channel: number;
  noteMode: 'specific' | 'any';
  specificNote: number;
  ccNumber: number;
  valueMode: 'specific' | 'any';
  specificValue: number;
  consume: 'eat' | 'pass';
}

interface Rule {
  name: string;
  enabled: boolean;
  output: RuleOutput;
  trigger: RuleTrigger;
}

@Component({
  selector: 'app-rules',
  standalone: false,
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.scss'
})
export class RulesComponent implements OnInit {
  title = '🎛️ MMv3 Angular';
    
  // Данные
  deviceMap: DeviceMapEntry[] = [];
  ccLibrary: CcLibrary = {};
  rules: Rule[] = [];
    
  // Временные переменные для UI
  selectedCcChannel: number = 1;
    
  // Ссылки на скрытые file input'ы
  importFileInputId = 'importFileInput';
  deviceMapInputId = 'deviceMapInput';
  ccMapInputId = 'ccMapInput';
    
  // Константы
  private readonly STORAGE_DEVICE_MAP = 'mmv3_deviceMap';
  private readonly STORAGE_CC_LIBRARY = 'mmv3_ccLibrary_typed';
    
  private readonly DEFAULT_RULE: Rule = {
    name: "New rule",
    enabled: true,
    output: {
      type: "cc",
      channel: 1,
      ccNumber: 0,
      valueMode: "constant",
      constantValue: 0,
      bank: 0,
      program: 0,
      note: 60,
      velocity: 64,
      velocityMode: "constant",
      delayMs: 0
    },
    trigger: {
      type: "noteOn",
      channel: 1,
      noteMode: "specific",
      specificNote: 60,
      ccNumber: 0,
      valueMode: "any",
      specificValue: 0,
      consume: "eat"
    }
  };
    
  ngOnInit() {
    this.loadStoredMaps();
    this.loadExampleRules();
  }
    
  // ========== Вспомогательные методы для работы с file input ==========
    
  triggerImportFile() {
    const input = document.getElementById(this.importFileInputId) as HTMLInputElement;
    if (input) input.click();
  }
    
  triggerDeviceMapUpload() {
    const input = document.getElementById(this.deviceMapInputId) as HTMLInputElement;
    if (input) input.click();
  }
    
  triggerCcMapUpload() {
    const input = document.getElementById(this.ccMapInputId) as HTMLInputElement;
    if (input) input.click();
  }
    
  // ========== Хранение ==========
    
  loadStoredMaps() {
    const storedDevice = localStorage.getItem(this.STORAGE_DEVICE_MAP);
    if (storedDevice) {
      try { this.deviceMap = JSON.parse(storedDevice); } catch (e) { this.deviceMap = []; }
    }
        
    const storedCc = localStorage.getItem(this.STORAGE_CC_LIBRARY);
    if (storedCc) {
      try { this.ccLibrary = JSON.parse(storedCc); } catch (e) { this.ccLibrary = {}; }
    }
        
    if (!this.deviceMap.length) {
      this.deviceMap = [
        { device: "hub", midiChannel: 1 },
        { device: "c4", midiChannel: 2 },
        { device: "ash", midiChannel: 3 },
        { device: "ultrawave", midiChannel: 4 },
        { device: "mgranny", midiChannel: 12 },
        { device: "korg", midiChannel: 16 },
        { device: "zoom L6", midiChannel: 7 }
      ];
      this.saveDeviceMap();
    }
  }
    
  saveDeviceMap() {
    localStorage.setItem(this.STORAGE_DEVICE_MAP, JSON.stringify(this.deviceMap));
  }
    
  saveCcLibrary() {
    localStorage.setItem(this.STORAGE_CC_LIBRARY, JSON.stringify(this.ccLibrary));
  }
    
  // ========== Утилиты ==========
    
  getDeviceShortName(channel: number): string {
    const entry = this.deviceMap.find(d => d.midiChannel === channel);
    return entry ? entry.device : `ch${channel}`;
  }
    
  getParamName(channel: number, type: 'cc' | 'note', value: number): string {
    const chStr = String(channel);
    if (this.ccLibrary[chStr]) {
      const found = this.ccLibrary[chStr].find(e => e.value === value && e.type === type);
      if (found) return found.name;
    }
    return type === 'cc' ? `CC#${value}` : `Note#${value}`;
  }
    
  getOptionsForType(channel: number, type: 'cc' | 'note', selectedVal?: number): { name: string; value: number }[] {
    const chStr = String(channel);
    let entries: CcLibraryEntry[] = [];
        
    if (this.ccLibrary[chStr]) {
      entries = this.ccLibrary[chStr].filter(e => e.type === type);
    }
        
    if (entries.length === 0) {
      for (let i = 0; i <= 127; i++) {
        entries.push({ name: `${type === 'cc' ? 'CC' : 'Note'}#${i}`, value: i, type });
      }
    }
        
    return entries.map(e => ({ name: `${e.name} (${e.value})`, value: e.value }));
  }
    
  generateSmartName(rule: Rule): string {
    const targetDev = this.getDeviceShortName(rule.output.channel);
    let targetParam = '';
        
    if (rule.output.type === 'cc') {
      targetParam = this.getParamName(rule.output.channel, 'cc', rule.output.ccNumber);
    } else if (rule.output.type === 'program') {
      targetParam = `Program ${rule.output.program}`;
    } else if (rule.output.type === 'note') {
      targetParam = this.getParamName(rule.output.channel, 'note', rule.output.note);
    }
        
    const srcDev = this.getDeviceShortName(rule.trigger.channel);
    return `set [${targetDev}] ${targetParam} from [${srcDev}]`;
  }
    
  // ========== Импорт/Экспорт ==========
    
  importFromExternal(arr: any[]): Rule[] {
    const list: Rule[] = [];
        
    for (const ext of arr) {
      try {
        const r = JSON.parse(JSON.stringify(this.DEFAULT_RULE));
        r.name = ext.name || "Unnamed";
        r.enabled = ext.enabled !== undefined ? ext.enabled : true;
                
        if (ext.output?.message?.Protocol) {
          const p = ext.output.message.Protocol;
          r.output.channel = p.channel[0].source.Constant._0 + 1;
          r.output.delayMs = ext.output.delay?.ms || 0;
                    
          if (p._0 === 176) {
            r.output.type = "cc";
            r.output.ccNumber = p.data1[0].source.Constant._0;
            if (p.data2.source.Constant) {
              r.output.valueMode = "constant";
              r.output.constantValue = p.data2.source.Constant._0;
            } else if (p.data2.source.FromTrigger) {
              r.output.valueMode = "trigger";
            }
          } else if (p._0 === 144) {
            r.output.type = "note";
            r.output.note = p.data1[0].source.Constant._0;
            if (p.data2.source.Constant) {
              r.output.velocityMode = "constant";
              r.output.velocity = p.data2.source.Constant._0;
            } else if (p.data2.source.FromTrigger) {
              r.output.velocityMode = "trigger";
            }
          }
        } else if (ext.output?.message?.ProgramChange) {
          const pg = ext.output.message.ProgramChange;
          r.output.type = "program";
          r.output.channel = pg.channel[0].source.Constant._0 + 1;
          r.output.bank = pg.bank.source.Constant._0;
          r.output.program = pg.program.source.Constant._0;
          r.output.delayMs = ext.output.delay?.ms || 0;
        }
                
        if (ext.trigger?.MessageBased?._0) {
          const mb = ext.trigger.MessageBased._0;
          if (mb.passTrough) {
            r.trigger.consume = mb.passTrough.EatMatching ? "eat" : "pass";
          }
                    
          const vc = mb.variants.VoiceCategory._0;
          let ch = 1;
          const rv = vc.enabledChannels.rawValue;
          for (let i = 0; i < 16; i++) {
            if (rv & (1 << i)) { ch = i + 1; break; }
          }
          r.trigger.channel = ch;
                    
          if (vc.variants.NoteOn) {
            r.trigger.type = "noteOn";
            const nd = vc.variants.NoteOn._0;
            const f = nd.displayedRanges[0].first;
            const l = nd.displayedRanges[0].last;
            r.trigger.noteMode = (f === 0 && l === 127) ? "any" : "specific";
            if (r.trigger.noteMode === 'specific') r.trigger.specificNote = f;
          } else if (vc.variants.ControlChange) {
            r.trigger.type = "controlChange";
            r.trigger.ccNumber = vc.variants.ControlChange._0.displayedRanges[0].first;
            const vf = vc.variants.ControlChange._1.displayedRanges[0].first;
            const vl = vc.variants.ControlChange._1.displayedRanges[0].last;
            r.trigger.valueMode = (vf === 0 && vl === 127) ? "any" : "specific";
            if (r.trigger.valueMode === 'specific') r.trigger.specificValue = vf;
          }
        }
                
        if (!r.name || r.name === '' || r.name === 'null') {
          r.name = this.generateSmartName(r);
        }
                
        list.push(r);
      } catch (e) {
        console.warn("import rule error", e);
      }
    }
        
    return list;
  }
    
  // ========== Импорт/Экспорт ==========

  exportToExternal(): any {
    const ext: any[] = [];
    
    for (const r of this.rules) {
      let outMsg: any = {};
        
      if (r.output.type === 'cc') {
        outMsg = {
          Protocol: {
            _0: 176,
            channel: [{ 
              source: { Constant: { _0: Number(r.output.channel) - 1 } }, 
              ops: [] 
            }],
            data1: [{ 
              source: { Constant: { _0: Number(r.output.ccNumber) } }, 
              ops: [] 
            }],
            data2: r.output.valueMode === 'constant'
              ? { source: { Constant: { _0: Number(r.output.constantValue) } }, ops: [] }
              : { source: { FromTrigger: { _0: { ControlerValue: {} } } }, ops: [] }
          }
        };
      } else if (r.output.type === 'note') {
        const data2 = r.output.velocityMode === 'constant'
          ? { source: { Constant: { _0: Number(r.output.velocity) } }, ops: [] }
          : { source: { FromTrigger: { _0: { ControlerValue: {} } } }, ops: [] };
        outMsg = {
          Protocol: {
            _0: 144,
            channel: [{ 
              source: { Constant: { _0: Number(r.output.channel) - 1 } }, 
              ops: [] 
            }],
            data1: [{ 
              source: { Constant: { _0: Number(r.output.note) } }, 
              ops: [] 
            }],
            data2
          }
        };
      } else if (r.output.type === 'program') {
        outMsg = {
          ProgramChange: {
            bank: { source: { Constant: { _0: Number(r.output.bank) } }, ops: [] },
            channel: [{ 
              source: { Constant: { _0: Number(r.output.channel) - 1 } }, 
              ops: [] 
            }],
            program: { source: { Constant: { _0: Number(r.output.program) } }, ops: [] }
          }
        };
      }
        
      const bit = 1 << (Number(r.trigger.channel) - 1);
      let variants: any = {
        VoiceCategory: {
          _0: {
            enabledChannels: { rawValue: bit },
            variants: {}
          }
        }
      };
        
      if (r.trigger.type === 'noteOn') {
        const f = r.trigger.noteMode === 'any' ? 0 : Number(r.trigger.specificNote);
        const l = r.trigger.noteMode === 'any' ? 127 : Number(r.trigger.specificNote);
        variants.VoiceCategory._0.variants.NoteOn = {
          _0: {
            displayedRanges: [{ first: f, last: l }],
            implRanges: [{ first: f, last: l }]
          }
        };
      } else {
        const vf = r.trigger.valueMode === 'any' ? 0 : Number(r.trigger.specificValue);
        const vl = r.trigger.valueMode === 'any' ? 127 : Number(r.trigger.specificValue);
        variants.VoiceCategory._0.variants.ControlChange = {
          _0: {
            displayedRanges: [{ 
              first: Number(r.trigger.ccNumber), 
              last: Number(r.trigger.ccNumber) 
            }],
            implRanges: [{ 
              first: Number(r.trigger.ccNumber), 
              last: Number(r.trigger.ccNumber) 
            }]
          },
          _1: {
            displayedRanges: [{ first: vf, last: vl }],
            implRanges: [{ first: vf, last: vl }]
          }
        };
      }
        
      const trig = {
        MessageBased: {
          _0: {
            variants,
            passTrough: r.trigger.consume === 'eat' ? { EatMatching: {} } : { PassThrough: {} }
          }
        }
      };
        
      ext.push({
        enabled: r.enabled,
        name: r.name,
        valid: true,
        output: { delay: { ms: Number(r.output.delayMs) || 0 }, message: outMsg },
        trigger: trig
      });
    }
    
    return { rules: ext };
  }
    
  loadExampleRules() {
    const exampleJson = {
      "rules": [
        {
          "trigger": {
            "MessageBased": {
              "_0": {
                "passTrough": { "EatMatching": {} },
                "variants": {
                  "VoiceCategory": {
                    "_0": {
                      "variants": {
                        "NoteOn": {
                          "_0": {
                            "displayedRanges": [{ "first": 84, "last": 84 }],
                            "implRanges": [{ "last": 84, "first": 84 }]
                          }
                        }
                      },
                      "enabledChannels": { "rawValue": 4096 }
                    }
                  }
                }
              }
            }
          },
          "enabled": true,
          "name": "Message #1",
          "output": {
            "delay": { "ms": 0 },
            "message": {
              "Protocol": {
                "data1": [{ "source": { "Constant": { "_0": 127 } }, "ops": [] }],
                "_0": 176,
                "channel": [{ "source": { "Constant": { "_0": 12 } }, "ops": [] }],
                "data2": { "source": { "Constant": { "_0": 0 } }, "ops": [] }
              }
            }
          },
          "valid": true
        }
      ]
    };
        
    if (exampleJson.rules) {
      this.rules = this.importFromExternal(exampleJson.rules);
    }
  }
    
  // ========== CRUD правил ==========
    
  addRule() {
    const newRule = JSON.parse(JSON.stringify(this.DEFAULT_RULE));
    newRule.name = `Message #${this.rules.length + 1}`;
    this.rules.push(newRule);
  }
    
  deleteRule(index: number) {
    this.rules.splice(index, 1);
  }
    
  duplicateRule(index: number) {
    const copy = JSON.parse(JSON.stringify(this.rules[index]));
    copy.name = copy.name + ' (copy)';
    this.rules.splice(index + 1, 0, copy);
  }
    
  updateRuleName(index: number, name: string) {
    if (!name || name.trim() === '') {
      name = this.generateSmartName(this.rules[index]);
    }
    this.rules[index].name = name;
  }
    
  generateNameForRule(index: number) {
    this.rules[index].name = this.generateSmartName(this.rules[index]);
  }
    
  // ========== Импорт/Экспорт файлов ==========
    
  onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
        
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.rules) {
          this.rules = this.importFromExternal(json.rules);
        }
      } catch (ex) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
    
  onExport() {
    const ext = this.exportToExternal();
    const blob = new Blob([JSON.stringify(ext, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mm_rules.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
    
  // ========== Device Map ==========
    
  onUploadDeviceMap(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
        
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arr = JSON.parse(e.target?.result as string);
        if (Array.isArray(arr)) {
          this.deviceMap = arr;
          this.saveDeviceMap();
        }
      } catch (ex) {
        alert('Invalid device map JSON');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
    
  clearDeviceMap() {
    this.deviceMap = [];
    this.saveDeviceMap();
  }
    
  // ========== CC Library ==========
    
  onUploadCcMap(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
        
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arr = JSON.parse(e.target?.result as string);
        if (Array.isArray(arr)) {
          this.ccLibrary[String(this.selectedCcChannel)] = arr;
          this.saveCcLibrary();
        }
      } catch (ex) {
        alert('Invalid CC map JSON');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
    
  clearAllCcMaps() {
    this.ccLibrary = {};
    this.saveCcLibrary();
  }
    
  // ========== Вспомогательные методы для шаблона ==========
    
  getDeviceMapStatus(): string {
    return this.deviceMap.length ? `${this.deviceMap.length} devices` : 'none';
  }
    
  getCcLibStatus(): string {
    const chCount = Object.keys(this.ccLibrary).length;
    return chCount ? `${chCount} ch maps (typed)` : 'none';
  }
    
  trackByIndex(index: number): number {
    return index;
  }
}