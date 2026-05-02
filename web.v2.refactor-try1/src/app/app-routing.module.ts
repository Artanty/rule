import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RulesComponent } from './rules/rules.component';
import { ValidationComponent } from './validation/validation.component';
import { StreambyterComponent } from './streambyter/streambyter.component';
import { MappingEditorComponent } from './mapping-editor/mapping-editor.component';

const routes: Routes = [
  { path: '', component: RulesComponent, pathMatch: 'full' },
  { path: 'validator', component: ValidationComponent },
  { path: 'streambyter', component: StreambyterComponent },
  { path: 'mapping-editor', component: MappingEditorComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}