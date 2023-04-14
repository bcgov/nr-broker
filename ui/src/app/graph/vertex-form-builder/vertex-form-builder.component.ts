import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CollectionFieldConfigMap } from '../graph.types';

@Component({
  selector: 'app-vertex-form-builder',
  templateUrl: './vertex-form-builder.component.html',
  styleUrls: ['./vertex-form-builder.component.scss'],
})
export class VertexFormBuilderComponent implements OnInit, OnChanges {
  @Output() onSubmit = new EventEmitter();
  @Input() fields!: CollectionFieldConfigMap;
  @Input() form!: FormGroup;
  @Input() values!: FormGroup;
  parsedFields!: any[];

  ngOnInit() {
    const fieldsCtrls: any = {};
    const parsedFields: any = [];
    for (const name of Object.keys(this.fields)) {
      parsedFields.push({
        name,
        ...this.fields[name],
      });
    }
    console.log(parsedFields);

    for (const f of parsedFields) {
      if (f.type != 'checkbox') {
        fieldsCtrls[f.name] = new FormControl(
          f.value || '',
          Validators.required,
        );
      } else {
        //if checkbox, it need mulitple
        const opts: any = {};
        for (const opt of f.options) {
          opts[opt.key] = new FormControl(opt.value);
        }
        fieldsCtrls[f.name] = new FormGroup(opts);
      }
    }
    this.parsedFields = parsedFields;
    this.form = new FormGroup(fieldsCtrls);

    this.form.valueChanges.subscribe((update) => {
      console.log(update);
      //this.fields = JSON.parse(update.fields);
    });
    console.log(this.form);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fields']) {
      this.ngOnInit();
    }
  }
}
