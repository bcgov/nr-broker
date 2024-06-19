import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CollectionConfigInstanceRestDto } from '../../service/dto/collection-config-rest.dto';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-team-service-request',
  standalone: true,
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
  @Input()
  serviceSearch!: CollectionConfigInstanceRestDto[];
  serviceControl = new FormControl<CollectionConfigInstanceRestDto | null>(
    null,
    Validators.required,
  );
  selectFormControl = new FormControl('', Validators.required);

  constructor(private readonly dialog: MatDialog) {}
  requestService() {
    console.log('requestService');

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
