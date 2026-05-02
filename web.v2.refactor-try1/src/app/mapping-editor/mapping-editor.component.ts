import { Component, OnInit } from '@angular/core';
import { StorageService, DeviceMapEntry, CcLibraryEntry } from '../services/storage.service';

interface MappingEntry {
  name: string;
  value: number;
  type: 'cc' | 'note';
}

@Component({
  selector: 'app-mapping-editor',
  templateUrl: './mapping-editor.component.html',
  styleUrls: ['./mapping-editor.component.scss'],
  standalone: false,
})
export class MappingEditorComponent implements OnInit {
  // Данные
  deviceMap: DeviceMapEntry[] = [];
  ccLibrary: { [channel: string]: CcLibraryEntry[] } = {};
    
  // Текущее редактирование
  selectedChannel: number = 1;
  selectedMappingType: 'cc' | 'note' = 'cc';
    
  // Массив для редактирования (0-127)
  editingEntries: { value: number; name: string; type: 'cc' | 'note' }[] = [];
    
  // Импорт/экспорт
  exportFileName: string = '';
    
  // ID для file input'ов
  importFileInputId = 'importFileInput';
  importAllInputId = 'importAllInput';
    
  // Доступные каналы
  channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    
  // Пагинация
  currentPage: number = 0;
  pageSize: number = 16;
  pageSizes = [8, 16, 32, 64, 128];
    
  constructor(private storageService: StorageService) {}
    
  ngOnInit() {
    this.loadData();
  }
    
  triggerImportFile() {
    const input = document.getElementById(this.importFileInputId) as HTMLInputElement;
    if (input) input.click();
  }
    
  triggerImportAll() {
    const input = document.getElementById(this.importAllInputId) as HTMLInputElement;
    if (input) input.click();
  }
    
  loadData() {
    this.deviceMap = this.storageService.getDeviceMap();
    this.ccLibrary = this.storageService.getCcLibrary();
    this.loadCurrentChannelMappings();
  }
    
  getDeviceName(channel: number): string {
    return this.storageService.getDeviceName(channel);
  }
    
  loadCurrentChannelMappings() {
    const chStr = String(this.selectedChannel);
    const existingMappings = this.ccLibrary[chStr]?.filter(e => e.type === this.selectedMappingType) || [];
        
    // Создаем массив для всех значений 0-127
    this.editingEntries = [];
    for (let i = 0; i <= 127; i++) {
      const existing = existingMappings.find(e => e.value === i);
      this.editingEntries.push({
        value: i,
        name: existing?.name || '',
        type: this.selectedMappingType
      });
    }
        
    // Сбрасываем на первую страницу
    this.currentPage = 0;
  }
    
  onChannelChange() {
    this.loadCurrentChannelMappings();
  }
    
  onMappingTypeChange() {
    this.loadCurrentChannelMappings();
  }
    
  updateEntryName(value: number, newName: string) {
    const entry = this.editingEntries.find(e => e.value === value);
    if (entry) {
      entry.name = newName;
    }
  }
    
  saveAll() {
    const chStr = String(this.selectedChannel);
        
    // Фильтруем только непустые имена
    const nonEmptyEntries = this.editingEntries.filter(e => e.name && e.name.trim() !== '');
        
    // Сохраняем существующие маппинги других типов
    const otherTypeMappings = this.ccLibrary[chStr]?.filter(e => e.type !== this.selectedMappingType) || [];
        
    // Создаем новый массив маппингов
    this.ccLibrary[chStr] = [
      ...otherTypeMappings,
      ...nonEmptyEntries.map(e => ({
        name: e.name.trim(),
        value: e.value,
        type: this.selectedMappingType
      }))
    ];
        
    this.storageService.saveCcLibrary(this.ccLibrary);
    alert(`Saved ${nonEmptyEntries.length} ${this.selectedMappingType.toUpperCase()} mappings for channel ${this.selectedChannel}`);
        
    // Перезагружаем для обновления
    this.loadCurrentChannelMappings();
  }
    
  clearAllMappings() {
    if (confirm(`Clear all ${this.selectedMappingType.toUpperCase()} mappings for channel ${this.selectedChannel}?`)) {
      const chStr = String(this.selectedChannel);
      if (this.ccLibrary[chStr]) {
        this.ccLibrary[chStr] = this.ccLibrary[chStr].filter(e => e.type !== this.selectedMappingType);
        this.storageService.saveCcLibrary(this.ccLibrary);
        this.loadCurrentChannelMappings();
        alert(`Cleared all ${this.selectedMappingType.toUpperCase()} mappings`);
      }
    }
  }
    
