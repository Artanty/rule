import { Injectable } from '@angular/core';

export interface DeviceMapEntry {
  device: string;
  midiChannel: number;
}

export interface CcLibraryEntry {
  name: string;
  value: number;
  type: 'cc' | 'note';
}

export interface CcLibrary {
  [channel: string]: CcLibraryEntry[];
}

export interface TriggerMapping {
  name: string;
  triggerMidiChannel: number;
  triggerDeviceName: string;
  rules: TriggerRule[];
}

export interface TriggerRule {
  name: string;
  value: number;
  type: 'cc' | 'note';
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_DEVICE_MAP = 'mmv3_deviceMap';
  private readonly STORAGE_CC_LIBRARY = 'mmv3_ccLibrary_typed';
  private readonly STORAGE_TRIGGER_MAPPINGS = 'mmv3_trigger_mappings';
    
  getDeviceMap(): DeviceMapEntry[] {
    const stored = localStorage.getItem(this.STORAGE_DEVICE_MAP);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  }
    
  saveDeviceMap(deviceMap: DeviceMapEntry[]): void {
    localStorage.setItem(this.STORAGE_DEVICE_MAP, JSON.stringify(deviceMap));
  }
    
  getCcLibrary(): CcLibrary {
    const stored = localStorage.getItem(this.STORAGE_CC_LIBRARY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return {};
      }
    }
    return {};
  }
    
  saveCcLibrary(ccLibrary: CcLibrary): void {
    localStorage.setItem(this.STORAGE_CC_LIBRARY, JSON.stringify(ccLibrary));
  }
    
  getDeviceName(channel: number): string {
    const deviceMap = this.getDeviceMap();
    const entry = deviceMap.find(d => Number(d.midiChannel) === Number(channel));
    return entry ? entry.device : `ch${channel}`;
  }
    
  getParamName(channel: number, type: 'cc' | 'note', value: number): string {
    const ccLibrary = this.getCcLibrary();
    const chStr = String(channel);
    if (ccLibrary[chStr]) {
      const found = ccLibrary[chStr].find(e => e.value === value && e.type === type);
      if (found) return found.name;
    }
    return type === 'cc' ? `CC#${value}` : `Note#${value}`;
  }

  // Trigger Mapping methods
  getTriggerMappings(): TriggerMapping[] {
    const stored = localStorage.getItem(this.STORAGE_TRIGGER_MAPPINGS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  saveTriggerMappings(mappings: TriggerMapping[]): void {
    localStorage.setItem(this.STORAGE_TRIGGER_MAPPINGS, JSON.stringify(mappings));
  }

  addTriggerMapping(mapping: TriggerMapping): void {
    const mappings = this.getTriggerMappings();
    // Check if mapping with same name exists
    const existingIndex = mappings.findIndex(m => m.name === mapping.name);
    if (existingIndex !== -1) {
      // Update existing
      mappings[existingIndex] = mapping;
    } else {
      // Add new
      mappings.push(mapping);
    }
    this.saveTriggerMappings(mappings);
  }

  deleteTriggerMapping(name: string): void {
    const mappings = this.getTriggerMappings();
    const filtered = mappings.filter(m => m.name !== name);
    this.saveTriggerMappings(filtered);
  }

  getTriggerMapping(name: string): TriggerMapping | undefined {
    const mappings = this.getTriggerMappings();
    return mappings.find(m => m.name === name);
  }
}