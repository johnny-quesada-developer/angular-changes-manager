/**
 * Changes summary per simple change
 * @template TValue - the type of the value
 * @property didChange {boolean} - true if the value changed
 * @property firstChange {boolean} - true if it's the first change
 * @property currentValue {TValue} - the current value
 * @property previousValue {TValue} - the previous value
 */
export type TChange<TValue> = {
  didChange: boolean;
  firstChange: boolean;
  currentValue: TValue;
  previousValue?: TValue;
};

/**
 * Changes summary per component
 * @template TComponent - the component type
 * @property [key in keyof TComponent] {TChange<TComponent[key]>} - the changes summary per property if the property changed
 */
export type TChangesSummary<TComponent extends object> = {
  [key in keyof TComponent]: TChange<TComponent[key]>;
};

/**
 * Callback to be executed when a change is detected
 * @template TComponent - the component type
 * @param changesSummary - the changes summary
 */
export type TChangeCallback<TComponent extends object> = (
  changesSummary: TChangesSummary<TComponent>
) => void;

/**
 * Callback to validate if the change should be executed
 * This is an optional callback that can be used to validate if the change should be restricted by some condition
 * @template TComponent - the component type
 * @param changesSummary - the total changes summary
 */
export type TChangeCallbackValidator<TComponent extends object> = (
  changesSummary: TChangesSummary<TComponent>
) => boolean;

/**
 * Callback configuration
 * @template TComponent - the component type
 * @property callback {TChangeCallback<TComponent>} - the callback to be executed when a change is detected
 * @property validator {TChangeCallbackValidator<TComponent>} - the callback to validate if the change should be executed
 */
export type TCallbackConfig<TComponent extends object> = {
  callback: TChangeCallback<TComponent>;
  validator?: TChangeCallbackValidator<TComponent>;
};

/**
 * Callbacks configuration
 * This type will contains the normalised callback configuration
 */
export type TCallbacksConfig<TComponent extends object> =
  | [(keyof TComponent)[], TCallbackConfig<TComponent>][];

/**
 * Callbacks configuration parameter
 * This type will contains the raw callback configuration
 * It can be an array of arrays or an object
 * @template TComponent - the component type
 * @example
 * {
 *  prop1: (changesSummary) => {}, // this callback will be executed only when prop1 changes
 *  prop2: { // this callback will be executed only when prop2 changes
 *    callback: (changesSummary) => {},
 *    validator: (changesSummary) => true,
 *  }
 * }
 *
 * @example
 * [
 *  [['prop1', 'prop2'], (changesSummary) => {}], // this callback will be executed when prop1 or prop2 changes
 *  [['prop3'], { // this callback will be executed only when prop3 changes
 *    callback: (changesSummary) => {},
 *  }],
 *  [['prop1'], (changesSummary) => {}], // this callback will be executed only when prop1 changes
 * ]
 *
 * // if both prop1 and prop2 changes, the callback will be executed just once
 */
export type TCallbacksConfigParameter<TComponent extends object> =
  | [
      (keyof TComponent)[],
      TCallbackConfig<TComponent> | TChangeCallback<TComponent>
    ][]
  | {
      [IProp in keyof TComponent]?:
        | TCallbackConfig<TComponent>
        | TChangeCallback<TComponent>;
    };

/**
 * Properties by group
 * This type will contains the properties per group of properties
 * The group id will be generated from the properties array
 * This agrupation allow us to identify which groups should change when a property changes
 */
export type TPropertiesByGroup<TComponent extends object> = Map<
  string,
  Set<keyof TComponent>
>;

/**
 * Callbacks by group
 * This type will contains the callbacks per group of properties
 * For simple configuration the group of properties contains only one property
 * @template TComponent - the component type
 */
export type TCallbacksByGroup<TComponent extends object> = Map<
  string,
  TCallbackConfig<TComponent>
>;