  clearAllChannels() {
    if (confirm('Clear ALL mappings for ALL channels? This cannot be undone!')) {
      this.ccLibrary = {};
      this.storageService.saveCcLibrary(this.ccLibrary);
      this.loadCurrentChannelMappings();
      alert('All mappings cleared');
    }
  }
    
  fillPattern() {
    const pattern = prompt(
      'Fill pattern (e.g., "Volume #" or "CC#"):\nUse # as placeholder for the number',
      'Volume #'
    );
    if (!pattern) return;
    
    for (let i = 0; i <= 127; i++) {
      const name = pattern.replace(/#/g, String(i));
      const entry = this.editingEntries.find(e => e.value === i);
      if (entry) {
        entry.name = name;
      }
    }
  }
    
  clearAllNames() {
    if (confirm('Clear all names? This will remove all names for current channel/type.')) {
      for (let i = 0; i <= 127; i++) {
        const entry = this.editingEntries.find(e => e.value === i);
        if (entry) {
          entry.name = '';
        }
      }
    }
  }
    
  copyFromChannel() {
    const targetChannel = prompt('Enter channel number to copy from (1-16):', '1');
    if (!targetChannel) return;
        
    const chNum = parseInt(targetChannel);
    if (chNum < 1 || chNum > 16) {
      alert('Invalid channel number');
      return;
    }
        
    const chStr = String(chNum);
    const sourceMappings = this.ccLibrary[chStr]?.filter(e => e.type === this.selectedMappingType) || [];
        
    for (const mapping of sourceMappings) {
      const entry = this.editingEntries.find(e => e.value === mapping.value);
      if (entry) {
        entry.name = mapping.name;
      }
    }
        
    alert(`Copied ${sourceMappings.length} mappings from channel ${chNum}`);
  }
    
  // ========== Импорт/Экспорт ==========
    
  exportMappings() {
    const data = this.editingEntries.filter(e => e.name && e.name.trim() !== '');
        
    if (data.length === 0) {
      alert('No mappings to export');
      return;
    }
        
    const fileName = this.exportFileName.trim() || `${this.getDeviceName(this.selectedChannel)}-${this.selectedMappingType}`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
    
  onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
        
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          this.mergeImport(imported);
        } else {
          alert('Invalid format: expected array');
        }
      } catch (ex) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
    
  mergeImport(imported: any[]) {
    let added = 0;
        
    for (const item of imported) {
      if (item.name && typeof item.value === 'number' && item.value >= 0 && item.value <= 127) {
        const entry = this.editingEntries.find(e => e.value === item.value);
        if (entry) {
          if (!entry.name || entry.name.trim() === '') {
            added++;
          }
          entry.name = item.name;
        }
      }
    }
        
    alert(`Import complete!\nAdded/Updated: ${added} mappings`);
  }
    
  // ========== Управление страницами ==========
    
  getTotalPages(): number {
    return Math.ceil(128 / this.pageSize);
  }
    
  getPagedEntries(): { value: number; name: string; type: string }[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.editingEntries.slice(start, end);
  }
    
  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
    
  goToPage(page: number) {
    if (page >= 0 && page < this.getTotalPages()) {
      this.currentPage = page;
    }
  }
    
  nextPage() {
    if (this.currentPage + 1 < this.getTotalPages()) {
      this.currentPage++;
    }
  }
    
  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }
    
  // ========== Вспомогательные методы ==========
    
  getTotalMappingsCount(): number {
    return this.editingEntries.filter(e => e.name && e.name.trim() !== '').length;
  }
    
  downloadAllMappings() {
    const data = {
      exported: new Date().toISOString(),
      deviceMap: this.deviceMap,
      ccLibrary: this.ccLibrary
    };
        
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `all-mappings-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
    
  onUploadAllMappings(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
        
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.ccLibrary) {
          this.ccLibrary = data.ccLibrary;
          this.storageService.saveCcLibrary(this.ccLibrary);
          this.loadCurrentChannelMappings();
          alert('All mappings loaded successfully!');
        } else {
          alert('Invalid format: missing ccLibrary');
        }
      } catch (ex) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
    
  getValueRange(): string {
    const start = this.currentPage * this.pageSize;
    const end = Math.min(start + this.pageSize, 128);
    return `${start} - ${end - 1}`;
  }
  getPlaceholderText(): string {
    return 'Enter ' + this.selectedMappingType.toUpperCase() + ' name...';
  }
  getValueAt(row: number, col: number): number {
    return row * 8 + col;
  }

  getEntryName(value: number): string {
    const entry = this.editingEntries.find(e => e.value === value);
    return entry?.name || '';
  }
}