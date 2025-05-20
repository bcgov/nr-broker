import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CollectionConfigInstanceDto } from '../../service/persistence/dto/collection-config.dto';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-team-service-request',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './team-service-request.component.html',
  styleUrl: './team-service-request.component.scss',
})
export class TeamServiceRequestComponent {
  readonly serviceSearch = input.required<CollectionConfigInstanceDto[]>();

  serviceControl = new FormControl<CollectionConfigInstanceDto | null>(
    null,
    Validators.required,
  );
  selectFormControl = new FormControl('', Validators.required);

  constructor(private readonly dialog: MatDialog) {}
  requestService() {
    console.log('requestService');
    console.log(this.serviceControl.value?.edge.prototype);

    // this.dialog
    //   .open(EdgeRequestDialogComponent, {
    //     width: '500px',
    //     data: {
    //       config: this.serviceControl.value,
    //     },
    //   })
    //   .afterClosed()
    //   .subscribe((result) => {
    //     console.log(result);
    //   });
  }
}
