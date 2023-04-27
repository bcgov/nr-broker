import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarComponent } from './toolbar.component';
import { RolesDialogComponent } from './roles-dialog/roles-dialog.component';
import { MaterialModule } from '../../material.module';

@NgModule({
  declarations: [ToolbarComponent, RolesDialogComponent],
  imports: [CommonModule, MaterialModule],
  exports: [ToolbarComponent],
})
export class ToolbarModule {}
