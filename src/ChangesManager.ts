import { ChangeDetectorRef, SimpleChanges } from '@angular/core';
import {
  TCallbacksConfig,
  TPropertiesByGroup,
  TCallbacksByGroup,
  TCallbacksConfigParameter,
  TCallbackConfig,
  TChangesSummary,
  TChangeCallback,
} from './ChangesManager.types';

import { debounce, getChangesSummary } from './ChangesManager.utils';

/**
 * Changes manager
 * This class helps to manage the changes of a component in a more efficient way
 * @template TComponent - the component type
 * @example
 * // The basic configuration avoid you to have syncronization issues between the component and the properties
 * // also take care of the performance by avoiding unnecessary change detection or callbacks executions
 * // component.ts
 * import { ChangeDetectorRef, Inject, OnChanges } from '@angular/core';
 * import { ChangesManager } from 'ng-changes-manager';
 *
 * export class MyComponent implements OnChanges {
 *  changesManager: ChangesManager<MyComponent>;
 *
 *  constructor(@Inject(changeDetectorRef) changeDetectorRef: ChangeDetectorRef) {
 *    this.changesManager = new ChangesManager({
 *      component: this,
 *      changeDetectorRef,
 *    });
 *  }
 *
 *  ngOnChanges(changes: SimpleChanges) {
 *    this.changesManager.manageChanges(changes);
 *  }
 * }
 *
 * @example
 * // More Advanced configuration allows you to execute specific properties or groups of properties changes
 * // component.ts
 * import { ChangeDetectorRef, Inject, OnChanges } from '@angular/core';
 * import { ChangesManager } from 'ng-changes-manager';
 *
 * export class MyComponent implements OnChanges {
 *  changesManager: ChangesManager<MyComponent>;
 *
 *  prop1: string;
 *
 *  constructor(@Inject(changeDetectorRef) changeDetectorRef: ChangeDetectorRef) {
 *    this.changesManager = new ChangesManager({
 *      component: this,
 *      changeDetectorRef,
 *      callbacks: {
 *        prop1: this.onChangeProp1,
 *      }
 *    });
 *  }
 *
 *  onChangeProp1() {
 *    console.log('prop1 changed');
 *  }
 *
 *  ngOnChanges(changes: SimpleChanges) {
 *    this.changesManager.manageChanges(changes);
 *  }
 * }
 *
 *  * @example
 * // Example with groups of properties
 * // component.ts
 * import { ChangeDetectorRef, Inject, OnChanges } from '@angular/core';
 * import { ChangesManager } from 'ng-changes-manager';
 *
 * export class MyComponent implements OnChanges {
 *  changesManager: ChangesManager<MyComponent>;
 *
 *  name: string;
 *
 *  surname: string;
 *
 *  fullName: string;
 *
 *  constructor(@Inject(changeDetectorRef) changeDetectorRef: ChangeDetectorRef) {
 *    this.changesManager = new ChangesManager({
 *      component: this,
 *      changeDetectorRef,
 *      callbacks: [
 *        [['name', 'surname'], this.computeFullName],
 *      ]
 *    });
 *  }
 *
 *  computeFullName() {
 *    this.fullName = `${this.name} ${this.surname}`;
 *  }
 *
 *  ngOnChanges(changes: SimpleChanges) {
 *    this.changesManager.manageChanges(changes);
 *  }
 * }
 */
export class ChangesManager<TComponent extends object> {
  /**
   * Component instance to which the changes manager is attached
   */
  private component: object;

  /**
   * Delay in milliseconds to debounce the changes callbacks
   * This is useful to avoid executing the callbacks multiple times when multiple changes are chained
   * @default 0
   */
  private bedounceDelay: number;

  /**
   * Configuration of the callbacks to be executed when the component receives changes
   */
  private callbacksConfig: TCallbacksConfig<TComponent> = null;

  /**
   * List properties by group helps to know which properties are related to each callback
   */
  private propertiesByGroup: TPropertiesByGroup<TComponent> = new Map();

