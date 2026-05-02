export interface TriggerSource {
    type: 'mapping' | 'device' | 'channel';
    value: string | number;
    mappingName?: string;
}

export interface ConsumerSource {
    type: 'mapping' | 'device' | 'channel';
    value: string | number;
    mappingName?: string;
}

export interface OutputSettings {
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
}

export interface TriggerSettings {
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
}

export interface Rule {
    name: string;
    enabled: boolean;
    type: 'standard' | 'custom';
    customCode?: string;
    collapsed?: boolean;
    selected?: boolean;
    showMappingSelector?: boolean;
    selectedMappingRuleKey?: any;
    triggerSource: TriggerSource;
    consumerSource: ConsumerSource;
    output: OutputSettings;
    trigger: TriggerSettings;
}

export const createDefaultRule = (): Rule => ({
    name: "New Rule",
    enabled: true,
    type: 'standard',
    customCode: '',
    collapsed: true,
    selected: false,
    showMappingSelector: false,
    selectedMappingRuleKey: undefined,
    triggerSource: {
        type: 'channel',
        value: 1
    },
    consumerSource: {
        type: 'channel',
        value: 1
    },
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
        delayMs: 0
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
        consume: "eat"
    }
});