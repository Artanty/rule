import { Injectable } from '@angular/core';
import { Rule } from './rule.service';

@Injectable({
    providedIn: 'root'
})
export class FileService {

    exportAsSbr(script: string, fileName: string): void {
        const blob = new Blob([script], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName || 'streambyter'}.sbr`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportAsJson(rules: Rule[], script: string, fileName: string): void {
        const data = {
            rules: rules,
            script: script,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName || 'streambyter'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importFromJson(file: File): Promise<{ rules: Rule[], script?: string }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    let rules: Rule[] = [];
                    let script: string | undefined;

                    if (json.rules) {
                        rules = this.convertFromExternal(json.rules);
                    } else if (json.script) {
                        script = json.script;
                        // Could parse script here if needed
                    }

                    resolve({ rules, script });
                } catch (ex) {
                    reject(ex);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    importFromSbr(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(content, 'text/xml');
                    const dict = xmlDoc.querySelector('dict');

                    if (dict) {
                        const keys = dict.querySelectorAll('key');
                        for (let i = 0; i < keys.length; i++) {
                            if (keys[i].textContent === 'StreamByter-Rules') {
                                const stringElement = keys[i].nextElementSibling as Element;
                                if (stringElement && stringElement.tagName === 'string') {
                                    const scriptContent = stringElement.textContent || '';
                                    resolve(scriptContent);
                                    return;
                                }
                            }
                        }
                    }
                    reject(new Error('No StreamByter rules found in .sbr file'));
                } catch (ex) {
                    reject(ex);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    copyToClipboard(text: string): Promise<void> {
        return navigator.clipboard.writeText(text);
    }

    private convertFromExternal(externalRules: any[]): Rule[] {
        // Convert external rule format to internal Rule format
        // This would need to handle different versions/formats
        return externalRules.map(ext => this.convertSingleRule(ext));
    }

    private convertSingleRule(ext: any): Rule {
        // Basic conversion - would need to handle all fields
        return {
            name: ext.name || 'Imported Rule',
            enabled: ext.enabled !== false,
            type: ext.type || 'standard',
            customCode: ext.customCode || '',
            collapsed: true,
            selected: false,
            triggerSource: ext.triggerSource || { type: 'channel', value: 1 },
            consumerSource: ext.consumerSource || { type: 'channel', value: 1 },
            output: ext.output || {
                type: 'cc',
                channel: 1,
                ccNumber: 0,
                valueMode: 'constant',
                constantValue: 0,
                program: 0,
                note: 60,
                velocity: 64,
                velocityMode: 'constant',
                delayMs: 0,
                injectOutput: false
            },
            trigger: ext.trigger || {
                type: 'controlChange',
                channel: 1,
                noteMode: 'specific',
                specificNote: 60,
                ccNumber: 0,
                valueMode: 'any',
                specificValue: 0,
                rangeMin: 0,
                rangeMax: 127,
                consume: 'eat',
                cloneTrigger: false
            }
        };
    }
}