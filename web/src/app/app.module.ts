import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ValidationComponent } from './validation/validation.component';
import { RulesComponent } from './rules/rules.component';
import { MappingEditorComponent } from './mapping-editor/mapping-editor.component';
import { TriggerMappingsComponent } from './trigger-mappings/trigger-mappings.component';
import { MappingsEditorComponent } from './mappings-editor/mappings-editor.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { StreambyterComponent } from './streambyter/streambyter.component';
@NgModule({
  declarations: [
    AppComponent,
    ValidationComponent,
    RulesComponent,
    MappingsEditorComponent,
    MappingEditorComponent,
    TriggerMappingsComponent,
    StreambyterComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    FormsModule,
    DragDropModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