  /**
   * List of callbacks by group of properties
   */
  private callbacksByGroup: TCallbacksByGroup<TComponent> = new Map();

  /**
   * Reference to the change detector of the component
   * This is used to force the change detection when the callbacks are executed
   */
  private changeDetectorRef: ChangeDetectorRef;

  /**
   * Constructor of the changes manager
   * @param component - the component instance to which the changes manager is attached
   * @param changeDetectorRef - reference to the change detector of the component
   * @param bedounceDelay - delay in milliseconds to debounce the changes callbacks, this is useful to avoid executing the callbacks multiple times when multiple changes are chained default 0
   * @param callbacks - configuration of the callbacks to be executed when the component receives changes
   */
  constructor({
    component,
    changeDetectorRef,
    bedounceDelay = 0,
    callbacks: callbacksConfig,
  }: {
    component: TComponent;
    changeDetectorRef: ChangeDetectorRef;
    callbacks?: TCallbacksConfigParameter<TComponent>;
    bedounceDelay?: number;
  }) {
    this.component = component;
    this.changeDetectorRef = changeDetectorRef;
    this.bedounceDelay = bedounceDelay;

    this.setCallbacksConfig(callbacksConfig);
  }

  /**
   * Updates the callbacks configuration of the changes manager based on the configuration parameter
   */
  private setCallbacksConfig = (
    callbacksConfig: TCallbacksConfigParameter<TComponent>
  ) => {
    if (!callbacksConfig) return;

    const isArray = Array.isArray(callbacksConfig);

    this.callbacksConfig = isArray
      ? this.getCallbacksConfigFromParameter(callbacksConfig)
      : this.getCallbacksConfigFromParameterObject(callbacksConfig);

    const { callbacksByGroup, propertiesByGroup } =
      this.computeCallbackConfigDerivatives(this.callbacksConfig);

    this.propertiesByGroup = propertiesByGroup;
    this.callbacksByGroup = callbacksByGroup;
  };

  public detectChanges = () => {
    this.changeDetectorRef.detectChanges();
  };

  /**
   * The configuration parameter is not normalized, this method normalizes so both posible configurations styles are supported
   */
  private getCallbacksConfigFromParameter = (
    callbacksConfig: [
      (keyof TComponent)[],
      TCallbackConfig<TComponent> | TChangeCallback<TComponent>
    ][]
  ): TCallbacksConfig<TComponent> => {
    const sanitizedConfig = callbacksConfig.map(([keys, callbackConfig]) => {
      const isFunction = typeof callbackConfig === 'function';

      return [
        keys,
        isFunction
          ? {
              callback: callbackConfig,
              validator: null,
            }
          : callbackConfig,
      ];
    });

    return sanitizedConfig as TCallbacksConfig<TComponent>;
  };

  /**
   * the more basic configuration of the callbacks is an object with the attributes as keys and the callback as value
   * this methods normalizes the configuration to the more complex one which is an array of arrays
   */
  private getCallbacksConfigFromParameterObject = (
    callbacksConfig: TCallbacksConfigParameter<TComponent>
  ): TCallbacksConfig<TComponent> => {
    const stateProps = Object.keys(callbacksConfig ?? {});

    const callbacksSource = stateProps.reduce(
      (
        accumulator: [[keyof TComponent], TCallbackConfig<TComponent>][],
        key
      ) => {
        const config: TCallbacksConfig<TComponent> = callbacksConfig[key];
        const isFunction = typeof config === 'function';

        const callbackConfig = (
          isFunction
            ? {
                callback: config,
                validator: null,
              }
            : config
        ) as TCallbackConfig<TComponent>;

        const keys = [key];
        const changesConfig = [keys, callbackConfig] as [
          [keyof TComponent],
          TCallbackConfig<TComponent>
        ];

        return [...accumulator, changesConfig];
      },
      []
    );

    return callbacksSource;
  };

