import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ValidationComponent } from './validation/validation.component';
import { RulesComponent } from './rules/rules.component';
import { StreambyterComponent } from './streambyter/streambyter.component';
import { MappingEditorComponent } from './mapping-editor/mapping-editor.component';
import { TriggerMappingsComponent } from './trigger-mappings/trigger-mappings.component';
import { MappingsEditorComponent } from './mappings-editor/mappings-editor.component';


// Streambyter Components

import { RuleListComponent } from './streambyter/components/rule-list/rule-list.component';
import { RuleItemComponent } from './streambyter/components/rule-item/rule-item.component';
import { TriggerSectionComponent } from './streambyter/components/trigger-section/trigger-section.component';
import { OutputSectionComponent } from './streambyter/components/output-section/output-section.component';
import { ConsumerMappingSelectorComponent } from './streambyter/components/consumer-mapping-selector/consumer-mapping-selector.component';
import { BulkActionsComponent } from './streambyter/components/bulk-actions/bulk-actions.component';


// Services
import { RuleParserService } from './streambyter/services/rule-parser.service';
import { RuleNameGeneratorService } from './streambyter/services/rule-name-generator.service';

@NgModule({
  declarations: [
    AppComponent,
    ValidationComponent,
    RulesComponent,
    MappingsEditorComponent,
    StreambyterComponent,
    MappingEditorComponent,
    TriggerMappingsComponent, //delete
    
     RuleListComponent,
        RuleItemComponent,
        TriggerSectionComponent,
        OutputSectionComponent,
        ConsumerMappingSelectorComponent,
        BulkActionsComponent,
        

  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    CommonModule,
    
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
