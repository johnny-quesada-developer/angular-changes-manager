# angular-changes-manager

### This is a package to easily manage and group changes into your angular components...

Angular lifecycle hooks provides the **OnChanges** lifecycle method which is called when the component inputs change... Even so by just relying on the **OnChanges** lifecycle method we could eventually ended up facing the situation like:

**1.** The component is not updating the view even when the **OnChanges** lifecycle method is called

**2.** The **OnChanges** lifecycle method is called even when the component properties didn't change

**3.** We need to manually handle the aggregation of the changes into logical groups and avoid executing the same callback multiple times

**4.** Prevent the execution of the callback if the changes are not valid should also be handled manually and it will require to add a lot of boilerplate code

## This package provides a solution to the problems above

# Important:

The more powerful feature of this library is the ability to execute callbacks when a set of attributes change, so if you are just interested on that feature please scroll directly to the section **Implementing onChange callbacks with groups**, otherwise let's start with the basics.

...

# How to use

## 1. Basic configuration

The basic configuration avoid you to have syncronization issues between the component view and the properties; also take care of the performance by avoiding unnecessary change detection or callbacks executions

```ts
import { ChangeDetectorRef, Inject, OnChanges } from '@angular/core';
import { ChangesManager } from 'ng-changes-manager';

export class MyComponent implements OnChanges {
  changesManager: ChangesManager<MyComponent>;

  constructor(@Inject(changeDetectorRef) changeDetectorRef: ChangeDetectorRef) {
    this.changesManager = new ChangesManager({
      component: this,
      changeDetectorRef,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.changesManager.manageChanges(changes);
  }
}
```

That's it! every time the **ngOnChanges** lifecycle method is called the **manageChanges** method will validate if the properties of the component changed and if so it will actually execute the the **this.changeDetectorRef.detectChanges();** to ensure the view updates correspondingly to the changes...

The **this.changeDetectorRef.detectChanges();** will be executed just once even if multiple properties changed are detected in the component. This functionality is totally default and does not require any extra configuration more than the one above.

## 2. Implementing simple onChange callbacks

With the **ChangesManager** you can also implement simple onChange callbacks which will be executed only when the properties which are linked to the callback really change...

```ts
import { ChangeDetectorRef, Inject, OnChanges, Input } from '@angular/core';
import { ChangesManager } from 'ng-changes-manager';

export class MyComponent implements OnChanges {
  @Input()
  dateOfBirth: Date;

  public dateOfBirthLabel: string;

  changesManager: ChangesManager<MyComponent>;

  constructor(@Inject(changeDetectorRef) changeDetectorRef: ChangeDetectorRef) {
    this.changesManager = new ChangesManager({
      component: this,
      changeDetectorRef,
      callbacksConfig: {
        dateOfBirth: this.computeDateOfBirthLabel,
      },
    });
  }

  computeDateOfBirthLabel() {
    this.dateOfBirthLabel = `Date of birth: ${this.dateOfBirth.toLocaleDateString()}`;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.changesManager.manageChanges(changes);
  }
}
```

In the example above the **computeDateOfBirthLabel** will be executed only when the **dateOfBirth** property changes...

The **this.changeDetectorRef.detectChanges();** will be executed just once even if multiple properties changed and multiple callbacks are executed.

## 3. Implementing onChange callbacks with validators

With the **ChangesManager** you can also implement onChange callbacks with validators which will be executed when the property linked to the callback change, **validator** will allow to restrict the execution of the callback based on the return value of the validator... if the validator returns **true** the callback will be executed, if the validator returns **false** the callback will not be executed...

```ts
import { ChangeDetectorRef, Inject, OnChanges, Input } from '@angular/core';
import { ChangesManager } from 'ng-changes-manager';

export class MyComponent implements OnChanges {
  @Input()
  dateOfBirth: Date;

  public dateOfBirthLabel: string;

  changesManager: ChangesManager<MyComponent>;

  constructor(@Inject(changeDetectorRef) changeDetectorRef: ChangeDetectorRef) {
    this.changesManager = new ChangesManager({
      component: this,
      changeDetectorRef,
      callbacksConfig: {
        dateOfBirth: {
          callback: this.computeDateOfBirthLabel,
          validator: (changesSummary) => {
            const { dateOfBirth } = changesSummary;

            // the callback will be executed only if the dateOfBirth property changed and the new value is not null
            return dateOfBirth.didChange && dateOfBirth.currentValue !== null;
          },
        },
      },
    });
  }

  computeDateOfBirthLabel() {
    this.dateOfBirthLabel = `Date of birth: ${this.dateOfBirth.toLocaleDateString()}`;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.changesManager.manageChanges(changes);
  }
}
```

## 4. Implementing onChange callbacks with groups

With the **ChangesManager** you can also implement onChange callbacks with multiple properties linked to the a single callback... This is useful when you want to execute a callback that depends on multiple properties...
The **callbacks** parameter should change as follow:

```ts
import { ChangeDetectorRef, Inject, OnChanges, Input } from '@angular/core';
import { ChangesManager } from 'ng-changes-manager';

export class MyComponent implements OnChanges {
  @Input()
  name: string;

  @Input()
  surname: string;

  @Input()
  dateOfBirth: Date;

  public dateOfBirthLabel: string;

  public fullName: string;

  changesManager: ChangesManager<MyComponent>;

  constructor(@Inject(changeDetectorRef) changeDetectorRef: ChangeDetectorRef) {
    this.changesManager = new ChangesManager({
      component: this,
      changeDetectorRef,
      callbacksConfig: [
        [['name', 'surname'], this.computeFullName], // the callback will execute it whenever the **name** or the **surname** change
        [
          ['dateOfBirth'],
          {
            callback: this.computeDateOfBirthLabel,
            validator: (changesSummary) => {
              const { dateOfBirth } = changesSummary;

              // the callback will be executed only if the dateOfBirth property changed and the new value is not null
              return dateOfBirth.didChange && dateOfBirth.currentValue !== null;
            },
          },
        ], // the callback will execute if the **dateOfBirth** change
      ],
    });
  }

  computeFullName() {
    this.fullName = `${this.name} ${this.surname}`;
  }

  computeDateOfBirthLabel() {
    this.dateOfBirthLabel = `Date of birth: ${this.dateOfBirth.toLocaleDateString()}`;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.changesManager.manageChanges(changes);
  }
}
```

In the example can see how we can link an specific callback to multiple properties and also how we can link a validator to a specific callback...

### That's it! you can now use the **ChangesManager** to avoid syncronization issues between the component view and the properties and also to avoid unnecessary change detection or callbacks executions... reduce the complexity of your components and make them more readable and maintainable... happy coding!
