import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { CollectionFieldConfigNameMapped } from '../graph.types';
import { CollectionFieldConfigMap } from '../dto/collection-config-rest.dto';

@Component({
  selector: 'app-vertex-form-builder',
  templateUrl: './vertex-form-builder.component.html',
  styleUrls: ['./vertex-form-builder.component.scss'],
})
export class VertexFormBuilderComponent implements OnInit, OnChanges {
  @Output() onSubmit = new EventEmitter();
  @Input() fieldMap!: CollectionFieldConfigMap;
  @Input() data!: any;
  form!: FormGroup;
  fieldConfigs!: CollectionFieldConfigNameMapped[];

  ngOnInit() {
    const fieldCtrls: { [key: string]: FormGroup | FormControl } = {};
    const fieldConfigs: CollectionFieldConfigNameMapped[] = [];

    for (const name of Object.keys(this.fieldMap)) {
      fieldConfigs.push({
        name,
        ...this.fieldMap[name],
      });
    }
    // console.log(fieldConfigs);
    // console.log(this.data);

    for (const f of fieldConfigs) {
      const validators: ValidatorFn[] = [];
      if (f.required) {
        validators.push(Validators.required);
      }
      if (f.type === 'string') {
        fieldCtrls[f.name] = new FormControl(
          this.data && this.data[f.name] ? this.data[f.name] : '',
          validators,
        );
      }

      if (f.type === 'email') {
        validators.push(Validators.email);
        fieldCtrls[f.name] = new FormControl(
          this.data && this.data[f.name] ? this.data[f.name] : '',
          validators,
        );
      }

      if (f.type === 'url') {
        fieldCtrls[f.name] = new FormControl(
          this.data && this.data[f.name] ? this.data[f.name] : '',
          validators,
        );
      }

      if (f.type === 'json') {
        fieldCtrls[f.name] = new FormControl(
          this.data && this.data[f.name]
            ? JSON.stringify(this.data[f.name], undefined, 4)
            : '',
          validators,
        );
      }
      // else {
      //   // If checkbox, it needs mulitple
      //   const opts: { [key: string]: FormControl } = {};
      //   for (const opt of f.options) {
      //     opts[opt.key] = new FormControl(opt.value);
      //   }
      //   fieldCtrls[f.name] = new FormGroup(opts);
      // }
    }
    this.fieldConfigs = fieldConfigs;
    console.log(this.fieldConfigs);
    this.form = new FormGroup(fieldCtrls);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fieldMap']) {
      this.ngOnInit();
    }
  }

  submitForm() {
    this.onSubmit.emit();
  }
}