  /**
   * This method computes the propertiesByGroup and callbacksByGroup from the callbacksConfig
   * @param callbacksConfig the callbacks configuration
   * @returns the propertiesByGroup and callbacksByGroup
   * propertiesByGroup is a map where the key is the group id and the value is a set of attributes which trigger the callback
   * callbacksByGroup is a map where the key is the group id and the value is the callback to execute
   */
  private computeCallbackConfigDerivatives = (
    callbacksConfig: TCallbacksConfig<TComponent>
  ): {
    propertiesByGroup: TPropertiesByGroup<TComponent>;
    callbacksByGroup: TCallbacksByGroup<TComponent>;
  } => {
    const propertiesByGroup: TPropertiesByGroup<TComponent> = new Map();
    const callbacksByGroup: TCallbacksByGroup<TComponent> = new Map();

    callbacksConfig.forEach(([props, { callback, validator }]) => {
      // groups cannot be duplicated, so we use the sorted props as the key
      const groupId = props.sort().join('|');

      // we use a debounced callback to avoid executing the callback multiple times when multiple changes are chained
      const debouncedCallback = debounce(callback, this.bedounceDelay);

      const groupAttributesSet = new Set(props);

      propertiesByGroup.set(groupId, groupAttributesSet);

      // all callbacks are **debounced** so it doesn't matter if we call the same callback more than one
      callbacksByGroup.set(groupId, {
        callback: debouncedCallback,
        validator: validator ?? null,
      });
    });

    return {
      callbacksByGroup,
      propertiesByGroup,
    };
  };

  /**
   * This method is called when a change is detected in the component
   * returns the callbacks which should be executed based on the changes detected in the component
   * if no changes are detected, it returns an empty array
   * @param changesSummary the changes parameters
   */
  private getCallbacksWhichShouldBeExecuted = (
    changesSummary: TChangesSummary<TComponent>
  ): [string, TCallbackConfig<TComponent>][] => {
    const properties = Object.keys(changesSummary);
    const callbacksGroups = Array.from(this.callbacksByGroup);

    const callbacks = callbacksGroups.filter(([groupId, callbackConfig]) => {
      const shouldIncludeGroup = properties.some((property) => {
        const groupAttributes = this.propertiesByGroup.get(groupId);

        const attributeHasChanges = changesSummary[property].didChange;

        const attributeBelongsToGroup = groupAttributes.has(
          property as keyof TComponent
        );

        return attributeHasChanges && attributeBelongsToGroup;
      });

      return shouldIncludeGroup;
    });

    return callbacks;
  };

  /**
   * This method executes the callbacks which should be executed based on the changes detected in the component and the validators
   * If there are not validators it executes all the callbacks linked to the changed attributes
   */
  executeChangesCallbacks = (changesSummary: TChangesSummary<TComponent>) => {
    // we filter the groups to execute only the ones which have at least one attribute which changed
    const callbacks = this.getCallbacksWhichShouldBeExecuted(changesSummary);

    callbacks.forEach(([, { callback, validator }]) => {
      const shouldExecuteCallback = validator
        ? !!validator(changesSummary)
        : true;

      if (!shouldExecuteCallback) return;

      callback?.call(this.component, changesSummary);
    });

    this.detectChanges();
  };

  /**
   * This method should be called every time the component inputs change on the ngOnChanges lifecycle method
   * @param simpleChanges the simple changes object
   * @returns the changes summary
   * the changes summary is an object where the keys are the input attributes and the values are the simple changes
   * the simple changes are extended with a didChange property which indicates if the value changed or not
   */
  public manageChanges = (
    simpleChanges: SimpleChanges
  ): TChangesSummary<TComponent> => {
    const changesSummary = getChangesSummary<TComponent>(simpleChanges);

    const properties = Object.keys(simpleChanges);

    const shouldProcessChanges = properties.some((key) => {
      const simpleChange = changesSummary[key];

      return simpleChange.didChange;
    });

    // if no changes were detected we don't need to execute the callbacks
    if (!shouldProcessChanges) return changesSummary;

    this.executeChangesCallbacks(changesSummary);

    return changesSummary;
  };
}
