import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ValidationComponent } from './validation/validation.component';
import { RulesComponent } from './rules/rules.component';
import { StreambyterComponent } from './streambyter/streambyter.component';

@NgModule({
  declarations: [
    AppComponent,
    ValidationComponent,
    RulesComponent,
    StreambyterComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
